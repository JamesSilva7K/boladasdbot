import { useEffect, useState } from "react";
import { reportUserActivity, useRifaConfig } from "./useRifaConfig";

// Fallback padrão seguro caso a API esteja temporariamente indisponível
const DEFAULT_WHATSAPP_URL = "https://api.whatsapp.com/send?phone=5511999999999&text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20Bolada%20Pix!";

export function useWhatsAppRedirect() {
  const rifaConfig = useRifaConfig();
  const [whatsappUrl, setWhatsappUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bolada_whatsapp_url") || DEFAULT_WHATSAPP_URL;
    }
    return DEFAULT_WHATSAPP_URL;
  });

  useEffect(() => {
    // Sincroniza dinamicamente com o número de WhatsApp alterado pelo Admin via Telegram
    if (rifaConfig.whatsappSupportNumber) {
      const cleanPhone = rifaConfig.whatsappSupportNumber.replace(/\D/g, "");
      const msg = encodeURIComponent("Olá! Gostaria de informações sobre a Bolada Pix!");
      const resolved = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
      setWhatsappUrl(resolved);
      if (typeof window !== "undefined") {
        localStorage.setItem("bolada_whatsapp_url", resolved);
      }
    }
  }, [rifaConfig.whatsappSupportNumber]);

  const redirectToWhatsApp = (customMessage?: string) => {
    if (typeof window === "undefined") return;

    reportUserActivity("clique_whatsapp", {
      customMessage: customMessage || "Contato padrão",
      whatsappNumber: rifaConfig.whatsappSupportNumber,
    });

    let targetUrl = whatsappUrl;
    if (customMessage) {
      try {
        const parsed = new URL(targetUrl);
        parsed.searchParams.set("text", customMessage);
        targetUrl = parsed.toString();
      } catch {
        targetUrl = `${whatsappUrl}&text=${encodeURIComponent(customMessage)}`;
      }
    }

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return { whatsappUrl, redirectToWhatsApp };
}
