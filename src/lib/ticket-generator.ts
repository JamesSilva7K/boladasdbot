// ============================================================================
// GERADOR E CRIPTÓGRAFO MILITAR DE CÓDIGOS DE RIFAS (6 DÍGITOS NUMÉRICOS)
// ============================================================================

import crypto from "node:crypto";

export interface GeneratedTicket {
  /** Código de 6 dígitos numéricos (ex: "048291") */
  code: string;
  /** Hash criptográfico militar HMAC-SHA256 para autenticação da autenticidade */
  hashToken: string;
  /** Timestamp de emissão */
  issuedAt: string;
}

const TICKET_HMAC_SECRET = process.env["TICKET_HMAC_SECRET"] || "BoladaPix_SuperSecureRifaSecret_2026";

/**
 * Gera um código numérico de 6 dígitos formatado com zeros à esquerda (000000 a 999999)
 * utilizando gerador pseudo-aleatório criptograficamente seguro (CSPRNG).
 */
export function generateSingleNumericCode(): string {
  // Gera 4 bytes aleatórios seguros e reduz para 0..999999
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, "0");
}

/**
 * Gera um lote de bilhetes de rifa únicos com 6 dígitos numéricos e assinatura criptografada HMAC
 */
export function generateEncryptedTickets(quantity: number, txId: string): GeneratedTicket[] {
  const count = Math.max(1, Math.min(quantity, 5000));
  const seen = new Set<string>();
  const tickets: GeneratedTicket[] = [];
  const now = new Date().toISOString();

  while (tickets.length < count) {
    const code = generateSingleNumericCode();
    if (seen.has(code)) continue;
    seen.add(code);

    const hash = crypto
      .createHmac("sha256", TICKET_HMAC_SECRET)
      .update(`${txId}:${code}:${now}`)
      .digest("hex")
      .substring(0, 16);

    tickets.push({
      code,
      hashToken: hash,
      issuedAt: now,
    });
  }

  return tickets;
}

/**
 * Formata os bilhetes em formato TXT estruturado para download do lead
 */
export function formatTicketsAsTxt(params: {
  edition: string;
  txId: string;
  payerName?: string | undefined;
  payerDocument?: string | undefined;
  drawDate?: string | undefined;
  tickets: GeneratedTicket[];
}): string {

  const lineSeparator = "=====================================================";
  const codesList = params.tickets
    .map((t, idx) => `[${String(idx + 1).padStart(3, "0")}] COTA: ${t.code}  |  CHAVE: ${t.hashToken}`)
    .join("\r\n");

  return [
    lineSeparator,
    "              BOLADA PIX — COMPROVANTE OFICIAL       ",
    lineSeparator,
    `Edição: ${params.edition}`,
    `Transação ID: ${params.txId}`,
    `Data do Sorteio: ${params.drawDate || "Pela Loteria Federal"}`,
    `Titular: ${params.payerName || "Participante Confirmado"}`,
    `CPF: ${params.payerDocument || "Identificado"}`,
    `Quantidade de Cotas: ${params.tickets.length}`,
    `Data da Emissão: ${new Date().toLocaleString("pt-BR")}`,
    lineSeparator,
    "NÚMEROS DAS SUAS COTAS (6 DÍGITOS CRIPTOGRAFADOS):",
    lineSeparator,
    codesList,
    lineSeparator,
    "Guarde este arquivo. Seus números concorrem automaticamente!",
    "Boa sorte! — Equipe Bolada Pix",
    lineSeparator,
  ].join("\r\n");
}

/**
 * Formata os números de rifa em colunas elegantes e estruturadas para o Telegram Bot,
 * dividindo em lotes seguros para nunca ultrapassar o limite de caracteres.
 */
export function formatTicketsForTelegram(tickets: GeneratedTicket[]): string[] {
  const CHUNK_SIZE = 45; // 45 bilhetes por mensagem (máx ~1500 chars)
  const chunks: string[] = [];

  for (let i = 0; i < tickets.length; i += CHUNK_SIZE) {
    const slice = tickets.slice(i, i + CHUNK_SIZE);
    const rows: string[] = [];

    // Agrupa em 3 colunas para leitura limpa e compacta
    for (let j = 0; j < slice.length; j += 3) {
      const trio = slice.slice(j, j + 3);
      const line = trio
        .map((t, idx) => {
          const globalIdx = i + j + idx + 1;
          return `<b>#${String(globalIdx).padStart(2, "0")}</b> <code>${t.code}</code>`;
        })
        .join("  │  ");
      rows.push(line);
    }

    chunks.push(rows.join("\n"));
  }

  return chunks;
}
