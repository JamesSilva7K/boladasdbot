import crypto from "crypto";
import { getSecret } from "./vault-shield";

// ============================================================================
// CRIPTOGRAFIA MILITAR DE COMPRAS (AES-256-GCM + ENVELOPE HMAC-SHA256)
// Garante confidencialidade total dos dados de compras, cotas e dados de leads.
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Obtém a chave de criptografia de 256 bits derivada do segredo do vault
 */
function deriveMasterKey(salt: Buffer): Buffer {
  const secret = getSecret("VAULT_CRYPTO_KEY") || "bolada-pix-ultra-secure-military-vault-secret-key-2026-xyz";
  return crypto.pbkdf2Sync(secret, salt, 100_000, 32, "sha256");
}

export interface EncryptedPurchaseEnvelope {
  version: "v1";
  iv: string;         // Base64
  salt: string;       // Base64
  tag: string;        // Base64
  ciphertext: string; // Base64
  signature: string;  // HMAC-SHA256
  createdAt: string;  // ISO timestamp
}

/**
 * Criptografa os dados completos de uma compra com AES-256-GCM
 */
export function encryptPurchaseData(payload: Record<string, unknown>): EncryptedPurchaseEnvelope {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveMasterKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const plaintext = JSON.stringify(payload);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const tag = cipher.getAuthTag();

  // Assinatura digital HMAC para integridade absoluta contra adulteração
  const hmacKey = getSecret("VAULT_HMAC_SECRET") || "bolada-hmac-integrity-key-supreme";
  const signature = crypto
    .createHmac("sha256", hmacKey)
    .update(`${salt.toString("base64")}:${iv.toString("base64")}:${encrypted}:${tag.toString("base64")}`)
    .digest("hex");

  return {
    version: "v1",
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted,
    signature,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Descriptografa com segurança o envelope de compra
 */
export function decryptPurchaseData(envelope: EncryptedPurchaseEnvelope): Record<string, unknown> | null {
  try {
    const { iv, salt, tag, ciphertext, signature } = envelope;

    // 1. Validação de integridade HMAC
    const hmacKey = getSecret("VAULT_HMAC_SECRET") || "bolada-hmac-integrity-key-supreme";
    const expectedSig = crypto
      .createHmac("sha256", hmacKey)
      .update(`${salt}:${iv}:${ciphertext}:${tag}`)
      .digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex")) === false) {
      console.error("[PurchaseCipher]: Assinatura de integridade inválida! Possível adulteração.");
      return null;
    }

    // 2. Descriptografia AES-GCM
    const saltBuf = Buffer.from(salt, "base64");
    const ivBuf = Buffer.from(iv, "base64");
    const tagBuf = Buffer.from(tag, "base64");
    const key = deriveMasterKey(saltBuf);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tagBuf);

    let decrypted = decipher.update(ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch (err) {
    console.error("[PurchaseCipher] Falha ao descriptografar compra:", err);
    return null;
  }
}

/**
 * Gera um token de recibo criptográfico irreversível para o Lead comprovar titularidade
 */
export function generatePurchaseProofToken(txId: string, cpfDigits: string, ticketCount: number): string {
  const secret = getSecret("VAULT_CRYPTO_KEY") || "bolada-receipt-proof-salt-2026";
  return crypto
    .createHmac("sha256", secret)
    .update(`${txId}|${cpfDigits}|${ticketCount}`)
    .digest("hex")
    .substring(0, 32)
    .toUpperCase();
}
