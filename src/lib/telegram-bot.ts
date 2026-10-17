import { getRifaConfig, updateRifaConfig, getRecentEvents, getMetrics, type RifaConfig } from "./rifa-store";
import { PaymentManager } from "./payment-manager";

const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"] || "";
const TELEGRAM_ADMIN_CHAT_ID = process.env["TELEGRAM_ADMIN_CHAT_ID"] || "";

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
        { text: "🗺️ Vendas por Estado", callback_data: "action:estados" },
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
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.log("[Telegram Bot Simulation]");
    console.log(text);
    return false;
  }

  try {
    if (options.editLastMessage && lastBotMessageId) {
      const editUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
      const editPayload: Record<string, unknown> = {
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
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

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload: Record<string, unknown> = {
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
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

  // Por padrão, qualquer outra interação exibe o menu interativo por botões
  return {
    reply: `👑 <b>PAINEL DO ADMIN SUPREMO — BOLADA PIX</b>\n\nNavegue através dos botões interativos abaixo:`,
    markup: getAdminDashboardKeyboard(),
  };
}
