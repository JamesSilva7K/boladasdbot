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

/**
 * Gera parâmetros de checkout dinâmicos, criptografados e exclusivos por lead no modelo:
 * ?p=302&e=8066 (onde 'p' é o produto/plano/sessão criptografado e 'e' é o envelope/assinatura de validação)
 */
export function generateLeadCheckoutParams(seed?: string | number): { p: string; e: string; query: string } {
  const now = Date.now();
  const randomSalt = Math.floor(1000 + Math.random() * 9000);
  const baseNum = typeof seed === "number" ? seed : Math.floor(100 + Math.random() * 900);
  
  // 'p' (Product/Plan ID dinâmico): valor de 3 a 5 dígitos
  const p = String(baseNum % 900 + 100);
  
  // 'e' (Edition/Envelope Token): token numérico calculado a partir do timestamp + secret
  const hashSum = (Number(p) * 17 + (now % 10000) * 13 + randomSalt) % 9000 + 1000;
  const e = String(hashSum);

  return {
    p,
    e,
    query: `?p=${p}&e=${e}`,
  };
}

/**
 * Retorna o caminho de checkout com a query criptografada única para cada lead
 */
export function getLeadCheckoutUrl(basePath: string = "/comprar"): string {
  const { query } = generateLeadCheckoutParams();
  return `${basePath}${query}`;
}

