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

// Assinaturas de Scanners de Portas, Bots Maliciosos, Cloners de Sites e Tentativas de Injeção
const MALICIOUS_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /\.vscode/i,
  /\.docker/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
  /actuator/i,
  /config\.json/i,
  /\.aws/i,
  /xmlrpc/i,
  /\.\./,
  /\/\.well-known/i,
  /<script>/i,
  /javascript:/i,
  /onerror=/i,
  /onload=/i,
  /select\s+.*from/i,
  /union\s+select/i,
  /insert\s+into/i,
  /delete\s+from/i,
  /drop\s+table/i,
  /benchmark\(/i,
  /sleep\(\d+\)/i,
  /etc\/passwd/i,
  /\.php/i,
  /\.asp/i,
  /\.jsp/i,
  /\/cgi-bin\//i,
  /\/telescope\//i,
  /httrack/i,
  /wget/i,
  /teleport/i,
  /webcopier/i,
  /offline\s*explorer/i,
  /site\s*sniffer/i,
];

// Assinaturas de Crawlers de Clonagem e Rippers de Código
const CLONE_BOT_USER_AGENTS = [
  /httrack/i,
  /teleport/i,
  /webcopier/i,
  /offline\s*explorer/i,
  /site\s*sniffer/i,
  /copier/i,
  /scraper/i,
  /rip/i,
  /grabber/i,
  /ninja/i,
  /download\s*ninja/i,
  /cyotek/i,
  /webhttrack/i,
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

  // 0. Bloqueio permanente de IP determinado pelo Admin Supremo
  if (PERMANENT_BANNED_IPS.has(ip)) {
    return {
      allowed: false,
      isAttack: true,
      attackType: "Acesso de IP Banido Permanentemente",
      details: `IP ${ip} consta na lista negra definitiva do Admin Supremo.`,
      reason: "Seu IP foi bloqueado definitivamente pelo administrador de segurança.",
    };
  }

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
        attackType: "Exploit / Scanner de Portas & Injeção",
        details: `Caminho/Payload interceptado: ${pathname}${url.search}`,
        reason: "Scanner/Exploit attempt blocked",
      };
    }
  }

  // 1.1 Bloqueio Imediato de Softwares de Clonagem de Sites e Rippers (HTTrack, Teleport, Scrapers)
  const userAgent = request.headers.get("user-agent") || "";
  for (const botPattern of CLONE_BOT_USER_AGENTS) {
    if (botPattern.test(userAgent)) {
      banIpPermanently(ip);
      return {
        allowed: false,
        isAttack: true,
        attackType: "Bot de Clonagem / Ripper de Código Interceptado",
        details: `Software de cópia interceptado: ${userAgent}`,
        reason: "Site cloning tools are strictly blocked by military shield.",
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

// Blacklist permanente configurada pelo Admin Supremo via Telegram
const PERMANENT_BANNED_IPS = new Set<string>();

export function banIpPermanently(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.trim();
  PERMANENT_BANNED_IPS.add(cleanIp);
  const now = Date.now();
  rateLimitMap.set(cleanIp, {
    count: 999999,
    firstRequest: now,
    blockedUntil: now + 365 * 24 * 60 * 60 * 1000, // 1 ano
  });
  return true;
}

export function unbanIp(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.trim();
  const wasBanned = PERMANENT_BANNED_IPS.delete(cleanIp);
  rateLimitMap.delete(cleanIp);
  return wasBanned || true;
}

export function getBannedIpsList(): string[] {
  return Array.from(PERMANENT_BANNED_IPS);
}

// Headers Militares de Criptografia, Camuflagem e Blindagem Completa HTTP
export const MILITARY_SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=*",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": "frame-ancestors 'none'; object-src 'none';",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Server": "Cloud-Secure-Edge", // Camuflagem contra reconhecimento de servidores
  "X-Powered-By": "Protected-Core",
};


