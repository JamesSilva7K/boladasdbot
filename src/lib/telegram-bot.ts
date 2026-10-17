import { getRifaConfig, updateRifaConfig, getRecentEvents, getMetrics, type RifaConfig } from "./rifa-store";
import { PaymentManager } from "./payment-manager";
import { getSecret } from "./vault-shield";
import { banIpPermanently, unbanIp, getBannedIpsList } from "./security-shield";

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
        { text: "👥 Lista de Leads & IPs", callback_data: "action:leads_list" },
      ],
      [
        { text: "🗺️ Vendas por Estado", callback_data: "action:estados" },
        { text: "🚫 IPs Banidos", callback_data: "action:banned_list" },
      ],
      [
        { text: "💳 Status Gateways", callback_data: "action:gateways" },
        { text: "⚡ Últimos Eventos", callback_data: "action:eventos" },
      ],
      [
        { text: "🎟️ Config da Rifa", callback_data: "action:status" },
        { text: "📲 Mudar WhatsApp", callback_data: "action:prompt_whatsapp" },
      ],
      [
        { text: "💰 Alterar Valor Cota", callback_data: "action:prompt_valor" },
        { text: "🏆 Alterar Prêmio", callback_data: "action:prompt_premio" },
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
  const text = `📈 <b>DASHBOARD DE MÉTRICAS EM TEMPO REAL</b>

💰 <b>Renda Total Gerada:</b> R$ ${m.totalRevenue.toFixed(2).replace(".", ",")}
🎟 <b>Rifas Vendidas:</b> ${m.totalRifasSold} cotas
📦 <b>Plano Mais Vendido:</b> ${m.topSellingPlan}

💳 <b>TRANSAÇÕES PIX:</b>
✅ Confirmadas: <b>${m.confirmedPayments}</b>
⏳ Pendentes: <b>${m.pendingPayments}</b>
❌ Canceladas: <b>${m.canceledPayments}</b>

👥 <b>TRÁFEGO E LEADS (100% REAIS):</b>
🚪 Entradas no Site: <b>${m.totalEntries}</b>
👋 Saídas Registradas: <b>${m.totalExits}</b>
🛒 Cliques em COMPRAR: <b>${m.buyClicks}</b>
📲 Redirecionamentos WhatsApp: <b>${m.whatsappRedirects}</b>

<i>🛡️ Sistema blindado com auto-reconhecimento e acionamento por botões.</i>`;

  return { text, markup: getBackToDashboardKeyboard() };
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
  const text = `💳 <b>SISTEMA DE GATEWAYS & FAILOVER AUTOMÁTICO</b>

🥇 <b>Gateway Principal:</b> União 7 Pay (${health.uniaoHealth})
🥈 <b>Gateway Reserva:</b> Elite PAYbr (${health.eliteHealth})
⚡ <b>Gateway Operando Agora:</b> <code>${health.activeProvider}</code>

<i>🔄 O failover monitora falhas e assume a reserva automaticamente sem travar compras.</i>`;

  return { text, markup: getBackToDashboardKeyboard() };
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
    const hora = new Date(e.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
        lastSeen: new Date(e.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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
  const banned = getBannedIpsList();
  if (banned.length === 0) {
    return {
      text: "🚫 <b>LISTA DE IPS BANIDOS PERMANENTEMENTE:</b>\n\n✅ <i>Nenhum IP está banido no momento. Todos os acessos legítimos estão liberados.</i>",
      markup: getBackToDashboardKeyboard(),
    };
  }

  const lines = banned.map((ip, idx) => `${idx + 1}. <code>${ip}</code> (Bloqueio Total)`);
  const unbanButtons: InlineKeyboardButton[][] = banned.slice(0, 6).map((ip) => [
    { text: `✅ Desbanir ${ip}`, callback_data: `action:unban:${ip}` },
  ]);

  unbanButtons.push([
    { text: "🔄 Atualizar", callback_data: "action:banned_list" },
    { text: "🔙 Menu Principal", callback_data: "action:main_menu" },
  ]);

  return {
    text: `🚫 <b>IPS COM BLOQUEIO DEFINITIVO ATIVO:</b>\n\n${lines.join("\n")}\n\n<i>💡 Para desbanir por comando, digite:</i> <code>/unban IP</code>`,
    markup: { inline_keyboard: unbanButtons },
  };
}

// Gerenciador de Ações via Callback Query (Cliques em Botões)
export function handleCallbackQuery(data: string): { reply: string; markup: InlineKeyboardMarkup } {

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

  // Padrão: Painel Principal
  return {
    reply: `👑 <b>PAINEL DO ADMIN SUPREMO — BOLADA PIX</b>\n\nSelecione uma ação nos botões interativos abaixo:`,
    markup: getAdminDashboardKeyboard(),
  };
}

// Parser inteligente e tolerante para quando o admin digita ou usa comandos
export function handleTelegramCommand(input: string, messageId?: number): { reply: string; markup?: InlineKeyboardMarkup; config?: RifaConfig } {
  const cleanInput = input.trim();
  const parts = cleanInput.split(/\s+/);
  const command = (parts[0] || "").toLowerCase();

  if (command === "/start" || command === "/menu" || command === "/painel") {
    return {
      reply: `👑 <b>PAINEL DO ADMIN SUPREMO — BOLADA PIX</b>\n\nSelecione uma ação nos botões interativos abaixo:`,
      markup: getAdminDashboardKeyboard(),
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
