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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolada Pix — Prêmios incríveis" },
      {
        name: "description",
        content:
          "Concorra a 300 mil reais na sua conta com Bolada Pix. Sorteio pela Loteria Federal. Confira as condições e participe.",
      },
      { property: "og:title", content: "Bolada Pix — Prêmios incríveis" },
      {
        property: "og:description",
        content:
          "Concorra a 300 mil reais na sua conta. Confira o sorteio Bolada Pix e as condições de participação.",
      },
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

    const handleBeforeUnload = () => {
      reportUserActivity("saida");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
