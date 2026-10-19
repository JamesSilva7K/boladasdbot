// ============================================================================
// TELEMETRIA SILENCIOSA DE PLAYER HUMANO REAL NO CLIENTE (FRONTEND)
// Coleta passiva de sinais de humanidade, tempo de permanência, fuso horário
// e ausência de automação (Webdriver) para garantir players reais e brasileiros.
// ============================================================================

import type { ClientPlayerTelemetry } from "./brazilian-player-validator";

let startTime = 0;
let interactionCount = 0;
let keystrokeCount = 0;
let listenersInitialized = false;

export function initPlayerTelemetry(): void {
  if (typeof window === "undefined" || listenersInitialized) return;
  listenersInitialized = true;
  startTime = Date.now();

  const bumpInteraction = () => {
    interactionCount += 1;
  };

  window.addEventListener("pointerdown", bumpInteraction, { passive: true });
  window.addEventListener("touchstart", bumpInteraction, { passive: true });
  window.addEventListener("scroll", bumpInteraction, { passive: true });
}

export function recordFormKeystroke(): void {
  keystrokeCount += 1;
  interactionCount += 1;
}

export function getClientPlayerTelemetryPayload(cpfDigits?: string): ClientPlayerTelemetry {
  if (typeof window === "undefined") {
    return {
      dwellTimeMs: 2000,
      timeZone: "America/Sao_Paulo",
      languages: ["pt-BR"],
      hasWebdriver: false,
      cpfDigits,
    };
  }

  const dwellTimeMs = startTime > 0 ? Date.now() - startTime : 2500;
  let timeZone = "America/Sao_Paulo";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  } catch {}

  const nav = window.navigator as Navigator & { webdriver?: boolean };
  const hasWebdriver = Boolean(nav.webdriver || (window as unknown as { _phantom?: unknown })._phantom);

  const screenWidth = typeof window.screen !== "undefined" ? window.screen.width : 1080;
  const screenHeight = typeof window.screen !== "undefined" ? window.screen.height : 1920;

  const languages = nav.languages ? Array.from(nav.languages) : [nav.language || "pt-BR"];

  return {
    dwellTimeMs,
    timeZone,
    languages,
    hasWebdriver,
    screenWidth,
    screenHeight,
    interactionCount,
    keystrokeCount,
    cpfDigits: cpfDigits?.replace(/\D/g, ""),
  };
}
