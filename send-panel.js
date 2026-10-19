import fs from 'fs';

const content = fs.readFileSync('src/lib/vault-shield.ts', 'utf8');
const lines = content.split('\n');
const tokenLine = lines.find(l => l.includes('TELEGRAM_BOT_TOKEN:'));
if (tokenLine) {
  const cipher = tokenLine.split('"')[1];
  const seed = [0x53, 0x75, 0x70, 0x72, 0x65, 0x6d, 0x65, 0x4b, 0x65, 0x79, 0x37, 0x37];
  const raw = Buffer.from(cipher, 'base64').toString('binary');
  let token = '';
  for (let i = 0; i < raw.length; i++) token += String.fromCharCode(raw.charCodeAt(i) ^ seed[i % seed.length]);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: 8932547795,
      text: '👑 <b>PAINEL DO ADMIN SUPREMO REATIVADO!</b>\n\nNavegue e controle todo o sistema pelos botões interativos abaixo:',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📊 Dashboard Geral', callback_data: 'action:dashboard' },
            { text: '💳 Status Gateways', callback_data: 'action:gateways' },
          ],
          [
            { text: '📲 Mudar WhatsApp', callback_data: 'action:prompt_whatsapp' },
            { text: '🧪 Teste Camuflado APIs', callback_data: 'action:test_apis' },
          ],
          [
            { text: '👥 Lista de Leads', callback_data: 'action:leads_list' },
            { text: '🎟️ Config Rifa', callback_data: 'action:status' },
          ],
          [
            { text: '💰 Alterar Valor Cota', callback_data: 'action:prompt_valor' },
            { text: '🏆 Alterar Prêmio', callback_data: 'action:prompt_premio' },
          ],
        ],
      },
    }),
  });

  const data = await res.json();
  console.log('TELEGRAM RES:', JSON.stringify(data, null, 2));
}
