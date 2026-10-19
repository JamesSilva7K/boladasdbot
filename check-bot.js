import fs from 'fs';

const content = fs.readFileSync('src/lib/vault-shield.ts', 'utf8');
const lines = content.split('\n');
const tokenLine = lines.find(l => l.includes('TELEGRAM_BOT_TOKEN:'));
console.log('token line found');
if (tokenLine) {
  const cipher = tokenLine.split('"')[1];
  const seed = [0x53, 0x75, 0x70, 0x72, 0x65, 0x6d, 0x65, 0x4b, 0x65, 0x79, 0x37, 0x37];
  const raw = Buffer.from(cipher, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    result += String.fromCharCode(raw.charCodeAt(i) ^ seed[i % seed.length]);
  }
  console.log('TOKEN:', result.slice(0, 10) + '...' + result.slice(-5));
  
  const webhookRes = await fetch(`https://api.telegram.org/bot${result}/getWebhookInfo`);
  const webhookData = await webhookRes.json();
  console.log('WEBHOOK INFO:', JSON.stringify(webhookData, null, 2));

  const meRes = await fetch(`https://api.telegram.org/bot${result}/getMe`);
  const meData = await meRes.json();
  console.log('BOT INFO:', JSON.stringify(meData, null, 2));
}
