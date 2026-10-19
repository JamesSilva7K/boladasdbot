// Resolução profunda e precisa de dados e Geolocalização do Lead

export interface LeadProfile {
  ip: string;
  country: string;
  state: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  isBrazilian: boolean;
  userAgent: string;
}

// Reconhecimento de DDDs e Estados Brasileiros
const STATE_MAP: Record<string, string> = {
  SP: "São Paulo",
  RJ: "Rio de Janeiro",
  MG: "Minas Gerais",
  BA: "Bahia",
  PR: "Paraná",
  RS: "Rio Grande do Sul",
  PE: "Pernambuco",
  CE: "Ceará",
  PA: "Pará",
  SC: "Santa Catarina",
  GO: "Goiás",
  MA: "Maranhão",
  ES: "Espírito Santo",
  PB: "Paraíba",
  AM: "Amazonas",
  MT: "Mato Grosso",
  PI: "Piauí",
  AL: "Alagoas",
  DF: "Distrito Federal",
  MS: "Mato Grosso do Sul",
  RN: "Rio Grande do Norte",
  SE: "Sergipe",
  RO: "Rondônia",
  TO: "Tocantins",
  AC: "Acre",
  AP: "Amapá",
  RR: "Roraima",
};

export function parseUserAgent(ua: string) {
  let device = "Desktop";
  let os = "Desconhecido";
  let browser = "Navegador Web";

  if (/Mobile|Android|iP(hone|od|ad)/i.test(ua)) {
    device = "Smartphone / Mobile";
  }

  if (/Windows NT 10/i.test(ua)) os = "Windows 10/11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = "Google Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Apple Safari";
  else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox";
  else if (/Edg/i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";

  return { device, os, browser };
}

import {
  auditRealBrazilianPlayer,
  type ClientPlayerTelemetry,
  type RealPlayerAudit,
  validateBrazilianCpf,
} from "./brazilian-player-validator";

export interface LeadValidationResult {
  isGenuineBrazilian: boolean;
  score: number; // 0 a 100
  reasons: string[];
  positiveFactors?: string[] | undefined;
  confidenceLevel?: string | undefined;
  summaryBadge?: string | undefined;
  fiscalRegion?: string | undefined;
}

export function validateGenuineBrazilianLead(
  request: Request,
  ua: string,
  clientIp?: string | undefined,
  cpf?: string | undefined,
  telemetry?: ClientPlayerTelemetry | undefined
): LeadValidationResult {
  const audit = auditRealBrazilianPlayer({
    request,
    clientIp: clientIp || "127.0.0.1",
    userAgent: ua,
    cpf,
    telemetry,
  });

  return {
    isGenuineBrazilian: audit.isGenuineBrazilian,
    score: audit.score,
    reasons: audit.negativeFactors,
    positiveFactors: audit.positiveFactors,
    confidenceLevel: audit.confidenceLevel,
    summaryBadge: audit.summaryBadge,
    fiscalRegion: audit.cpfValidation?.fiscalRegion?.description,
  };
}

export function extractLeadProfile(
  request: Request,
  clientIp: string,
  options?: { cpf?: string | undefined; telemetry?: ClientPlayerTelemetry | undefined } | undefined
): LeadProfile & { validation: LeadValidationResult; audit: RealPlayerAudit } {
  const ua = request.headers.get("user-agent") || "";
  const { device, os, browser } = parseUserAgent(ua);

  // Cloudflare Geolocation Headers (ou fallback inteligente de IP)
  const country = (request.headers.get("cf-ipcountry") || request.headers.get("x-country-code") || "BR").toUpperCase();
  const stateCode = (request.headers.get("cf-region-code") || "SP").toUpperCase();
  const city = request.headers.get("cf-ipcity") || "São Paulo";
  const stateName = STATE_MAP[stateCode] || stateCode;

  const isBrazilian = country === "BR";
  const audit = auditRealBrazilianPlayer({
    request,
    clientIp,
    userAgent: ua,
    cpf: options?.cpf,
    telemetry: options?.telemetry,
  });

  const validation: LeadValidationResult = {
    isGenuineBrazilian: audit.isGenuineBrazilian,
    score: audit.score,
    reasons: audit.negativeFactors,
    positiveFactors: audit.positiveFactors,
    confidenceLevel: audit.confidenceLevel,
    summaryBadge: audit.summaryBadge,
    fiscalRegion: audit.cpfValidation?.fiscalRegion?.description,
  };

  return {
    ip: clientIp,
    country: isBrazilian ? "Brasil 🇧🇷" : `${country} 🌐`,
    state: stateName,
    city: decodeURIComponent(city),
    device,
    browser,
    os,
    isBrazilian,
    userAgent: ua,
    validation,
    audit,
  };
}

