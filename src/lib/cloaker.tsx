import React, { useMemo } from "react";

// ============================================================================
// CLOAKING / CAMUFLAGEM TEXTUAL INTELIGENTE PARA TRÁFEGO PAGO (META / GOOGLE ADS)
// ============================================================================
// Palavras sensíveis como "PIX", "RIFA", "SORTEIO", "COTAS", "BILHETE" são
// camufladas contra crawlers/bots de revisão de anúncios por injeção de caracteres
// de largura zero (ZWSP \u200B) e glifos homóglifos visuais idênticos ao olho humano,
// tornando o texto 100% legível para o lead, mas invisível para os filtros de palavras proibidas.

const SENSITIVE_DICTIONARY: Record<string, string> = {
  // PIX e variações
  "PIX": "P\u200B\u0406\u200BX",
  "Pix": "P\u200B\u0456\u200Bx",
  "pix": "p\u200B\u0456\u200Bx",

  // Rifa e variações
  "RIFA": "R\u200B\u0406\u200BFA",
  "Rifas": "R\u200B\u0456\u200Bfas",
  "rifas": "r\u200B\u0456\u200Bfas",
  "Rifa": "R\u200B\u0456\u200Bfa",
  "rifa": "r\u200B\u0456\u200Bfa",

  // Sorteio e variações
  "SORTEIO": "S\u200BO\u200BR\u200BT\u200BE\u200BI\u200BO",
  "Sorteios": "S\u200Bo\u200Br\u200Bt\u200Be\u200Bi\u200Bo\u200Bs",
  "sorteios": "s\u200Bo\u200Br\u200Bt\u200Be\u200Bi\u200Bo\u200Bs",
  "Sorteio": "S\u200Bo\u200Br\u200Bt\u200Be\u200Bi\u200Bo",
  "sorteio": "s\u200Bo\u200Br\u200Bt\u200Be\u200Bi\u200Bo",

  // Cotas e bilhetes
  "Cotas": "C\u200Bo\u200Bt\u200Ba\u200Bs",
  "cotas": "c\u200Bo\u200Bt\u200Ba\u200Bs",
  "Cota": "C\u200Bo\u200Bt\u200Ba",
  "cota": "c\u200Bo\u200Bt\u200Ba",
  "Bilhetes": "B\u200Bi\u200Bl\u200Bh\u200Be\u200Bt\u200Be\u200Bs",
  "bilhetes": "b\u200Bi\u200Bl\u200Bh\u200Be\u200Bt\u200Be\u200Bs",
  "Bilhete": "B\u200Bi\u200Bl\u200Bh\u200Be\u200Bt\u200Be",
  "bilhete": "b\u200Bi\u200Bl\u200Bh\u200Be\u200Bt\u200Be",

  // Concorrer / Prêmio
  "Concorrer": "C\u200Bo\u200Bn\u200Bc\u200Bo\u200Br\u200Br\u200Be\u200Br",
  "concorrer": "c\u200Bo\u200Bn\u200Bc\u200Bo\u200Br\u200Br\u200Be\u200Br",
  "Prêmio": "P\u200Br\u200Bê\u200Bm\u200Bi\u200Bo",
  "prêmio": "p\u200Br\u200Bê\u200Bm\u200Bi\u200Bo",
  "Prêmios": "P\u200Br\u200Bê\u200Bm\u200Bi\u200Bo\u200Bs",
  "prêmios": "p\u200Br\u200Bê\u200Bm\u200Bi\u200Bo\u200Bs",
};

// Expressão regular com todas as palavras para substituição inteligente
const SENSITIVE_REGEX = new RegExp(
  Object.keys(SENSITIVE_DICTIONARY)
    .sort((a, b) => b.length - a.length)
    .join("|"),
  "g"
);

/**
 * Função utilitária que camufla uma string substituindo palavras sensíveis
 * por variantes com injeção de separadores invisíveis.
 */
export function cloakText(input?: string | null): string {
  if (!input || typeof input !== "string") return "";
  return input.replace(SENSITIVE_REGEX, (match) => SENSITIVE_DICTIONARY[match] || match);
}

/**
 * Componente React para renderizar textos camuflados de forma declarativa.
 */
export function Cloaked({ children }: { children: React.ReactNode }) {
  const content = useMemo(() => {
    if (typeof children === "string") {
      return cloakText(children);
    }
    return children;
  }, [children]);

  return <>{content}</>;
}
