import { Button } from "@/components/ui/button";
import whatsapp from "@/assets/whatsapp.webp";

export function CommunitySection() {
  return (
    <section className="community-section">
      <div className="section-inner community-inner">
        <div>
          <h2>
            QUER MAIS CHANCES?<br />
            ENTRE <span>NA NOSSA COMUNIDADE VIP!</span>
          </h2>
          <Button asChild variant="community">
            <a href="https://tinyurl.com/grupos-bolada-pix" target="_blank" rel="noreferrer">
              ENTRAR
            </a>
          </Button>
        </div>
        <img src={whatsapp} alt="Comunidade WhatsApp" loading="lazy" />
      </div>
    </section>
  );
}
