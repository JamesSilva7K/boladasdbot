// ============================================================================
// BLINDAGEM MILITAR AVANÇADA — Anti-DDoS Multi-Camada, Fingerprinting,
// Honeypot de Rotas, Burst Detection, Geo-Fencing e Penalização Progressiva
// ============================================================================

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  blockedUntil?: number | undefined;
  strikes: number;          // Infrações acumuladas (penalização progressiva)
  lastSeen: number;
  fingerprints: Set<string>; // Fingerprints de user-agent nesta janela
}

interface SuspicionRecord {
  honeypotHits: number;     // Acessos a rotas armadilha
  scanAttempts: number;     // Tentativas de scan
  lastHit: number;
}

// ── Rate Limit por IP ──────────────────────────────────────────────────────
const rateLimitMap  = new Map<string, RateLimitRecord>();
const suspicionMap  = new Map<string, SuspicionRecord>();

const WINDOW_MS         = 60  * 1000;  // janela de 1 minuto
const MAX_REQUESTS_NORM = 90;          // limite normal
const MAX_REQUESTS_API  = 30;          // limite mais rigoroso para rotas /api
const BURST_WINDOW_MS   = 3  * 1000;  // janela de burst (3s)
const BURST_MAX         = 20;          // máx requisições em 3s
const BLOCK_DURATION_BASE = 30 * 60 * 1000; // bloco base: 30 min
const CLEANUP_INTERVAL  = 5  * 60 * 1000;  // limpeza do mapa a cada 5 min

// Contadores de burst por IP (janela de 3s)
const burstMap = new Map<string, { count: number; windowStart: number }>();

// Limpeza periódica para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of rateLimitMap) {
    if (now - rec.lastSeen > 10 * 60 * 1000) rateLimitMap.delete(ip);
  }
  for (const [ip, sus] of suspicionMap) {
    if (now - sus.lastHit > 60 * 60 * 1000) suspicionMap.delete(ip);
  }
  for (const [ip, b] of burstMap) {
    if (now - b.windowStart > BURST_WINDOW_MS * 10) burstMap.delete(ip);
  }
}, CLEANUP_INTERVAL);

// ── Padrões Maliciosos ─────────────────────────────────────────────────────
const MALICIOUS_PATH_PATTERNS: RegExp[] = [
  /\.env/i, /\.git/i, /\.vscode/i, /\.docker/i, /\.aws/i,
  /wp-admin/i, /wp-login/i, /wp-content/i, /wp-includes/i,
  /phpmyadmin/i, /pma\//i, /myadmin/i,
  /actuator/i, /config\.json/i, /xmlrpc/i,
  /\/\.\.\//,                                    // path traversal
  /\.\./,
  /<script>/i, /javascript:/i, /onerror=/i, /onload=/i,
  /select\s+.*from/i, /union\s+select/i, /insert\s+into/i,
  /delete\s+from/i, /drop\s+table/i,
  /benchmark\(/i, /sleep\(\d+\)/i,
  /etc\/passwd/i, /\/proc\//i,
  /\.php$/i, /\.asp$/i, /\.jsp$/i, /\.cgi$/i,
  /\/cgi-bin\//i, /\/telescope\//i,
  /httrack/i, /wget/i, /teleport/i,
  /\/(admin|panel|dashboard|login|console|setup|install)\/?$/i,
  /\/api\/(admin|internal|debug|test|health|ping|status)\/?/i,
  /\/(swagger|openapi|graphql|graphiql)\/?/i,
  /\/(\.well-known)\//i,
  /\/(backup|dump|export|import|migrate)\//i,
  /eval\(/i, /base64_decode/i, /system\(/i,
];

// Rotas-honeypot: qualquer acesso = banimento imediato
const HONEYPOT_PATHS = new Set([
  "/admin", "/administrator", "/wp-admin", "/wp-login.php",
  "/phpmyadmin", "/pma", "/mysql", "/database",
  "/.env", "/.env.local", "/.env.production",
  "/config", "/config.json", "/settings.json",
  "/debug", "/test", "/internal", "/private",
  "/api/admin", "/api/debug", "/api/internal", "/api/test",
  "/api/health", "/api/ping", "/api/status",
  "/login", "/dashboard", "/panel", "/console",
  "/backup", "/dump", "/export",
  "/.git/config", "/.git/HEAD",
]);

// Agentes de clonagem/scraping
const MALICIOUS_USER_AGENTS: RegExp[] = [
  /httrack/i, /teleport/i, /webcopier/i, /offline[\s-]explorer/i,
  /site[\s-]sniffer/i, /copier/i, /scraper/i, /ripper/i,
  /grabber/i, /download[\s-]ninja/i, /cyotek/i, /webhttrack/i,
  /python-requests/i, /go-http-client/i, /java\/\d/i,
  /curl\/\d/i, /libwww-perl/i, /lwp-request/i,
  /masscan/i, /nmap/i, /nikto/i, /sqlmap/i, /dirbuster/i,
  /gobuster/i, /wfuzz/i, /hydra/i, /zgrab/i,
  /scrapy/i, /aiohttp/i, /httpx/i,
];

// ── Extração de IP ─────────────────────────────────────────────────────────
export function getClientIp(request: Request): string {
  // Prioridade: Cloudflare > Forwarded > Real-IP > fallback
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first !== "127.0.0.1" && first !== "::1") return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

// ── Fingerprint da requisição (para detectar rotação de user-agent) ────────
function buildRequestFingerprint(request: Request): string {
  const ua     = (request.headers.get("user-agent") || "").substring(0, 80);
  const lang   = request.headers.get("accept-language") || "";
  const enc    = request.headers.get("accept-encoding") || "";
  return `${ua}|${lang}|${enc}`;
}

// ── Interface pública ──────────────────────────────────────────────────────
export interface SecurityAuditResult {
  allowed: boolean;
  reason?: string;
  isAttack?: boolean;
  attackType?: string;
  details?: string;
}

// ── Auditoria de segurança principal ──────────────────────────────────────
export function auditSecurity(request: Request): SecurityAuditResult {
  const ip  = getClientIp(request);
  const now = Date.now();
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();
  const ua  = request.headers.get("user-agent") || "";

  // ── 0. Blacklist permanente ───────────────────────────────────────────
  if (PERMANENT_BANNED_IPS.has(ip)) {
    return {
      allowed: false, isAttack: true,
      attackType: "IP Banido Permanentemente",
      details: `IP ${ip} na lista negra definitiva.`,
      reason: "403",
    };
  }

  // ── 1. Honeypot — banimento imediato silencioso ───────────────────────
  if (HONEYPOT_PATHS.has(pathname) || HONEYPOT_PATHS.has(url.pathname)) {
    const sus = suspicionMap.get(ip) || { honeypotHits: 0, scanAttempts: 0, lastHit: now };
    sus.honeypotHits += 1;
    sus.lastHit = now;
    suspicionMap.set(ip, sus);

    // ≥ 1 hit num honeypot = ban imediato
    banIpPermanently(ip);
    return {
      allowed: false, isAttack: true,
      attackType: "Honeypot Ativado — Descoberta de Rota Interceptada",
      details: `Rota-armadilha acessada: ${url.pathname}`,
      reason: "404",  // responde 404 para não revelar que foi bloqueado
    };
  }

  // ── 2. Padrões maliciosos na URL / query ──────────────────────────────
  const fullTarget = `${pathname}${url.search}${url.hash}`;
  for (const pat of MALICIOUS_PATH_PATTERNS) {
    if (pat.test(fullTarget)) {
      const blockDuration = 4 * 60 * 60 * 1000; // 4h
      rateLimitMap.set(ip, {
        count: 9999, firstRequest: now, lastSeen: now, strikes: 99,
        blockedUntil: now + blockDuration,
        fingerprints: new Set(),
      });
      return {
        allowed: false, isAttack: true,
        attackType: "Exploit / Path Traversal / Injection",
        details: `Payload: ${pathname}${url.search}`.substring(0, 200),
        reason: "400",
      };
    }
  }

  // ── 3. User-Agent malicioso ───────────────────────────────────────────
  for (const botPat of MALICIOUS_USER_AGENTS) {
    if (botPat.test(ua)) {
      banIpPermanently(ip);
      return {
        allowed: false, isAttack: true,
        attackType: "Bot / Scanner / Ripper Interceptado",
        details: `UA suspeito: ${ua.substring(0, 100)}`,
        reason: "403",
      };
    }
  }

  // ── 4. Missing User-Agent (bots crus) ────────────────────────────────
  if (!ua && !pathname.startsWith("/api/webhook")) {
    const sus = suspicionMap.get(ip) || { honeypotHits: 0, scanAttempts: 0, lastHit: now };
    sus.scanAttempts += 1;
    sus.lastHit = now;
    suspicionMap.set(ip, sus);
    if (sus.scanAttempts >= 3) {
      banIpPermanently(ip);
      return {
        allowed: false, isAttack: true,
        attackType: "Requisição Sem User-Agent — Possível Scanner",
        details: `IP ${ip} sem UA repetidamente.`,
        reason: "403",
      };
    }
  }

  // ── 5. Burst detection (janela de 3 segundos) ─────────────────────────
  const burst = burstMap.get(ip) || { count: 0, windowStart: now };
  if (now - burst.windowStart < BURST_WINDOW_MS) {
    burst.count += 1;
    if (burst.count > BURST_MAX) {
      const rec = rateLimitMap.get(ip);
      const strikes = (rec?.strikes || 0) + 1;
      const blockDur = BLOCK_DURATION_BASE * Math.min(strikes, 8); // progressivo
      rateLimitMap.set(ip, {
        count: 9999, firstRequest: now, lastSeen: now, strikes,
        blockedUntil: now + blockDur,
        fingerprints: new Set(),
      });
      return {
        allowed: false, isAttack: true,
        attackType: `Flood Instantâneo (Burst) — ${burst.count} req/3s`,
        details: `${burst.count} requisições em ${BURST_WINDOW_MS}ms.`,
        reason: "429",
      };
    }
  } else {
    burst.count = 1;
    burst.windowStart = now;
  }
  burstMap.set(ip, burst);

  // ── 6. Rate Limit por janela de 1 min (com penalização progressiva) ───
  const isApiRoute = pathname.startsWith("/api/");
  const maxReqs    = isApiRoute ? MAX_REQUESTS_API : MAX_REQUESTS_NORM;

  const rec = rateLimitMap.get(ip);
  if (rec) {
    rec.lastSeen = now;

    // Ainda bloqueado?
    if (rec.blockedUntil && now < rec.blockedUntil) {
      return {
        allowed: false, isAttack: true,
        attackType: "IP em Blacklist Anti-DDoS",
        details: `Bloqueado por ${Math.ceil((rec.blockedUntil - now) / 60000)} min.`,
        reason: "429",
      };
    }

    if (now - rec.firstRequest < WINDOW_MS) {
      rec.count += 1;
      // Rotação de fingerprint suspeita?
      const fp = buildRequestFingerprint(request);
      rec.fingerprints.add(fp);

      if (rec.count > maxReqs) {
        rec.strikes = (rec.strikes || 0) + 1;
        const blockDur = BLOCK_DURATION_BASE * Math.min(rec.strikes, 8);
        rec.blockedUntil = now + blockDur;
        return {
          allowed: false, isAttack: true,
          attackType: `DDoS / Rate Limit Excedido (${rec.strikes}ª infração)`,
          details: `${rec.count} req/min — bloqueado por ${Math.ceil(blockDur / 60000)} min.`,
          reason: "429",
        };
      }

      // Muitos fingerprints diferentes = rotação de agente (possível bot)
      if (rec.fingerprints.size > 8 && rec.count > 20) {
        rec.strikes = (rec.strikes || 0) + 1;
        const blockDur = BLOCK_DURATION_BASE * 2;
        rec.blockedUntil = now + blockDur;
        return {
          allowed: false, isAttack: true,
          attackType: "Rotação de User-Agent — Possível Bot/Proxy",
          details: `${rec.fingerprints.size} fingerprints distintos detectados.`,
          reason: "403",
        };
      }
    } else {
      rec.count       = 1;
      rec.firstRequest = now;
      rec.blockedUntil = undefined;
      rec.fingerprints = new Set([buildRequestFingerprint(request)]);
    }
  } else {
    rateLimitMap.set(ip, {
      count: 1, firstRequest: now, lastSeen: now,
      strikes: 0,
      fingerprints: new Set([buildRequestFingerprint(request)]),
    });
  }

  // ── 7. Geo-Fencing (apenas Brasil) ───────────────────────────────────
  const enforceBrazil = process.env["ENFORCE_BRAZIL_ONLY"] === "true";
  if (enforceBrazil) {
    const country = (request.headers.get("cf-ipcountry") || "").toUpperCase();
    if (country && country !== "BR" && country !== "XX") {
      return {
        allowed: false, isAttack: false,
        reason: `Acesso estrangeiro bloqueado (${country})`,
      };
    }
  }

  return { allowed: true };
}

// ── Blacklist permanente ───────────────────────────────────────────────────
const PERMANENT_BANNED_IPS = new Set<string>();

export function banIpPermanently(ip: string): boolean {
  if (!ip || ip === "127.0.0.1") return false;
  const clean = ip.trim();
  PERMANENT_BANNED_IPS.add(clean);
  const now = Date.now();
  rateLimitMap.set(clean, {
    count: 999999, firstRequest: now, lastSeen: now,
    strikes: 99,
    blockedUntil: now + 365 * 24 * 60 * 60 * 1000,
    fingerprints: new Set(),
  });
  return true;
}

export function unbanIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.trim();
  PERMANENT_BANNED_IPS.delete(clean);
  rateLimitMap.delete(clean);
  return true;
}

export function getBannedIpsList(): string[] {
  return Array.from(PERMANENT_BANNED_IPS);
}

// ── Headers HTTP Militares ─────────────────────────────────────────────────
// Nota: Cache-Control NÃO está aqui porque HTML/assets precisam de cache diferente.
// Para APIs use API_SECURITY_HEADERS que adiciona no-store.
export const MILITARY_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options"             : "DENY",
  "X-Content-Type-Options"      : "nosniff",
  "X-XSS-Protection"            : "1; mode=block",
  "Referrer-Policy"             : "no-referrer",
  "Permissions-Policy"          : "camera=(), microphone=(), geolocation=(), payment=*",
  "Strict-Transport-Security"   : "max-age=63072000; includeSubDomains; preload",
  // CSP: permite scripts/estilos inline necessários pelo TanStack Start SSR
  // (window.$_TSR bootstrap + Vite HMR chunks + Google Fonts)
  "Content-Security-Policy"     : [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.telegram.org https://ipapi.co https://ipinfo.io",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "),
  "Cross-Origin-Embedder-Policy": "unsafe-none",
  "Cross-Origin-Opener-Policy"  : "same-origin",
  "Cross-Origin-Resource-Policy": "cross-origin",
  // Camuflagem: remove/falsifica headers que revelam stack
  "Server"                      : "nginx/1.24.0",
  "X-Powered-By"               : "PHP/8.2.0",
};

// Headers adicionais para respostas de API (não SSR)
export const API_SECURITY_HEADERS: Record<string, string> = {
  ...MILITARY_SECURITY_HEADERS,
  "Cache-Control" : "no-store, no-cache, must-revalidate, private",
  "Pragma"        : "no-cache",
};

// ── Resposta de erro ofuscada (não revela causa real) ──────────────────────
// Retorna sempre 404 genérico para honeypots/scanners — não revela que foi bloqueado
export function buildSecureErrorResponse(reason?: string): Response {
  const isHoneypot = reason === "404";
  const status = isHoneypot ? 404 : reason === "429" ? 429 : reason === "400" ? 400 : 403;

  const bodies: Record<number, string> = {
    404: "Not Found",
    429: "Too Many Requests",
    400: "Bad Request",
    403: "Forbidden",
  };

  return new Response(JSON.stringify({ error: bodies[status] || "Forbidden" }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...MILITARY_SECURITY_HEADERS,
    },
  });
}
