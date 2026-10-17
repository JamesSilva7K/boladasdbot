import { Button } from "@/components/ui/button";
import whatsapp from "@/assets/whatsapp.webp";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";

export function CommunitySection() {
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    redirectToWhatsApp("comunidade_vip");
  };

  return (
    <section className="community-section">
      <div className="section-inner community-inner">
        <div>
          <h2>
            QUER MAIS CHANCES?<br />
            ENTRE <span>NA NOSSA COMUNIDADE VIP!</span>
          </h2>
          <Button variant="community" onClick={handleJoinClick}>
            ENTRAR
          </Button>
        </div>
        <img src={whatsapp} alt="Comunidade WhatsApp" loading="lazy" />
      </div>
    </section>
  );
}
