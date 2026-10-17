import { Button } from "@/components/ui/button";
import banner from "@/assets/banner.webp";
import { conditions, regulation } from "@/lib/constants";
import { PaymentModal } from "@/components/PaymentModal";
import { useRifaConfig, reportUserActivity } from "@/hooks/useRifaConfig";

export function PrizeSection() {
  const config = useRifaConfig();

  const handleBuyClick = () => {
    reportUserActivity("click_comprar", {
      edition: config.edition,
      price: config.ticketPrice,
    });
  };

  return (
    <section className="prize-section" aria-label="Sorteio Bolada Pix">
      <img
        className="prize-banner"
        src={banner}
        alt={`Banner da etapa ${config.edition} Bolada Pix — R$ ${config.ticketPrice.toFixed(2).replace(".", ",")} — ${config.totalPrize}`}
        fetchPriority="high"
      />
      <div className="purchase-area">
        <PaymentModal onModalOpen={handleBuyClick}>
          <Button variant="purchase">COMPRAR</Button>
        </PaymentModal>
        <div className="draw-information">
          <p>
            Sorteio dia<br />
            <strong>{config.drawDate} {config.drawTime}</strong>
          </p>
          <p>
            O sorteio será realizado<br />
            <strong>{config.lotteryMethod}</strong>
          </p>
        </div>
        <div className="legal-links">
          <a href={conditions} target="_blank" rel="noreferrer">
            Condições Gerais
          </a>
          <a href={regulation} target="_blank" rel="noreferrer">
            Regulamento
          </a>
        </div>
      </div>
    </section>
  );
}
