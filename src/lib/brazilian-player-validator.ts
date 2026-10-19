// ============================================================================
// VALIDADOR AVANÇADO DE JOGADORES REAIS E BRASILEIROS (ANTI-FRAUDE & ANTI-BOT)
// Algoritmo Oficial da Receita Federal (Módulo 11) + Mapeamento Fiscal +
// Detecção de Rede LACNIC/Registro.br + Timezones Brasileiras + Telemetria Humana
// ============================================================================

export interface FiscalRegionInfo {
  code: number;
  description: string;
  states: string[];
}

export const FISCAL_REGIONS: Record<number, FiscalRegionInfo> = {
  0: { code: 0, description: "10ª Região Fiscal (RS)", states: ["RS"] },
  1: { code: 1, description: "1ª Região Fiscal (DF, GO, MT, MS, TO)", states: ["DF", "GO", "MT", "MS", "TO"] },
  2: { code: 2, description: "2ª Região Fiscal (AC, AM, AP, PA, RO, RR)", states: ["AC", "AM", "AP", "PA", "RO", "RR"] },
  3: { code: 3, description: "3ª Região Fiscal (CE, MA, PI)", states: ["CE", "MA", "PI"] },
  4: { code: 4, description: "4ª Região Fiscal (AL, PB, PE, RN)", states: ["AL", "PB", "PE", "RN"] },
  5: { code: 5, description: "5ª Região Fiscal (BA, SE)", states: ["BA", "SE"] },
  6: { code: 6, description: "6ª Região Fiscal (MG)", states: ["MG"] },
  7: { code: 7, description: "7ª Região Fiscal (ES, RJ)", states: ["ES", "RJ"] },
  8: { code: 8, description: "8ª Região Fiscal (SP)", states: ["SP"] },
  9: { code: 9, description: "9ª Região Fiscal (PR, SC)", states: ["PR", "SC"] },
};

export interface CpfValidationResult {
  isValid: boolean;
  digitsOnly: string;
  formatted: string;
  fiscalRegion?: FiscalRegionInfo | undefined;
  reason?: string | undefined;
}

/**
 * Validação rigorosa e matemática de CPF brasileiro segundo a Receita Federal.
 * Checa:
 * 1. Tamanho exato de 11 dígitos.
 * 2. Rejeição de sequências com todos os dígitos idênticos (00000000000, 11111111111, etc.).
 * 3. Primeiro dígito verificador via Módulo 11 (pesos 10..2).
 * 4. Segundo dígito verificador via Módulo 11 (pesos 11..2).
 * 5. Extração da Região Fiscal do Ministério da Fazenda a partir do 9º dígito.
 */
export function validateBrazilianCpf(rawCpf: unknown): CpfValidationResult {
  if (typeof rawCpf !== "string" && typeof rawCpf !== "number") {
    return { isValid: false, digitsOnly: "", formatted: "", reason: "CPF não informado ou tipo inválido" };
  }

  const digits = String(rawCpf).replace(/\D/g, "");

  if (digits.length !== 11) {
    return {
      isValid: false,
      digitsOnly: digits,
      formatted: digits,
      reason: `CPF deve conter exatamente 11 dígitos numéricos (recebido: ${digits.length})`,
    };
  }

  // Rejeita sequências repetidas (000.000.000-00 até 999.999.999-99)
  if (/^(\d)\1{10}$/.test(digits)) {
    return {
      isValid: false,
      digitsOnly: digits,
      formatted: digits,
      reason: "CPF com dígitos idênticos é matematicamente inválido pela Receita Federal",
    };
  }

  // Rejeita sequências conhecidas inválidas
  if (digits === "12345678909" || digits === "98765432100" || digits === "01234567890") {
    return {
      isValid: false,
      digitsOnly: digits,
      formatted: digits,
      reason: "Sequência de teste artificial detectada",
    };
  }

  // 1º Dígito Verificador (pesos de 10 a 2)
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rest1 = 11 - (sum1 % 11);
  const checkDigit1 = rest1 >= 10 ? 0 : rest1;

  if (checkDigit1 !== parseInt(digits.charAt(9), 10)) {
    return {
      isValid: false,
      digitsOnly: digits,
      formatted: digits,
      reason: "Primeiro dígito verificador do CPF não confere",
    };
  }

  // 2º Dígito Verificador (pesos de 11 a 2)
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  let rest2 = 11 - (sum2 % 11);
  const checkDigit2 = rest2 >= 10 ? 0 : rest2;

  if (checkDigit2 !== parseInt(digits.charAt(10), 10)) {
    return {
      isValid: false,
      digitsOnly: digits,
      formatted: digits,
      reason: "Segundo dígito verificador do CPF não confere",
    };
  }

  // 9º dígito identifica a Região Fiscal
  const fiscalDigit = parseInt(digits.charAt(8), 10);
  const fiscalRegion = FISCAL_REGIONS[fiscalDigit];

  const formatted = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  return {
    isValid: true,
    digitsOnly: digits,
    formatted,
    fiscalRegion,
  };
}

// ── DDDs e Estados Brasileiros Oficiais ─────────────────────────────────────
export const BRAZILIAN_DDDS: Record<number, { state: string; region: string }> = {
  11: { state: "SP", region: "São Paulo Capital e Região Metropolitana" },
  12: { state: "SP", region: "Vale do Paraíba e Litoral Norte" },
  13: { state: "SP", region: "Baixada Santista e Litoral Sul" },
  14: { state: "SP", region: "Bauru, Marília, Jaú, Botucatu" },
  15: { state: "SP", region: "Sorocaba, Itapetininga" },
  16: { state: "SP", region: "Ribeirão Preto, Franca, Araraquara" },
  17: { state: "SP", region: "São José do Rio Preto, Barretos" },
  18: { state: "SP", region: "Presidente Prudente, Araçatuba" },
  19: { state: "SP", region: "Campinas, Piracicaba, Americana" },
  21: { state: "RJ", region: "Rio de Janeiro Capital e Região Metropolitana" },
  22: { state: "RJ", region: "Campos dos Goytacazes, Macaé, Região dos Lagos" },
  24: { state: "RJ", region: "Volta Redonda, Petrópolis, Angra dos Reis" },
  27: { state: "ES", region: "Vitória e Região Metropolitana" },
  28: { state: "ES", region: "Cachoeiro de Itapemirim e Sul Capixaba" },
  31: { state: "MG", region: "Belo Horizonte e Região Metropolitana" },
  32: { state: "MG", region: "Juiz de Fora, Zona da Mata" },
  33: { state: "MG", region: "Governador Valadares, Vale do Rio Doce" },
  34: { state: "MG", region: "Uberlândia, Uberaba, Triângulo Mineiro" },
  35: { state: "MG", region: "Poços de Caldas, Pouso Alegre, Sul de Minas" },
  37: { state: "MG", region: "Divinópolis, Centro-Oeste Mineiro" },
  38: { state: "MG", region: "Montes Claros, Norte de Minas" },
  41: { state: "PR", region: "Curitiba e Região Metropolitana" },
  42: { state: "PR", region: "Ponta Grossa, Guarapuava" },
  43: { state: "PR", region: "Londrina, Apucarana" },
  44: { state: "PR", region: "Maringá, Campo Mourão" },
  45: { state: "PR", region: "Foz do Iguaçu, Cascavel" },
  46: { state: "PR", region: "Francisco Beltrão, Pato Branco" },
  47: { state: "SC", region: "Joinville, Blumenau, Itajaí, Balneário Camboriú" },
  48: { state: "SC", region: "Florianópolis e Região Metropolitana, Criciúma" },
  49: { state: "SC", region: "Chapecó, Lages, Oeste Catarinense" },
  51: { state: "RS", region: "Porto Alegre e Região Metropolitana" },
  53: { state: "RS", region: "Pelotas, Rio Grande" },
  54: { state: "RS", region: "Caxias do Sul, Serra Gaúcha" },
  55: { state: "RS", region: "Santa Maria, Uruguaiana" },
  61: { state: "DF", region: "Brasília e Entorno" },
  62: { state: "GO", region: "Goiânia e Região Metropolitana, Anápolis" },
  63: { state: "TO", region: "Palmas e todo o Estado do Tocantins" },
  64: { state: "GO", region: "Rio Verde, Itumbiara, Caldas Novas" },
  65: { state: "MT", region: "Cuiabá e Região Metropolitana" },
  66: { state: "MT", region: "Rondonópolis, Sinop" },
  67: { state: "MS", region: "Campo Grande, Dourados, todo o Mato Grosso do Sul" },
  68: { state: "AC", region: "Rio Branco e todo o Acre" },
  69: { state: "RO", region: "Porto Velho e todo o Rondônia" },
  71: { state: "BA", region: "Salvador e Região Metropolitana" },
  73: { state: "BA", region: "Ilhéus, Itabuna, Porto Seguro" },
  74: { state: "BA", region: "Juazeiro, Senhor do Bonfim" },
  75: { state: "BA", region: "Feira de Santana, Alagoinhas" },
  77: { state: "BA", region: "Vitória da Conquista, Barreiras" },
  79: { state: "SE", region: "Aracaju e todo o Sergipe" },
  81: { state: "PE", region: "Recife e Região Metropolitana" },
  82: { state: "AL", region: "Maceió e todo o Alagoas" },
  83: { state: "PB", region: "João Pessoa, Campina Grande, toda a Paraíba" },
  84: { state: "RN", region: "Natal, Mossoró, todo o Rio Grande do Norte" },
  85: { state: "CE", region: "Fortaleza e Região Metropolitana" },
  86: { state: "PI", region: "Teresina, Parnaíba" },
  87: { state: "PE", region: "Petrolina, Caruaru, Sertão Pernambucano" },
  88: { state: "CE", region: "Juazeiro do Norte, Sobral" },
  89: { state: "PI", region: "Picos, Floriano" },
  91: { state: "PA", region: "Belém e Região Metropolitana" },
  92: { state: "AM", region: "Manaus e Região Metropolitana" },
  93: { state: "PA", region: "Santarém, Altamira" },
  94: { state: "PA", region: "Marabá, Parauapebas" },
  95: { state: "RR", region: "Boa Vista e todo o Roraima" },
  96: { state: "AP", region: "Macapá e todo o Amapá" },
  97: { state: "AM", region: "Interior do Amazonas" },
  98: { state: "MA", region: "São Luís e Região Metropolitana" },
  99: { state: "MA", region: "Imperatriz, Caxias, Interior do Maranhão" },
};

export function validateBrazilianPhone(rawPhone?: unknown): {
  isValid: boolean;
  formatted: string;
  ddd?: number;
  state?: string;
  region?: string;
  isMobile: boolean;
} {
  if (!rawPhone || (typeof rawPhone !== "string" && typeof rawPhone !== "number")) {
    return { isValid: false, formatted: "", isMobile: false };
  }

  const digits = String(rawPhone).replace(/\D/g, "");
  // Telefone brasileiro tem 10 (fixo) ou 11 dígitos (móvel: 9XXXX-XXXX)
  if (digits.length !== 10 && digits.length !== 11) {
    return { isValid: false, formatted: digits, isMobile: false };
  }

  const ddd = parseInt(digits.substring(0, 2), 10);
  const dddInfo = BRAZILIAN_DDDS[ddd];
  if (!dddInfo) {
    return { isValid: false, formatted: digits, isMobile: false };
  }

  const isMobile = digits.length === 11;
  if (isMobile && digits.charAt(2) !== "9") {
    return { isValid: false, formatted: digits, ddd, isMobile: false };
  }

  const formatted = isMobile
    ? `(${ddd}) ${digits.substring(2, 7)}-${digits.substring(7)}`
    : `(${ddd}) ${digits.substring(2, 6)}-${digits.substring(6)}`;

  return {
    isValid: true,
    formatted,
    ddd,
    state: dddInfo.state,
    region: dddInfo.region,
    isMobile,
  };
}

// ── FUSOS HORÁRIOS BRASILEIROS OFICIAIS ─────────────────────────────────────
export const VALID_BRAZILIAN_TIMEZONES = new Set([
  "America/Sao_Paulo",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Belem",
  "America/Maceio",
  "America/Santarem",
  "America/Cuiaba",
  "America/Campo_Grande",
  "America/Porto_Velho",
  "America/Manaus",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Eirunepe",
  "America/Noronha",
  "Brazil/East",
  "Brazil/DeNoronha",
  "Brazil/West",
  "Brazil/Acre",
]);

// ── BLOCOS DE IP OFICIAIS DO BRASIL (LACNIC / Registro.br) ─────────────────
// Ranges principais residenciais e corporativos alocados no Brasil
export function isLikelyBrazilianIp(ip: string): boolean {
  if (!ip) return false;
  const cleanIp = ip.trim();

  // Localhost e Redes Locais para desenvolvimento e homologação
  if (
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp === "localhost" ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("172.16.") ||
    cleanIp.startsWith("172.17.") ||
    cleanIp.startsWith("172.18.") ||
    cleanIp.startsWith("172.19.") ||
    cleanIp.startsWith("172.2") ||
    cleanIp.startsWith("172.3")
  ) {
    return true;
  }

  // IPv6 Brasileiro (Bloco LACNIC 2804::/16 alocado para Provedores Brasileiros)
  if (cleanIp.startsWith("2804:") || cleanIp.startsWith("2801:")) {
    return true;
  }

  // IPv4 Prefixos populares do Brasil (Vivo, Claro, TIM, Oi, Brisanet, Algar, Copel)
  const parts = cleanIp.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    const first = parts[0];
    const second = parts[1];
    if (first === undefined || second === undefined) return false;

    if (
      first === 177 ||
      first === 179 ||
      first === 186 ||
      first === 187 ||
      first === 189 ||
      first === 191 ||
      first === 200 ||
      first === 201
    ) {
      return true;
    }

    if (first === 45 && second >= 160 && second <= 245) return true;
    if (first === 131 && (second === 0 || second === 72 || second === 100 || second === 255)) return true;
    if (first === 138 && second >= 0 && second <= 255) return true;
    if (first === 143 && second >= 0 && second <= 107) return true;
    if (first === 152 && second >= 84 && second <= 84) return true;
    if (first === 168 && second >= 0 && second <= 255) return true;
  }

  return false;
}

// ── DATACENTERS ESTRANGEIROS & SCRAPERS (Hosters conhecidos de bots) ───────
export function isForeignDatacenterOrHoster(ip: string, userAgent: string): boolean {
  const ua = (userAgent || "").toLowerCase();

  // Scrapers / Crawlers / Ferramentas de auditoria e headless
  if (
    /headlesschrome|puppeteer|playwright|selenium|phantomjs|nightmare|mechanize|aiohttp|scrapy|python-requests|curl|wget|postman|insomnia|httpclient|zgrab|masscan|nmap|nikto/i.test(
      ua
    )
  ) {
    return true;
  }

  // Hetzner (ex: 88.198., 95.216., 65.108., 116.202., 136.243., 148.251.)
  // DigitalOcean (ex: 138.68., 159.65., 167.99., 178.62., 206.189.)
  // OVH (ex: 51.254., 54.36., 147.135., 149.202., 151.80.)
  // Choopa/Vultr (ex: 45.32., 45.63., 45.76., 108.61., 149.28.)
  // AWS (ex: 3.80., 18.204., 52.90., 54.210.)
  const prefix2 = ip.split(".").slice(0, 2).join(".");
  const knownBotDcPrefixes = [
    "88.198", "95.216", "65.108", "116.202", "136.243", "148.251", // Hetzner
    "138.68", "159.65", "167.99", "178.62", "206.189",             // DigitalOcean
    "51.254", "54.36", "147.135", "149.202", "151.80",             // OVH
    "45.32", "45.63", "45.76", "108.61", "149.28",                 // Vultr
    "3.80", "18.204", "52.90", "54.210",                            // AWS US
  ];

  if (knownBotDcPrefixes.includes(prefix2)) {
    return true;
  }

  return false;
}

export interface ClientPlayerTelemetry {
  dwellTimeMs?: number | undefined;
  timeZone?: string | undefined;
  languages?: string[] | undefined;
  hasWebdriver?: boolean | undefined;
  screenWidth?: number | undefined;
  screenHeight?: number | undefined;
  interactionCount?: number | undefined;
  keystrokeCount?: number | undefined;
  cpfDigits?: string | undefined;
}

export interface RealPlayerAudit {
  score: number; // 0 a 100
  isRealPlayer: boolean;
  isGenuineBrazilian: boolean;
  confidenceLevel: "GENUÍNO_OURO" | "ALTA_CONFIANÇA" | "REGULAR" | "SUSPEITO" | "BOT_DETECTADO";
  cpfValidation?: CpfValidationResult | undefined;
  fiscalRegionMatch?: boolean | undefined;
  positiveFactors: string[];
  negativeFactors: string[];
  summaryBadge: string;
}

/**
 * Motor central de auditoria e validação avançada de jogador real brasileiro.
 */
export function auditRealBrazilianPlayer(params: {
  request?: Request | undefined;
  clientIp: string;
  userAgent?: string | undefined;
  cpf?: string | undefined;
  telemetry?: ClientPlayerTelemetry | undefined;
}): RealPlayerAudit {
  const { request, clientIp, userAgent = "", cpf, telemetry } = params;

  let score = 0;
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  const ua = userAgent.toLowerCase();

  // 1. Geolocalização Cloudflare / CDN
  const cfCountry = request
    ? (request.headers.get("cf-ipcountry") || request.headers.get("x-country-code") || "").toUpperCase()
    : "";
  const cfRegion = request ? (request.headers.get("cf-region-code") || "").toUpperCase() : "";

  // 2. Análise de IP Brasileiro vs Datacenter Estrangeiro
  const isDatacenter = isForeignDatacenterOrHoster(clientIp, userAgent);
  const isBrIp = isLikelyBrazilianIp(clientIp);

  if (isDatacenter) {
    score -= 60;
    negativeFactors.push("IP identificado como Datacenter/Proxy ou Bot de Crawling");
  } else if (cfCountry === "BR" || isBrIp) {
    score += 35;
    positiveFactors.push("Endereço de rede alocado para o Brasil (LACNIC / Registro.br)");
  } else if (cfCountry && cfCountry !== "BR") {
    score -= 40;
    negativeFactors.push(`Geolocalização fora do Brasil (${cfCountry})`);
  }

  // 3. Cabeçalho de Idioma (Accept-Language)
  const acceptLang = request ? (request.headers.get("accept-language") || "").toLowerCase() : "";
  if (acceptLang.includes("pt-br")) {
    score += 20;
    positiveFactors.push("Navegador com idioma nativo Português do Brasil (pt-BR)");
  } else if (acceptLang.includes("pt")) {
    score += 15;
    positiveFactors.push("Navegador em Língua Portuguesa");
  } else if (acceptLang) {
    score -= 10;
    negativeFactors.push(`Idioma do navegador não é português (${acceptLang.substring(0, 15)})`);
  }

  // 4. Telemetria do Cliente: Timezone Brasileiro
  const clientTz = telemetry?.timeZone || "";
  if (clientTz && VALID_BRAZILIAN_TIMEZONES.has(clientTz)) {
    score += 20;
    positiveFactors.push(`Fuso horário compatível com o Brasil (${clientTz})`);
  } else if (clientTz) {
    score -= 15;
    negativeFactors.push(`Fuso horário reportado fora do Brasil (${clientTz})`);
  }

  // 5. Telemetria de Interação Humana (Anti-Bot)
  if (telemetry) {
    if (telemetry.hasWebdriver) {
      score -= 50;
      negativeFactors.push("Automação de navegador detectada via navigator.webdriver");
    } else {
      score += 10;
      positiveFactors.push("Navegador sem automação/headless");
    }

    if (telemetry.dwellTimeMs && telemetry.dwellTimeMs >= 1500) {
      score += 10;
      positiveFactors.push(`Tempo de permanência humano orgânico (${Math.round(telemetry.dwellTimeMs / 1000)}s)`);
    } else if (telemetry.dwellTimeMs && telemetry.dwellTimeMs < 400) {
      score -= 20;
      negativeFactors.push("Tempo de ação inferior a 400ms (padrão de script robótico)");
    }

    if (telemetry.interactionCount && telemetry.interactionCount >= 2) {
      score += 10;
      positiveFactors.push("Interações humanas reais registradas (mouse/touch/scroll)");
    }

    if (telemetry.screenWidth && telemetry.screenWidth >= 320 && telemetry.screenHeight && telemetry.screenHeight >= 480) {
      score += 5;
      positiveFactors.push(`Resolução de tela física válida (${telemetry.screenWidth}x${telemetry.screenHeight})`);
    }
  }

  // 6. User-Agent de dispositivo de consumo real (Android, iPhone, Windows 10/11, Mac)
  if (/android|iphone|windows nt 10|macintosh/i.test(ua) && !/bot|crawl|spider/i.test(ua)) {
    score += 10;
    positiveFactors.push("Dispositivo móvel ou desktop padrão de usuário comum");
  }

  // 7. Validação de CPF e Cruzamento com Região Fiscal
  let cpfValidation: CpfValidationResult | undefined;
  let fiscalRegionMatch: boolean | undefined;

  const cpfToValidate = cpf || telemetry?.cpfDigits;
  if (cpfToValidate) {
    cpfValidation = validateBrazilianCpf(cpfToValidate);
    if (cpfValidation.isValid) {
      score += 20;
      positiveFactors.push("CPF 100% autêntico e validado no algoritmo oficial da Receita Federal");

      // Cruzamento Fiscal: Se o estado da Região Fiscal for compatível com o estado do IP
      if (cfRegion && cpfValidation.fiscalRegion?.states.includes(cfRegion)) {
        score += 10;
        fiscalRegionMatch = true;
        positiveFactors.push(`Cruzamento positivo: Região Fiscal do CPF coincide com o Estado do IP (${cfRegion})`);
      } else if (cfRegion) {
        fiscalRegionMatch = false;
        // Não penalizamos severamente pois brasileiros viajam ou residem em outro estado
        positiveFactors.push(`Região Fiscal registrada: ${cpfValidation.fiscalRegion?.description}`);
      }
    } else {
      score -= 40;
      negativeFactors.push(`CPF rejeitado: ${cpfValidation.reason}`);
    }
  }

  // Normalização final do Score (0 a 100)
  const finalScore = Math.max(0, Math.min(100, score));

  let confidenceLevel: RealPlayerAudit["confidenceLevel"] = "SUSPEITO";
  let summaryBadge = "⚠️ Jogador Suspeito / Não Verificado";

  if (isDatacenter || finalScore < 35) {
    confidenceLevel = "BOT_DETECTADO";
    summaryBadge = "🤖 Bot / Crawler / Datacenter Bloqueado";
  } else if (finalScore >= 85) {
    confidenceLevel = "GENUÍNO_OURO";
    summaryBadge = "🏆 Jogador Real Brasileiro (Alta Confiança)";
  } else if (finalScore >= 70) {
    confidenceLevel = "ALTA_CONFIANÇA";
    summaryBadge = "✅ Jogador Brasileiro Genuíno";
  } else if (finalScore >= 50) {
    confidenceLevel = "REGULAR";
    summaryBadge = "ℹ️ Jogador em Análise Regular";
  }

  const isRealPlayer = finalScore >= 50 && !isDatacenter;
  const isGenuineBrazilian = isRealPlayer && (cfCountry === "BR" || isBrIp || Boolean(clientTz && VALID_BRAZILIAN_TIMEZONES.has(clientTz)));

  return {
    score: finalScore,
    isRealPlayer,
    isGenuineBrazilian,
    confidenceLevel,
    cpfValidation,
    fiscalRegionMatch,
    positiveFactors,
    negativeFactors,
    summaryBadge,
  };
}
