import { useEffect, useState } from "react";
import type { RifaConfig } from "@/lib/rifa-store";

const DEFAULT_CONFIG: RifaConfig = {
  edition: "Edição 11",
  ticketPrice: 0.69,
  totalPrize: "R$ 300.000",
  drawDate: "04/11/2026",
  drawTime: "20:00",
  lotteryMethod: "pela Loteria Federal",
  whatsappSupportNumber: "5511999999999",
};

export function useRifaConfig() {
  const [config, setConfig] = useState<RifaConfig>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bolada_rifa_config");
      if (cached) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
        } catch {
          // ignore cache error
        }
      }
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchConfig() {
      try {
        const res = await fetch("/api/rifa-config", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as RifaConfig;
          if (isMounted && data) {
            setConfig(data);
            localStorage.setItem("bolada_rifa_config", JSON.stringify(data));
          }
        }
      } catch (err) {
        // Fallback silencioso mantendo o estado atual
      }
    }

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  return config;
}

export async function reportUserActivity(
  type:
    | "click_comprar"
    | "modal_opened"
    | "cpf_validado"
    | "cpf_invalido"
    | "tentativa_consulta"
    | "entrada"
    | "saida"
    | "clique_whatsapp",
  data?: Record<string, unknown>
) {
  try {
    await fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    });
  } catch {
    // Silently continue to not impact UX
  }
}
