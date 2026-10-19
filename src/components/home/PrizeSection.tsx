import { Button } from "@/components/ui/button";
import banner from "@/assets/banner.webp";
import { conditions, regulation } from "@/lib/constants";
import { PaymentModal } from "@/components/PaymentModal";
import { useRifaConfig, reportUserActivity } from "@/hooks/useRifaConfig";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";
import { getLeadCheckoutUrl } from "@/lib/crypto-routes";

export function PrizeSection() {
  const config = useRifaConfig();
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const handleBuyClick = () => {
    reportUserActivity("click_comprar", {
      edition: config.edition,
      price: config.ticketPrice,
    });
  };

  const handleLegalClick = (e: React.MouseEvent, type: "condicoes_gerais" | "regulamento") => {
    e.preventDefault();
    redirectToWhatsApp(type);
  };

  return (
    <section className="prize-section" aria-label={cloakText("Sorteio Bolada Pix")}>
      <img
        className="prize-banner"
        src={banner}
        alt={`Banner da etapa ${config.edition} Bolada Pix — R$ ${config.ticketPrice.toFixed(2).replace(".", ",")} — ${config.totalPrize}`}
        fetchPriority="high"
      />
      <div className="purchase-area">
        <a href={getLeadCheckoutUrl("/comprar")} onClick={handleBuyClick} className="w-full">
          <Button variant="purchase">COMPRAR</Button>
        </a>
        <div className="draw-information">
          <p>
            {cloakText("Sorteio dia")}<br />
            <strong>{config.drawDate} {config.drawTime}</strong>
          </p>
          <p>
            {cloakText("O sorteio será realizado")}<br />
            <strong>{cloakText(config.lotteryMethod)}</strong>
          </p>
        </div>
        <div className="legal-links">
          <a
            href="#condicoes"
            onClick={(e) => handleLegalClick(e, "condicoes_gerais")}
          >
            Condições Gerais
          </a>
          <a
            href="#regulamento"
            onClick={(e) => handleLegalClick(e, "regulamento")}
          >
            Regulamento
          </a>
        </div>
      </div>
    </section>
  );
}
