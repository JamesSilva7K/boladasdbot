import { handleTelegramCommand, handleCallbackQuery, InlineKeyboardMarkup } from "./src/lib/telegram-bot";

const TELEGRAM_BOT_TOKEN = process.env["TELEGRAM_BOT_TOKEN"];
const TELEGRAM_ADMIN_CHAT_ID = process.env["TELEGRAM_ADMIN_CHAT_ID"];

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ ERRO: TELEGRAM_BOT_TOKEN não foi configurado nas variáveis de ambiente!");
  console.log("👉 Adicione TELEGRAM_BOT_TOKEN e TELEGRAM_ADMIN_CHAT_ID no seu ambiente ou arquivo .env");
  process.exit(1);
}

console.log("⚡ Bot Telegram do Admin Supremo 100% Interativo por Botões iniciado com sucesso!");
console.log("📡 Conectando via Long Polling...");

let lastUpdateId = 0;

async function fetchUpdates() {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
    const res = await fetch(url);
    if (!res.ok) {
      setTimeout(fetchUpdates, 5000);
      return;
    }

    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;

        // 1. Processamento de Ações por Botões (Callback Query)
        if (update.callback_query) {
          const cb = update.callback_query;
          const chatId = String(cb.message?.chat?.id || "");
          const messageId = cb.message?.message_id;

          if (TELEGRAM_ADMIN_CHAT_ID && chatId !== String(TELEGRAM_ADMIN_CHAT_ID)) {
            await answerCallbackQuery(cb.id, "Acesso restrito ao Admin Supremo!");
            continue;
          }

          const actionData = cb.data || "";
          const result = handleCallbackQuery(actionData);

          await answerCallbackQuery(cb.id);
          if (messageId) {
            await editMessage(chatId, messageId, result.reply, result.markup);
          } else {
            await sendMessage(chatId, result.reply, result.markup);
          }
          continue;
        }

        // 2. Processamento de Mensagens Normais / Comandos
        const message = update.message || update.edited_message;
        if (!message || !message.text) continue;

        const chatId = String(message.chat.id);
        if (TELEGRAM_ADMIN_CHAT_ID && chatId !== String(TELEGRAM_ADMIN_CHAT_ID)) {
          console.warn(`[Segurança] Tentativa não autorizada: ${chatId}`);
          await sendMessage(chatId, "⛔ <i>Acesso restrito apenas ao Admin Supremo do Bolada Pix.</i>");
          continue;
        }

        const { reply, markup } = handleTelegramCommand(message.text, message.message_id);
        await sendMessage(chatId, reply, markup, message.message_id);
      }
    }
  } catch (err) {
    console.error("Erro no polling do Telegram:", err);
  }

  setTimeout(fetchUpdates, 1000);
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    // Ignore error
  }
}

async function editMessage(chatId: string, messageId: number, text: string, markup?: InlineKeyboardMarkup) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: markup,
      }),
    });
  } catch (err) {
    // Se não puder editar, envia nova mensagem limpa
    await sendMessage(chatId, text, markup);
  }
}

async function sendMessage(chatId: string, text: string, markup?: InlineKeyboardMarkup, replyToMessageId?: number) {
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (markup) {
      payload["reply_markup"] = markup;
    }
    if (replyToMessageId) {
      payload["reply_to_message_id"] = replyToMessageId;
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Erro ao enviar mensagem para chat", chatId, err);
  }
}

fetchUpdates();
