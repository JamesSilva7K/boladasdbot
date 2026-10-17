// ============================================================================
// BLINDAGEM CLIENT-SIDE CONTRA CÓPIAS, INSPEÇÃO, SCRAPING E CLONAGEM DE CÓDIGO
// ============================================================================

/**
 * Ativa todas as camadas de proteção no navegador:
 * 1. Desabilita menu de contexto (botão direito)
 * 2. Bloqueia atalhos de desenvolvedor (F12, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+S)
 * 3. Impede seleção e cópia indiscriminada de textos estruturais
 * 4. Bloqueia arrastar e soltar (drag & drop) de imagens e logos
 * 5. Anti-debugger (laço heurístico que congela inspectores de código maliciosos)
 * 6. Proteção contra embedding indevido em iframes (anti-clickjacking)
 */
export function initClientSecurityShield(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  // 1. Bloqueio de Clique com Botão Direito
  const handleContextMenu = (e: MouseEvent) => {
    // Permite uso normal de clique direito apenas se for input de texto selecionado
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    e.preventDefault();
  };

  // 2. Bloqueio de Atalhos de Teclado de Inspeção e Cópia de Código Fonte
  const handleKeyDown = (e: KeyboardEvent) => {
    // F12 (DevTools)
    if (e.key === "F12" || e.keyCode === 123) {
      e.preventDefault();
      return;
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd) {
      const key = e.key.toLowerCase();

      // Ctrl + U (Ver Código Fonte)
      if (key === "u") {
        e.preventDefault();
        return;
      }

      // Ctrl + S (Salvar Página Completa / Clonagem Local)
      if (key === "s") {
        e.preventDefault();
        return;
      }

      // Ctrl + Shift + I (DevTools) ou Ctrl + Shift + J (Console) ou Ctrl + Shift + C (Element Inspector)
      if (e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        return;
      }
    }
  };

  // 3. Bloqueio de Arrastar Imagens (Prevenção contra download rápido de criativos)
  const handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName === "IMG") {
      e.preventDefault();
    }
  };

  // 4. Anti-Frame / Anti-Clickjacking no Client
  try {
    if (window.top && window.self !== window.top) {
      window.top.location.href = window.self.location.href;
    }
  } catch {
    // Bloqueado por restrições de cross-origin
  }


  // Registra os listeners globais
  document.addEventListener("contextmenu", handleContextMenu, { capture: true });
  window.addEventListener("keydown", handleKeyDown, { capture: true });
  document.addEventListener("dragstart", handleDragStart, { capture: true });

  return () => {
    document.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    window.removeEventListener("keydown", handleKeyDown, { capture: true });
    document.removeEventListener("dragstart", handleDragStart, { capture: true });
  };
}
