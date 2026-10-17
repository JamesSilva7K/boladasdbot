import { useEffect, useState } from "react";
import { reportUserActivity, useRifaConfig } from "./useRifaConfig";

// Fallback padrão seguro caso a API esteja temporariamente indisponível
const DEFAULT_WHATSAPP_URL = "https://api.whatsapp.com/send?phone=5511999999999&text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20Bolada%20Pix!";

export type WhatsAppActionType =
  | "ganhadores"
  | "meus_numeros"
  | "quem_somos"
  | "fale_conosco"
  | "edicoes_anteriores"
  | "condicoes_gerais"
  | "regulamento"
  | "comunidade_vip"
  | "instagram"
  | "duvidas_frequentes"
  | "duvida_item"
  | "passos_participacao"
  | "grendacc"
  | "contato_footer"
  | "privacidade"
  | "termos"
  | "default";

const SMART_MESSAGES: Record<WhatsAppActionType, string> = {
  ganhadores:
    "Olá! Gostaria de conferir a lista oficial dos últimos ganhadores do Bolada Pix!",
  meus_numeros:
    "Olá! Gostaria de consultar os números e cotas dos meus bilhetes participantes no Bolada Pix.",
  quem_somos:
    "Olá! Gostaria de saber mais sobre a instituição, segurança e a equipe por trás do Bolada Pix.",
  fale_conosco:
    "Olá! Preciso de atendimento do suporte do Bolada Pix.",
  edicoes_anteriores:
    "Olá! Gostaria de informações e resultados sobre as edições anteriores do Bolada Pix.",
  condicoes_gerais:
    "Olá! Gostaria de tirar dúvidas sobre as Condições Gerais de participação da edição atual.",
  regulamento:
    "Olá! Gostaria de consultar o regulamento oficial e autorização do sorteio Bolada Pix.",
  comunidade_vip:
    "Olá! Quero entrar na Comunidade VIP do Bolada Pix no WhatsApp para receber novidades e mais chances!",
  instagram:
    "Olá! Vi a página no Instagram do Bolada Pix e gostaria de falar com a equipe.",
  duvidas_frequentes:
    "Olá! Estou com uma dúvida sobre como funciona o Bolada Pix e gostaria de ajuda.",
  duvida_item:
    "Olá! Gostaria de esclarecer uma dúvida sobre os sorteios e pagamento da Bolada Pix.",
  passos_participacao:
    "Olá! Vi o passo a passo no site e gostaria de ajuda para escolher meus títulos e participar.",
  grendacc:
    "Olá! Gostaria de saber mais sobre o apoio social do Bolada Pix ao GRENDACC.",
  contato_footer:
    "Olá! Vim pelo rodapé do site e gostaria de falar com o suporte oficial.",
  privacidade:
    "Olá! Gostaria de informações sobre a Política de Privacidade e proteção de dados.",
  termos:
    "Olá! Gostaria de tirar dúvidas sobre os Termos de Uso do Bolada Pix.",
  default:
    "Olá! Vim através do site Bolada Pix e gostaria de atendimento.",
};

export function useWhatsAppRedirect() {
  const rifaConfig = useRifaConfig();
  const [whatsappUrl, setWhatsappUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bolada_whatsapp_url") || DEFAULT_WHATSAPP_URL;
    }
    return DEFAULT_WHATSAPP_URL;
  });

  useEffect(() => {
    if (rifaConfig.whatsappSupportNumber) {
      const cleanPhone = rifaConfig.whatsappSupportNumber.replace(/\D/g, "");
      const msg = encodeURIComponent(SMART_MESSAGES.default);
      const resolved = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
      setWhatsappUrl(resolved);
      if (typeof window !== "undefined") {
        localStorage.setItem("bolada_whatsapp_url", resolved);
      }
    }
  }, [rifaConfig.whatsappSupportNumber]);

  const redirectToWhatsApp = (actionOrCustomMessage?: WhatsAppActionType | string, customExtra?: string) => {
    if (typeof window === "undefined") return;

    const cleanPhone = (rifaConfig.whatsappSupportNumber || "5511999999999").replace(/\D/g, "");
    
    let resolvedText = SMART_MESSAGES.default;
    let actionKey = "custom";

    if (actionOrCustomMessage && actionOrCustomMessage in SMART_MESSAGES) {
      actionKey = actionOrCustomMessage;
      resolvedText = SMART_MESSAGES[actionOrCustomMessage as WhatsAppActionType];
      if (customExtra) {
        resolvedText += ` [${customExtra}]`;
      }
    } else if (actionOrCustomMessage) {
      resolvedText = actionOrCustomMessage;
    }

    reportUserActivity("clique_whatsapp", {
      action: actionKey,
      message: resolvedText,
      whatsappNumber: cleanPhone,
    });

    const targetUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(resolvedText)}`;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return { whatsappUrl, redirectToWhatsApp, SMART_MESSAGES };
}
