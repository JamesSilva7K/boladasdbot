import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ModernHeader } from "@/components/home/ModernHeader";
import { ModernPrizeSection } from "@/components/home/ModernPrizeSection";
import { RaspadinhasSection } from "@/components/home/RaspadinhasSection";
import { TrustAndClientSection } from "@/components/home/TrustAndClientSection";
import { reportUserActivity } from "@/hooks/useRifaConfig";

export const Route = createFileRoute("/comprar")({
  head: () => ({
    meta: [
      { title: "Bolada Pix — Escolha suas Cotas e Participe" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Comprar,
});


function Comprar() {
  useEffect(() => {
    reportUserActivity("entrada", { path: "/comprar" });

    let hasReportedExit = false;
    const handleExit = () => {
      if (!hasReportedExit) {
        hasReportedExit = true;
        reportUserActivity("saida");
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleExit();
      }
    };

    window.addEventListener("pagehide", handleExit);
    window.addEventListener("beforeunload", handleExit);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handleExit);
      window.removeEventListener("beforeunload", handleExit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#eceef1] flex justify-center selection:bg-[#4d8227]/20 selection:text-gray-900">
      <div className="w-full max-w-[500px] bg-white min-h-screen shadow-sm flex flex-col border-x border-gray-200/60">
        <ModernHeader />
        <main className="flex-1 flex flex-col">
          <ModernPrizeSection />
          <RaspadinhasSection />
          <TrustAndClientSection />
        </main>
      </div>
    </div>
  );
}

