import fs from 'fs';

const content = fs.readFileSync('src/lib/vault-shield.ts', 'utf8');
const lines = content.split('\n');
const tokenLine = lines.find(l => l.includes('TELEGRAM_BOT_TOKEN:'));
if (tokenLine) {
  const cipher = tokenLine.split('"')[1];
  const seed = [0x53, 0x75, 0x70, 0x72, 0x65, 0x6d, 0x65, 0x4b, 0x65, 0x79, 0x37, 0x37];
  const raw = Buffer.from(cipher, 'base64').toString('binary');
  let token = '';
  for (let i = 0; i < raw.length; i++) {
    token += String.fromCharCode(raw.charCodeAt(i) ^ seed[i % seed.length]);
  }
  
  const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const updatesData = await updatesRes.json();
  console.log('UPDATES:', JSON.stringify(updatesData, null, 2));
}
