// ============================================================================
// CRIPTOGRAFIA DE ROTAS, TOKENS E COORDENAÇÃO DE SEGURANÇA PONTA A PONTA
// ============================================================================

const ROUTE_SECRET = [0x42, 0x6f, 0x6c, 0x61, 0x64, 0x61, 0x50, 0x69, 0x78, 0x32, 0x30, 0x32, 0x36];

/**
 * Criptografa caminhos e parâmetros de rotas usando XOR com chave rotativa e Base64 URL-safe.
 */
export function encryptRouteParam(plain: string): string {
  try {
    let result = "";
    for (let i = 0; i < plain.length; i++) {
      const code = plain.charCodeAt(i) ^ (ROUTE_SECRET[i % ROUTE_SECRET.length] as number);
      result += String.fromCharCode(code);
    }
    const b64 = typeof window !== "undefined"
      ? btoa(result)
      : Buffer.from(result, "binary").toString("base64");
    return encodeURIComponent(b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
  } catch {
    return plain;
  }
}

/**
 * Descriptografa parâmetros de rotas ponta a ponta.
 */
export function decryptRouteParam(cipher: string): string {
  try {
    let b64 = decodeURIComponent(cipher).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const raw = typeof window !== "undefined"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("binary");
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i) ^ (ROUTE_SECRET[i % ROUTE_SECRET.length] as number);
      result += String.fromCharCode(code);
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * Mapeamento criptografado de rotas públicas internas
 */
export const ENCRYPTED_ROUTE_ALIASES: Record<string, string> = {
  "/comprar": "/c/" + encryptRouteParam("comprar"),
  "/checkout": "/c/" + encryptRouteParam("checkout"),
};
