import fs from "fs";
import path from "path";
import { getRifaConfig, updateRifaConfig, getRecentEvents, getMetrics, getLeadPurchases, type RifaConfig, type LeadPurchaseRecord } from "./rifa-store";
import { PaymentManager } from "./payment-manager";
import { getSecret } from "./vault-shield";
import { banIpPermanently, unbanIp, getBannedIpsList } from "./security-shield";
import { formatBrasiliaTime } from "./date-utils";

function getTelegramToken(): string {
  return getSecret("TELEGRAM_BOT_TOKEN");
}

function getTelegramAdminChatId(): string {
  return getSecret("TELEGRAM_ADMIN_CHAT_ID");
}

let lastBotMessageId: number | null = null;

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface SendMessageOptions {
  parseMode?: "HTML" | "MarkdownV2";
  replyToMessageId?: number | null;
  editLastMessage?: boolean;
  replyMarkup?: InlineKeyboardMarkup;
}

// Teclado Interativo Principal do Painel Supremo
export function getAdminDashboardKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📊 Dashboard Geral", callback_data: "action:dashboard" },
        { text: "🎟️ Tokens por Lead", callback_data: "action:lead_tokens" },
      ],
      [
        { text: "👥 Lista de Leads & IPs", callback_data: "action:leads_list" },
        { text: "🗺️ Vendas por Estado", callback_data: "action:estados" },
      ],
      [
        { text: "💳 Status Gateways", callback_data: "action:gateways" },
        { text: "🧪 Teste Camuflado APIs", callback_data: "action:test_apis" },
      ],
      [
        { text: "⚡ Últimos Eventos", callback_data: "action:eventos" },
        { text: "🚫 IPs Banidos", callback_data: "action:banned_list" },
      ],
      [
        { text: "📲 Mudar WhatsApp", callback_data: "action:prompt_whatsapp" },
        { text: "💰 Alterar Valor Cota", callback_data: "action:prompt_valor" },
      ],
      [
        { text: "🖼️ Banner & Mídia", callback_data: "action:prompt_banner" },
        { text: "🏆 Alterar Prêmio", callback_data: "action:prompt_premio" },
      ],
      [
        { text: "🎟️ Config da Rifa", callback_data: "action:status" },
        { text: "🌐 Ver Ganhadores", callback_data: "action:view_ganhadores" },
      ],
    ],
  };
}


export function getBackToDashboardKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🔄 Atualizar Dados", callback_data: "action:dashboard" },
        { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
      ],
    ],
  };
}

export async function sendTelegramNotification(
  text: string,
  options: SendMessageOptions = { parseMode: "HTML", replyToMessageId: null, editLastMessage: false }
) {
  const token = getTelegramToken();
  const adminChatId = getTelegramAdminChatId();

  if (!token || !adminChatId) {
    console.log("[Telegram Bot Simulation]");
    console.log(text);
    return false;
  }

  try {
    if (options.editLastMessage && lastBotMessageId) {
      const editUrl = `https://api.telegram.org/bot${token}/editMessageText`;
      const editPayload: Record<string, unknown> = {
        chat_id: adminChatId,
        message_id: lastBotMessageId,
        text,
        parse_mode: options.parseMode || "HTML",
        disable_web_page_preview: true,
      };
      if (options.replyMarkup) {
        editPayload["reply_markup"] = options.replyMarkup;
      }

      const editRes = await fetch(editUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPayload),
      });
      const editData = await editRes.json();
      if (editData.ok) return true;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: Record<string, unknown> = {
      chat_id: adminChatId,
      text,
      parse_mode: options.parseMode || "HTML",
      disable_web_page_preview: true,
    };

    if (options.replyMarkup) {
      payload["reply_markup"] = options.replyMarkup;
    }

    if (options.replyToMessageId) {
      payload["reply_to_message_id"] = options.replyToMessageId;
    } else if (lastBotMessageId) {
      payload["reply_to_message_id"] = lastBotMessageId;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.ok && result.result?.message_id) {
      lastBotMessageId = result.result.message_id;
    }
    return result.ok;
  } catch (err) {
    console.error("[Telegram Bot] Erro ao enviar mensagem:", err);
    return false;
  }
}

// Renderizadores de Telas por Ação de Botão
export function renderDashboardScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const m = getMetrics();
  const cfg = getRifaConfig();
  const health = PaymentManager.getGatewayHealth();
  const conversionRate = m.totalEntries > 0 ? ((m.confirmedPayments / m.totalEntries) * 100).toFixed(1) : "0.0";
  const clickToPayRate = m.buyClicks > 0 ? ((m.confirmedPayments / m.buyClicks) * 100).toFixed(1) : "0.0";
  const ticketAvg = m.confirmedPayments > 0 ? (m.totalRevenue / m.confirmedPayments).toFixed(2).replace(".", ",") : "0,00";

  const text = `📊 <b>PAINEL GERENCIAL SUPREMO — BOLADA PIX</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 <b>FINANCEIRO & FATURAMENTO</b>
• <b>Receita Líquida Estimada:</b> R$ ${m.totalRevenue.toFixed(2).replace(".", ",")}
• <b>Cotas Pagas & Emitidas:</b> <code>${m.totalRifasSold} números</code>
• <b>Ticket Médio por Venda:</b> R$ ${ticketAvg}
• <b>Plano Mais Vendido:</b> <b>${m.topSellingPlan}</b>

💳 <b>CONVERSÃO DE COBRANÇAS PIX</b>
• ✅ <b>Pagas / Confirmadas:</b> <b>${m.confirmedPayments}</b>
• ⏳ <b>Aguardando PIX:</b> <b>${m.pendingPayments}</b>
• ❌ <b>Abandonadas / Canceladas:</b> <b>${m.canceledPayments}</b>
• 🎯 <b>Taxa de Conversão Geral:</b> <b>${conversionRate}%</b> (Entradas ➔ Venda)
• ⚡ <b>Eficiência do Checkout:</b> <b>${clickToPayRate}%</b> (Clique ➔ Pago)

👥 <b>TRÁFEGO DE LEADS (100% REAIS)</b>
• 🚪 <b>Acessos Únicos ao Site:</b> <b>${m.totalEntries}</b>
• 🛒 <b>Cliques no Botão COMPRAR:</b> <b>${m.buyClicks}</b>
• 📲 <b>Suporte / WhatsApp Clicado:</b> <b>${m.whatsappRedirects}</b>
• 👋 <b>Saídas Registradas:</b> <b>${m.totalExits}</b>

🛡️ <b>STATUS DOS GATEWAYS & SEGURANÇA</b>
• 🥇 <b>Principal:</b> ${health.primaryGateway}
• 🥈 <b>Secundário:</b> ${health.secondaryGateway}
• ⚡ <b>Operando Agora:</b> <code>${health.activeProvider}</code>
• 📱 <b>WhatsApp de Suporte:</b> +${cfg.whatsappSupportNumber}
• 🎟️ <b>Valor Cota Atual:</b> R$ ${cfg.ticketPrice.toFixed(2).replace(".", ",")} | 🏆 ${cfg.totalPrize}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>⚡ Navegue e configure qualquer item nos botões interativos abaixo:</i>`;

  return { text, markup: getAdminDashboardKeyboard() };
}

export function renderEstadosScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const m = getMetrics();
  const states = Object.entries(m.revenueByState);
  if (states.length === 0) {
    return {
      text: "🗺️ <b>MÉTRICAS POR ESTADO</b>\n\nℹ️ <i>Nenhum pagamento registrado por estado ainda.</i>",
      markup: getBackToDashboardKeyboard(),
    };
  }

  const lines = states.map(([uf, data]) => {
    return `📍 <b>${uf}</b>: ${data.count} vendas | R$ ${data.revenue.toFixed(2).replace(".", ",")}`;
  });

  return {
    text: `🗺️ <b>VENDAS E LEADS POR GEOLOCALIZAÇÃO (BRASIL):</b>\n\n${lines.join("\n")}`,
    markup: getBackToDashboardKeyboard(),
  };
}

export function renderGatewaysScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const health = PaymentManager.getGatewayHealth();
  const failoverEmoji = health.autoFailoverEnabled ? "🟢 ATIVADO" : "🔴 DESATIVADO";

  const text = `💳 <b>SISTEMA DE GATEWAYS & FAILOVER INTELIGENTE</b>

🥇 <b>Gateway Principal:</b> <b>${health.primaryGateway}</b> (${health.primaryGateway === "União 7 Pay" ? health.uniaoHealth : health.eliteHealth})
🥈 <b>Gateway Secundário:</b> <b>${health.secondaryGateway}</b> (${health.secondaryGateway === "União 7 Pay" ? health.uniaoHealth : health.eliteHealth})
🛡️ <b>Failover Automático:</b> <code>${failoverEmoji}</code>
⚡ <b>Gateway Operando Agora:</b> <code>${health.activeProvider}</code>
${health.lastTested ? `🕒 <b>Último Teste Camuflado:</b> <code>${health.lastTested}</code>\n` : ""}
<i>💡 Se o principal sofrer lentidão ou oscilação, o sistema chaveia para o secundário de forma 100% transparente, sem perder vendas nem dar erro ao lead.</i>`;

  const markup: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: health.primaryGateway === "União 7 Pay" ? "✅ União 7 (Principal)" : "🥇 Tornar União 7 Principal", callback_data: "action:set_primary_uniao" },
        { text: health.primaryGateway === "Elite PAYbr" ? "✅ Elite PAY (Principal)" : "🥇 Tornar Elite PAY Principal", callback_data: "action:set_primary_elite" },
      ],
      [
        { text: "🔄 Inverter Gateways", callback_data: "action:swap_gateways" },
        { text: health.autoFailoverEnabled ? "🛡️ Desativar Failover" : "🛡️ Ativar Failover", callback_data: "action:toggle_failover" },
      ],
      [
        { text: "🧪 Rodar Teste Camuflado Agora", callback_data: "action:test_apis" },
        { text: "🔄 Atualizar Status", callback_data: "action:gateways" },
      ],
      [
        { text: "📊 Dashboard Geral", callback_data: "action:dashboard" },
        { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
      ],
    ],
  };

  return { text, markup };
}

export async function renderTestApisScreen(): Promise<{ text: string; markup: InlineKeyboardMarkup }> {
  const report = await PaymentManager.runStealthApiHealthCheck("telegram_admin");

  const uniaoIcon = report.uniao.status === "ONLINE" ? "🟢" : report.uniao.status === "LENTO" ? "🟡" : "🔴";
  const eliteIcon = report.elite.status === "ONLINE" ? "🟢" : report.elite.status === "LENTO" ? "🟡" : "🔴";

  const text = `🧪 <b>TESTE CAMUFLADO DE APIS DE PAGAMENTO</b>
⏰ <b>Horário do Teste:</b> <code>${report.timestamp}</code> (Brasília)
🛡️ <b>Modo de Execução:</b> <i>Sondagem Sintética Camuflada (Sem poluir faturamento)</i>

🥇 <b>${report.primaryGateway} (Principal):</b>
• Status: ${report.primaryGateway === "União 7 Pay" ? uniaoIcon : eliteIcon} <b>${report.primaryGateway === "União 7 Pay" ? report.uniao.status : report.elite.status}</b> (⚡ <code>${report.primaryGateway === "União 7 Pay" ? report.uniao.latencyMs : report.elite.latencyMs}ms</code>)
• Diagnóstico: <i>${report.primaryGateway === "União 7 Pay" ? report.uniao.message : report.elite.message}</i>

🥈 <b>${report.secondaryGateway} (Secundário / Reserva):</b>
• Status: ${report.secondaryGateway === "União 7 Pay" ? uniaoIcon : eliteIcon} <b>${report.secondaryGateway === "União 7 Pay" ? report.uniao.status : report.elite.status}</b> (⚡ <code>${report.secondaryGateway === "União 7 Pay" ? report.uniao.latencyMs : report.elite.latencyMs}ms</code>)
• Diagnóstico: <i>${report.secondaryGateway === "União 7 Pay" ? report.uniao.message : report.elite.message}</i>

🛡️ <b>Failover Automático:</b> <code>${report.autoFailoverEnabled ? "ATIVADO (Blindagem Máxima)" : "DESATIVADO"}</code>
⚡ <b>Gateway Operando Agora:</b> <code>${report.activeProvider}</code>

🎯 <b>Status de Blindagem dos Leads:</b>
${report.allSystemsOperational ? "✅ <b>100% BLINDADO!</b> Os leads compram com zero atrito e PIX instantâneo." : "⚠️ <b>BLINDAGEM ACIONADA:</b> Failover automático chaveou para garantir a conversão."}

<i>${report.switchActionTaken}</i>`;

  const markup: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "⚡ Rodar Novo Teste", callback_data: "action:test_apis" },
        { text: "🔄 Inverter Gateways", callback_data: "action:swap_gateways" },
      ],
      [
        { text: "💳 Configurar Gateways", callback_data: "action:gateways" },
        { text: "📊 Dashboard Geral", callback_data: "action:dashboard" },
      ],
      [
        { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
      ],
    ],
  };

  return { text, markup };
}

export function renderRifaStatusScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const cfg = getRifaConfig();
  const text = `📊 <b>CONFIGURAÇÃO ATUAL DA RIFA</b>

🎟 <b>Edição:</b> ${cfg.edition}
💰 <b>Valor da Cota:</b> R$ ${cfg.ticketPrice.toFixed(2).replace(".", ",")}
🏆 <b>Prêmio Total:</b> ${cfg.totalPrize}
📅 <b>Data do Sorteio:</b> ${cfg.drawDate} às ${cfg.drawTime}
🎰 <b>Extração:</b> ${cfg.lotteryMethod}
📞 <b>WhatsApp Suporte:</b> +${cfg.whatsappSupportNumber}`;

  return { text, markup: getBackToDashboardKeyboard() };
}

export function renderEventosScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const events = getRecentEvents(8);
  if (events.length === 0) {
    return {
      text: "ℹ️ <i>Nenhum evento registrado ainda.</i>",
      markup: getBackToDashboardKeyboard(),
    };
  }

  const lines = events.map((e) => {
    const hora = formatBrasiliaTime(new Date(e.timestamp));
    let icon = "⚡";
    let desc = e.type as string;
    const dataObj = e.data || {};
    const cpfDisplay = typeof dataObj["cpf"] === "string" ? dataObj["cpf"] : (typeof dataObj["cpfLimpo"] === "string" ? dataObj["cpfLimpo"] : "");

    if (e.type === "click_comprar") { icon = "🛒"; desc = "Clicou em 'COMPRAR'"; }
    if (e.type === "modal_opened") { icon = "📋"; desc = "Abriu o modal de dados"; }
    if (e.type === "cpf_validado") { icon = "✅"; desc = `CPF: ${cpfDisplay}`; }
    if (e.type === "cpf_invalido") { icon = "❌"; desc = `CPF Inválido: ${dataObj["cpfDigitado"] || ""}`; }
    if (e.type === "tentativa_consulta") { icon = "🔍"; desc = "Consulta com Captcha"; }
    if (e.type === "entrada") { icon = "🚪"; desc = `Entrada (${e.city || "SP"} - ${e.device || "Mobile"})`; }
    if (e.type === "saida") { icon = "👋"; desc = "Saída da página"; }
    if (e.type === "clique_whatsapp") { icon = "📲"; desc = "Foi para o WhatsApp"; }
    if (e.type === "pagamento_confirmado") { icon = "🎉"; desc = "PAGAMENTO PIX CONFIRMADO!"; }

    return `[${hora}] ${icon} <b>${desc}</b>`;
  });

  return {
    text: `🕒 <b>ÚLTIMOS EVENTOS REGISTRADOS:</b>\n\n${lines.join("\n")}`,
    markup: getBackToDashboardKeyboard(),
  };
}

export function renderLeadsListScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const events = getRecentEvents(25);
  const leadIpsMap = new Map<string, { ip: string; city: string; state: string; device: string; lastSeen: string; cpf?: string | undefined }>();

  for (const e of events) {
    if (e.ip && !leadIpsMap.has(e.ip)) {
      const dataObj = e.data || {};
      const cpfDisplay = typeof dataObj["cpf"] === "string" ? dataObj["cpf"] : (typeof dataObj["cpfLimpo"] === "string" ? dataObj["cpfLimpo"] : undefined);
      leadIpsMap.set(e.ip, {
        ip: e.ip,
        city: e.city || "Brasil",
        state: e.state || "BR",
        device: e.device || "Mobile",
        lastSeen: formatBrasiliaTime(new Date(e.timestamp), { hour: "2-digit", minute: "2-digit" }),
        cpf: cpfDisplay,
      });
    }
  }

  const leads = Array.from(leadIpsMap.values()).slice(0, 8);
  if (leads.length === 0) {
    return {
      text: "👥 <b>LISTA DE LEADS & IPS RECENTES:</b>\n\nℹ️ <i>Nenhum lead com IP registrado recentemente.</i>",
      markup: getBackToDashboardKeyboard(),
    };
  }

  const lines = leads.map((l, idx) => {
    const cpfStr = l.cpf ? ` | CPF: <code>${l.cpf}</code>` : "";
    return `<b>${idx + 1}. IP:</b> <code>${l.ip}</code>\n📍 ${l.city} - ${l.state} | 📱 ${l.device} | 🕒 ${l.lastSeen}${cpfStr}\n`;
  });

  // Botões rápidos de banir cada um dos IPs listados
  const banButtons: InlineKeyboardButton[][] = leads.slice(0, 4).map((l) => [
    { text: `🚫 Banir IP ${l.ip}`, callback_data: `action:ban:${l.ip}` },
  ]);

  banButtons.push([
    { text: "🔄 Atualizar Lista", callback_data: "action:leads_list" },
    { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
  ]);

  return {
    text: `👥 <b>LEADS RECENTES QUE ACESSARAM O SISTEMA:</b>\n\n${lines.join("\n")}\n<i>💡 Para banir um IP manualmente, digite:</i> <code>/ban 123.456.78.90</code>`,
    markup: { inline_keyboard: banButtons },
  };
}

export function renderBannedListScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const bannedIps = getBannedIpsList();
  if (bannedIps.length === 0) {
    return {
      text: "🚫 <b>LISTA DE IPS BANIDOS PERMANENTEMENTE:</b>\n\nℹ️ <i>Nenhum IP banido no momento. Todos os acessos legítimos estão liberados.</i>",
      markup: getBackToDashboardKeyboard(),
    };
  }

  const lines = bannedIps.map((ip, idx) => `<b>${idx + 1}. IP:</b> <code>${ip}</code>`);
  const unbanButtons: InlineKeyboardButton[][] = bannedIps.slice(0, 5).map((ip) => [
    { text: `✅ Desbanir ${ip}`, callback_data: `action:unban:${ip}` },
  ]);

  unbanButtons.push([
    { text: "🔄 Atualizar Lista", callback_data: "action:banned_list" },
    { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
  ]);

  return {
    text: `🚫 <b>IPS BLOQUEADOS NO FIREWALL MILITAR (${bannedIps.length} no total):</b>\n\n${lines.join("\n")}\n\n<i>💡 Use /unban [IP] para desbanir manualmente.</i>`,
    markup: { inline_keyboard: unbanButtons },
  };
}

export function renderLeadTokensScreen(): { text: string; markup: InlineKeyboardMarkup } {
  const purchases = getLeadPurchases(10);
  if (purchases.length === 0) {
    return {
      text: `🎟️ <b>TOKENS & BILHETES COMPRADOS POR LEAD</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nℹ️ <i>Nenhuma compra com emissão de bilhetes registrada ainda.</i>\n\nAssim que os leads concluírem o PIX, todos os números (cotas de 6 dígitos), recibo criptográfico e dados do comprador aparecerão organizados aqui.`,
      markup: getBackToDashboardKeyboard(),
    };
  }

  const sections = purchases.map((p, idx) => {
    const hora = formatBrasiliaTime(new Date(p.createdAt));
    const tokenList = p.tickets && p.tickets.length > 0
      ? p.tickets.slice(0, 15).map((t) => `<code>${t}</code>`).join(", ") + (p.tickets.length > 15 ? ` <i>(+${p.tickets.length - 15} mais)</i>` : "")
      : "<i>Aguardando sincronização de bilhetes</i>";

    return `<b>#${idx + 1} — ${p.leadName.toUpperCase()}</b>\n` +
      `👤 <b>CPF:</b> <code>${p.cpf}</code> | 📍 <b>Local:</b> ${p.city} - ${p.state}\n` +
      `💰 <b>Valor:</b> R$ ${p.amount.toFixed(2).replace(".", ",")} | 🏦 <b>Via:</b> ${p.provider}\n` +
      `🎟️ <b>Qtd de Cotas:</b> <b>${p.ticketCount} números</b>\n` +
      `🔢 <b>Números Emitidos:</b>\n${tokenList}\n` +
      `🔐 <b>Recibo Criptográfico:</b> <code>${p.proofToken}</code>\n` +
      `🕒 <b>Horário:</b> <code>${hora}</code>\n` +
      `🆔 <b>TxID:</b> <code>${p.txId.slice(0, 20)}...</code>\n`;
  });

  return {
    text: `🎟️ <b>TOKENS & BILHETES COMPRADOS POR LEAD (ÚLTIMAS VENDAS)</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${sections.join("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")}`,
    markup: {
      inline_keyboard: [
        [
          { text: "🔄 Atualizar Tokens", callback_data: "action:lead_tokens" },
          { text: "📊 Dashboard Geral", callback_data: "action:dashboard" },
        ],
        [
          { text: "👥 Lista de Leads & IPs", callback_data: "action:leads_list" },
          { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
        ],
      ],
    },
  };
}

// Gerenciador de Ações via Callback Query (Cliques em Botões)
export async function handleCallbackQuery(data: string): Promise<{ reply: string; markup: InlineKeyboardMarkup }> {

  if (data === "action:dashboard") {
    const s = renderDashboardScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:estados") {
    const s = renderEstadosScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:gateways") {
    const s = renderGatewaysScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:set_primary_uniao") {
    PaymentManager.setPrimaryGateway("União 7 Pay");
    const s = renderGatewaysScreen();
    return {
      reply: `✅ <b>UNIÃO 7 PAY DEFINIDO COMO GATEWAY PRINCIPAL!</b>\n\n🥇 <b>Principal:</b> União 7 Pay\n🥈 <b>Secundário:</b> Elite PAYbr\n\n${s.text}`,
      markup: s.markup,
    };
  }
  if (data === "action:set_primary_elite") {
    PaymentManager.setPrimaryGateway("Elite PAYbr");
    const s = renderGatewaysScreen();
    return {
      reply: `✅ <b>ELITE PAYBR DEFINIDO COMO GATEWAY PRINCIPAL!</b>\n\n🥇 <b>Principal:</b> Elite PAYbr\n🥈 <b>Secundário:</b> União 7 Pay\n\n${s.text}`,
      markup: s.markup,
    };
  }
  if (data === "action:swap_gateways") {
    const swapped = PaymentManager.swapGateways();
    const s = renderGatewaysScreen();
    return {
      reply: `🔄 <b>GATEWAYS INVERTIDOS COM SUCESSO!</b>\n\n🥇 <b>Novo Principal:</b> ${swapped.primary}\n🥈 <b>Novo Secundário:</b> ${swapped.secondary}\n\n${s.text}`,
      markup: s.markup,
    };
  }
  if (data === "action:toggle_failover") {
    const isEnabled = PaymentManager.toggleAutoFailover();
    const s = renderGatewaysScreen();
    return {
      reply: isEnabled
        ? `🛡️ <b>FAILOVER AUTOMÁTICO ATIVADO!</b>\n\nSe o gateway principal oscilar, o sistema assumirá o secundário em milissegundos sem interromper compras.\n\n${s.text}`
        : `⚠️ <b>FAILOVER AUTOMÁTICO DESATIVADO!</b>\n\nO sistema operará estritamente no gateway principal configurado.\n\n${s.text}`,
      markup: s.markup,
    };
  }
  if (data === "action:lead_tokens") {
    const s = renderLeadTokensScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:test_apis") {
    const s = await renderTestApisScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:status") {
    const s = renderRifaStatusScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:eventos") {
    const s = renderEventosScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:leads_list") {
    const s = renderLeadsListScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data === "action:banned_list") {
    const s = renderBannedListScreen();
    return { reply: s.text, markup: s.markup };
  }
  if (data.startsWith("action:ban:")) {
    const ipToBan = data.replace("action:ban:", "").trim();
    banIpPermanently(ipToBan);
    return {
      reply: `🚫 <b>IP BLOQUEADO DEFINITIVAMENTE!</b>\n\nO IP <code>${ipToBan}</code> foi banido de forma permanente pelo Admin Supremo. Todas as futuras conexões serão descartadas.`,
      markup: getBackToDashboardKeyboard(),
    };
  }
  if (data.startsWith("action:unban:")) {
    const ipToUnban = data.replace("action:unban:", "").trim();
    unbanIp(ipToUnban);
    return {
      reply: `✅ <b>IP DESBANIDO COM SUCESSO!</b>\n\nO IP <code>${ipToUnban}</code> teve o bloqueio removido e pode voltar a acessar o sistema.`,
      markup: getBackToDashboardKeyboard(),
    };
  }
  if (data === "action:prompt_whatsapp") {
    return {
      reply: `📲 <b>ALTERAR NÚMERO DE WHATSAPP</b>\n\nPara alterar o WhatsApp de atendimento dos leads, envie o comando com o número:\n\nExemplo: <code>/setwhatsapp 5511999998888</code>`,
      markup: getBackToDashboardKeyboard(),
    };
  }
  if (data === "action:prompt_valor") {
    return {
      reply: `💰 <b>ALTERAR VALOR DA COTA</b>\n\nEnvie o comando informando o novo valor:\n\nExemplo: <code>/setvalor 0,79</code> ou <code>/setvalor 1.50</code>`,
      markup: getBackToDashboardKeyboard(),
    };
  }
  if (data === "action:prompt_premio") {
    return {
      reply: `🏆 <b>ALTERAR DESCRIÇÃO DO PRÊMIO</b>\n\nEnvie o comando informando o novo prêmio:\n\nExemplo: <code>/setpremio R$ 500.000</code>`,
      markup: getBackToDashboardKeyboard(),
    };
  }
  if (data === "action:prompt_banner") {
    const cfg = getRifaConfig();
    return {
      reply: `🖼️ <b>ALTERAR BANNER PRINCIPAL DO SITE</b>\n\n` +
        `📸 <b>Como alterar da sua máquina de forma inteligente:</b>\n` +
        `1. Anexe a imagem aqui no chat diretamente do seu celular ou PC;\n` +
        `2. Na legenda (caption) da foto, digite <code>/banner</code>;\n` +
        `3. O bot fará o download e atualizará instantaneamente no site.\n\n` +
        `🔗 <b>Ou envie via link direto:</b>\n` +
        `<code>/setbanner https://seusite.com/imagem.webp</code>\n\n` +
        `🖼️ <b>Banner Atual:</b> ${cfg.customBannerUrl || "Padrão Oficial (assets/banner.webp)"}`,
      markup: getBackToDashboardKeyboard(),
    };
  }
  if (data === "action:view_ganhadores") {
    return {
      reply: `🌐 <b>TELA OFICIAL DE RESULTADOS E GANHADORES</b>\n\n` +
        `As telas de Ganhadores (Edição 64) e Cotas Premiadas estão ativas nas seguintes URLs:\n\n` +
        `• <b>Rota de Ganhadores:</b> <code>/ganhadores</code>\n` +
        `• <b>Pesquisa por Bilhete:</b> Integrada com filtro ao vivo\n` +
        `• <b>Header e Footer Oficiais:</b> Em azul royal conforme especificado\n\n` +
        `<i>Os leads que clicam em "Ganhadores", "Edições Anteriores" ou "Minhas compras" acessam essa tela com segurança.</i>`,
      markup: getBackToDashboardKeyboard(),
    };
  }

  // Padrão: Painel Principal
  return {
    reply: `👑 <b>PAINEL DO ADMIN SUPREMO — BOLADA PIX</b>\n\nSelecione uma ação nos botões interativos abaixo:`,
    markup: getAdminDashboardKeyboard(),
  };
}

// Parser inteligente e tolerante para quando o admin digita ou usa comandos
export async function handleTelegramCommand(input: string, messageId?: number): Promise<{ reply: string; markup?: InlineKeyboardMarkup; config?: RifaConfig }> {
  const cleanInput = input.trim();
  const parts = cleanInput.split(/\s+/);
  const command = (parts[0] || "").toLowerCase();

  if (command === "/start" || command === "/menu" || command === "/painel") {
    return {
      reply: `👑 <b>PAINEL DO ADMIN SUPREMO — BOLADA PIX</b>\n\nSelecione uma ação nos botões interativos abaixo:`,
      markup: getAdminDashboardKeyboard(),
    };
  }

  if (command === "/gateways" || command === "/gateway") {
    const s = renderGatewaysScreen();
    return {
      reply: s.text,
      markup: s.markup,
    };
  }

  if (command === "/setprimary") {
    const choice = (parts[1] || "").toLowerCase();
    if (choice.includes("uniao") || choice.includes("união") || choice === "1") {
      PaymentManager.setPrimaryGateway("União 7 Pay");
      const s = renderGatewaysScreen();
      return {
        reply: `✅ <b>UNIÃO 7 PAY DEFINIDO COMO GATEWAY PRINCIPAL!</b>\n\n${s.text}`,
        markup: s.markup,
      };
    } else if (choice.includes("elite") || choice === "2") {
      PaymentManager.setPrimaryGateway("Elite PAYbr");
      const s = renderGatewaysScreen();
      return {
        reply: `✅ <b>ELITE PAYBR DEFINIDO COMO GATEWAY PRINCIPAL!</b>\n\n${s.text}`,
        markup: s.markup,
      };
    } else {
      return {
        reply: `❌ <b>Uso do comando:</b>\n• <code>/setprimary uniao</code> (Para União 7 Pay)\n• <code>/setprimary elite</code> (Para Elite PAYbr)\n• Ou use <code>/swapgateways</code> para inverter.`,
        markup: getBackToDashboardKeyboard(),
      };
    }
  }

  if (command === "/swapgateways" || command === "/inverter") {
    const swapped = PaymentManager.swapGateways();
    const s = renderGatewaysScreen();
    return {
      reply: `🔄 <b>GATEWAYS INVERTIDOS!</b>\n🥇 <b>Novo Principal:</b> ${swapped.primary}\n🥈 <b>Novo Secundário:</b> ${swapped.secondary}\n\n${s.text}`,
      markup: s.markup,
    };
  }

  if (command === "/failover") {
    const arg = (parts[1] || "").toLowerCase();
    if (arg === "on" || arg === "ativar" || arg === "1") {
      updateRifaConfig({ autoFailoverEnabled: true });
    } else if (arg === "off" || arg === "desativar" || arg === "0") {
      updateRifaConfig({ autoFailoverEnabled: false });
    } else {
      PaymentManager.toggleAutoFailover();
    }
    const s = renderGatewaysScreen();
    return {
      reply: `🛡️ <b>CONFIGURAÇÃO DE FAILOVER ATUALIZADA!</b>\n\n${s.text}`,
      markup: s.markup,
    };
  }

  if (command === "/tokens" || command === "/bilhetes" || command === "/cotas") {
    const s = renderLeadTokensScreen();
    return {
      reply: s.text,
      markup: s.markup,
    };
  }

  if (command === "/testapis" || command === "/teste" || command === "/health" || command === "/provas") {
    const s = await renderTestApisScreen();
    return {
      reply: s.text,
      markup: s.markup,
    };
  }

  if (command === "/setwhatsapp") {
    const rawNumber = parts.slice(1).join("").replace(/\D/g, "");
    if (!rawNumber || rawNumber.length < 10 || rawNumber.length > 14) {
      return {
        reply: `❌ <b>Número de WhatsApp inválido!</b>\nDigite no padrão brasileiro com DDD e código do país.\nExemplo: <code>/setwhatsapp 5511988887777</code>`,
        markup: getBackToDashboardKeyboard(),
      };
    }
    const updated = updateRifaConfig({ whatsappSupportNumber: rawNumber });
    return {
      reply: `✅ <b>WhatsApp de suporte atualizado com sucesso!</b>\n📱 Novo número ativo: <b>+${rawNumber}</b>`,
      markup: getBackToDashboardKeyboard(),
      config: updated,
    };
  }

  if (command === "/setvalor") {
    const rawVal = parts[1];
    if (!rawVal) {
      return {
        reply: "❌ <b>Formato inválido!</b> Use: <code>/setvalor 0.69</code> ou <code>/setvalor 1,50</code>",
        markup: getBackToDashboardKeyboard(),
      };
    }
    const sanitized = rawVal.replace(",", ".").replace(/[^\d.]/g, "");
    const num = parseFloat(sanitized);
    if (isNaN(num) || num <= 0) {
      return {
        reply: "❌ <b>Valor incorreto!</b> Forneça um número real positivo.",
        markup: getBackToDashboardKeyboard(),
      };
    }
    const updated = updateRifaConfig({ ticketPrice: num });
    return {
      reply: `✅ <b>Sucesso!</b> Valor da cota atualizado para <b>R$ ${num.toFixed(2).replace(".", ",")}</b> em todo o sistema.`,
      markup: getBackToDashboardKeyboard(),
      config: updated,
    };
  }

  if (command === "/setpremio") {
    const premio = parts.slice(1).join(" ").trim();
    if (!premio) {
      return {
        reply: "❌ <b>Texto vazio!</b> Use: <code>/setpremio R$ 350.000</code>",
        markup: getBackToDashboardKeyboard(),
      };
    }
    const updated = updateRifaConfig({ totalPrize: premio });
    return {
      reply: `✅ <b>Prêmio atualizado com sucesso!</b>\nNovo prêmio: <b>${premio}</b>`,
      markup: getBackToDashboardKeyboard(),
      config: updated,
    };
  }

  if (command === "/setedicao" || command === "/edicao") {
    const edicao = parts.slice(1).join(" ").trim();
    if (!edicao) {
      return {
        reply: "❌ <b>Texto vazio!</b> Use: <code>/setedicao Edição 64</code>",
        markup: getBackToDashboardKeyboard(),
      };
    }
    const updated = updateRifaConfig({ edition: edicao });
    return {
      reply: `✅ <b>Edição da rifa atualizada!</b>\nNova edição ativa: <b>${edicao}</b>`,
      markup: getBackToDashboardKeyboard(),
      config: updated,
    };
  }

  if (command === "/setbanner" || command === "/banner") {
    const url = parts[1]?.trim();
    if (!url || !url.startsWith("http")) {
      return {
        reply: "❌ <b>URL inválida!</b> Use: <code>/setbanner https://seusite.com/imagem.webp</code> ou anexe a imagem diretamente no Telegram com a legenda <code>/banner</code>.",
        markup: getBackToDashboardKeyboard(),
      };
    }
    const updated = updateRifaConfig({ customBannerUrl: url });
    return {
      reply: `✅ <b>Banner atualizado com sucesso!</b>\n🖼️ <b>Nova URL:</b> <code>${url}</code>`,
      markup: getBackToDashboardKeyboard(),
      config: updated,
    };
  }

  if (command === "/leads") {
    const s = renderLeadsListScreen();
    return {
      reply: s.text,
      markup: s.markup,
    };
  }

  if (command === "/banidos") {
    const s = renderBannedListScreen();
    return {
      reply: s.text,
      markup: s.markup,
    };
  }

  if (command === "/ban") {
    const targetIp = (parts[1] || "").trim();
    if (!targetIp || targetIp.length < 7) {
      return {
        reply: "❌ <b>Uso correto:</b> <code>/ban 123.456.78.90</code>",
        markup: getBackToDashboardKeyboard(),
      };
    }
    banIpPermanently(targetIp);
    return {
      reply: `🚫 <b>IP BANIDO PERMANENTEMENTE COM SUCESSO!</b>\n\nO IP <code>${targetIp}</code> foi incluído na lista negra definitiva. Todo tráfego proveniente dele será descartado pelo firewall militar.`,
      markup: getBackToDashboardKeyboard(),
    };
  }

  if (command === "/unban") {
    const targetIp = (parts[1] || "").trim();
    if (!targetIp) {
      return {
        reply: "❌ <b>Uso correto:</b> <code>/unban 123.456.78.90</code>",
        markup: getBackToDashboardKeyboard(),
      };
    }
    unbanIp(targetIp);
    return {
      reply: `✅ <b>IP DESBANIDO COM SUCESSO!</b>\n\nO IP <code>${targetIp}</code> foi removido da lista de bloqueio e seu acesso foi restaurado.`,
      markup: getBackToDashboardKeyboard(),
    };
  }

  // Por padrão, qualquer outra interação exibe o menu interativo por botões
  return {
    reply: `👑 <b>PAINEL DO ADMIN SUPREMO — BOLADA PIX</b>\n\nNavegue através dos botões interativos abaixo:`,
    markup: getAdminDashboardKeyboard(),
  };
}

// ============================================================================
// DAEMON DE POLLING TELEGRAM (GARANTE RESPOSTA IMEDIATA A /START, /MENU E BOTÕES)
// ============================================================================
let isPollingStarted = false;
let lastUpdateOffset = 0;

export function startTelegramPollingDaemon() {
  if (isPollingStarted) return;
  const token = getTelegramToken();
  if (!token) return;

  isPollingStarted = true;
  console.log("[Telegram Bot] Polling inteligente iniciado com sucesso.");

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateOffset}&timeout=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id + 1);

          // Trata cliques em botões inline (Callback Query)
          if (update.callback_query) {
            const cb = update.callback_query;
            const chatId = cb.message?.chat?.id;
            const messageId = cb.message?.message_id;
            const { reply, markup } = await handleCallbackQuery(cb.data || "");

            // Responde o clique imediatamente
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ callback_query_id: cb.id }),
            }).catch(() => {});

            // Edita a mensagem com o novo menu
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
              }).catch(() => {});
            }
          }

          // Trata mensagens e mídias
          const msg = update.message || update.edited_message;

          // Trata fotos enviadas pelo admin com ou sem legenda (/banner)
          if (msg && msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
            const chatId = msg.chat?.id;
            const caption = (msg.caption || "").trim().toLowerCase();
            const largestPhoto = msg.photo[msg.photo.length - 1];
            const fileId = largestPhoto?.file_id;

            if (fileId && chatId) {
              try {
                // Obtém caminho do arquivo no Telegram
                const fileInfoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
                const fileInfo = await fileInfoRes.json();
                if (fileInfo.ok && fileInfo.result?.file_path) {
                  const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.result.file_path}`;
                  const imageRes = await fetch(downloadUrl);
                  const arrayBuffer = await imageRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);

                  // Salva estruturadamente na pasta pública
                  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
                  if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                  }
                  const filename = `banner_admin_${Date.now()}.webp`;
                  const filePath = path.join(uploadsDir, filename);
                  fs.writeFileSync(filePath, buffer);

                  const localUrl = `/uploads/${filename}`;
                  updateRifaConfig({ customBannerUrl: localUrl });

                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: chatId,
                      text: `🎉 <b>IMAGEM RECEBIDA E APLICADA COM SUCESSO!</b>\n\n` +
                        `🖼️ <b>Novo Banner do Site:</b> <code>${localUrl}</code>\n` +
                        `📁 Salvo estruturadamente no servidor em <code>public/uploads/</code>\n\n` +
                        `<i>A imagem anexada da sua máquina já está ao vivo para todos os leads!</i>`,
                      parse_mode: "HTML",
                      reply_to_message_id: msg.message_id,
                      reply_markup: getBackToDashboardKeyboard(),
                    }),
                  }).catch(() => {});
                }
              } catch (uploadErr) {
                console.error("[Telegram Bot] Erro ao processar upload de imagem:", uploadErr);
              }
            }
          }

          // Trata mensagens e comandos digitados (/start, /menu, etc.)
          if (msg && msg.text) {
            const chatId = msg.chat?.id;
            const { reply, markup } = await handleTelegramCommand(msg.text, msg.message_id);

            if (chatId) {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: reply,
                  parse_mode: "HTML",
                  reply_to_message_id: msg.message_id,
                  reply_markup: markup,
                  disable_web_page_preview: true,
                }),
              }).catch(() => {});
            }
          }
        }
      }
    } catch {
      // Ignora erro transitório de conexão e retenta após intervalo
    } finally {
      setTimeout(poll, 1000);
    }
  };

  poll();
}

