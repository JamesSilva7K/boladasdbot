// Blindagem de Segurança Militar: Anti-DDoS, Rate Limit, Bloqueio de Scanners, Camuflagem e Geo-Fencing BR

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  blockedUntil?: number | undefined;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 120; // max requisições normais por minuto
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 min de bloqueio militar se estourar

// Assinaturas de Scanners de Portas, Bots Maliciosos e Tentativas de Injeção
const MALICIOUS_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
  /actuator/i,
  /config\.json/i,
  /\.aws/i,
  /xmlrpc/i,
  /\.\./,
  /<script>/i,
  /select\s+.*from/i,
  /union\s+select/i,
  /etc\/passwd/i,
  /\.php/i,
  /\.asp/i,
  /\/cgi-bin\//i,
  /\/telescope\//i,
];

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "127.0.0.1";
  }
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export interface SecurityAuditResult {
  allowed: boolean;
  reason?: string | undefined;
  isAttack?: boolean | undefined;
  attackType?: string | undefined;
  details?: string | undefined;
}

export function auditSecurity(request: Request): SecurityAuditResult {
  const ip = getClientIp(request);
  const now = Date.now();
  const url = new URL(request.url);

  // 1. Detecção de Scanners de portas, descobrimento de caminhos e injeções
  const pathname = url.pathname;
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(pathname) || pattern.test(url.search)) {
      // Bloqueio militar imediato por 2 horas
      rateLimitMap.set(ip, {
        count: 9999,
        firstRequest: now,
        blockedUntil: now + 2 * 60 * 60 * 1000,
      });
      return {
        allowed: false,
        isAttack: true,
        attackType: "Exploit / Scanner de Portas & Arquivos",
        details: `Caminho malicioso interceptado: ${pathname}${url.search}`,
        reason: "Scanner/Exploit attempt blocked",
      };
    }
  }

  // 2. Bloqueio Geográfico (Somente Brasil)
  const enforceBrazil = process.env["ENFORCE_BRAZIL_ONLY"] === "true";
  if (enforceBrazil) {
    const country = request.headers.get("cf-ipcountry"); // Cloudflare Geo Header
    if (country && country.toUpperCase() !== "BR" && country.toUpperCase() !== "XX") {
      return {
        allowed: false,
        isAttack: false,
        reason: `Acesso estrangeiro bloqueado (${country}). Apenas conexões brasileiras legítimas são permitidas.`,
      };
    }
  }

  // 3. Sistema Anti-DDoS e Limite de Taxa por IP
  const record = rateLimitMap.get(ip);
  if (record) {
    if (record.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        isAttack: true,
        attackType: "IP em Blacklist Anti-DDoS",
        details: `IP bloqueado por inundação contínua de pacotes.`,
        reason: "IP Temporarily Blocked due to suspicious flood",
      };
    }

    if (now - record.firstRequest < WINDOW_MS) {
      record.count += 1;
      if (record.count > MAX_REQUESTS) {
        record.blockedUntil = now + BLOCK_DURATION_MS;
        return {
          allowed: false,
          isAttack: true,
          attackType: "Ataque DDoS / Flood de Requisições",
          details: `Volume excedido: ${record.count} requisições/min.`,
          reason: "Rate limit exceeded (Anti-DDoS Shield Triggered)",
        };
      }
    } else {
      record.count = 1;
      record.firstRequest = now;
      record.blockedUntil = undefined;
    }
  } else {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
  }

  return { allowed: true };
}

// Headers Militares de Criptografia, Camuflagem e Segurança HTTP
export const MILITARY_SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Server": "Cloud-Secure-Edge", // Camuflagem contra reconhecimento de servidores
  "X-Powered-By": "Protected-Core",
};
