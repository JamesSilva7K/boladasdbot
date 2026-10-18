import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/home/Header";
import { PrizeSection } from "@/components/home/PrizeSection";
import { ParticipationSection } from "@/components/home/ParticipationSection";
import { FaqSection } from "@/components/home/FaqSection";
import { CommunitySection } from "@/components/home/CommunitySection";
import { CharitySection } from "@/components/home/CharitySection";
import { InstagramSection } from "@/components/home/InstagramSection";
import { Footer } from "@/components/home/Footer";
import { reportUserActivity } from "@/hooks/useRifaConfig";
import { cloakText } from "@/lib/cloaker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolada Pix — Prêmios incríveis que podem mudar seu estilo de vida" },
      { name: "description", content: "Participe da Bolada Pix e concorra a prêmios incríveis com segurança e agilidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});


function Index() {
  useEffect(() => {
    // Registra a entrada real do usuário
    reportUserActivity("entrada", { path: "/" });

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
    <div className="bolada-page">
      <Header />
      <main>
        <PrizeSection />
        <ParticipationSection />
        <FaqSection />
        <CommunitySection />
        <CharitySection />
        <InstagramSection />
      </main>
      <Footer />
    </div>
  );
}
