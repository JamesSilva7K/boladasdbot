// Utilitário preciso para garantir que todas as datas e horários estejam
// perfeitamente sincronizados com o Fuso Horário de Brasília (America/Sao_Paulo, UTC-3)
// independentemente de onde o servidor Cloudflare / Vercel / Docker esteja hospedado.

const BR_TIMEZONE = "America/Sao_Paulo";

export function getBrasiliaDate(): Date {
  return new Date();
}

export function formatBrasiliaTime(date: Date = new Date(), options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: BR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options,
  });
}

export function formatBrasiliaDate(date: Date = new Date(), options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("pt-BR", {
    timeZone: BR_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}
