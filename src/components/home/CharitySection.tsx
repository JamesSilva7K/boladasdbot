import grendaccPhoto from "@/assets/grendacc-photo.webp";
import grendacc from "@/assets/grendacc.webp";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";

export function CharitySection() {
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const handleCharityClick = () => {
    redirectToWhatsApp("grendacc");
  };

  return (
    <section className="charity-section" id="quem-somos">
      <div className="section-inner">
        <h2>
          <strong>BOLADA PIX</strong> <span>É SEGURO</span>
        </h2>
        <div className="charity-inner">
          <img
            className="charity-photo cursor-pointer"
            src={grendaccPhoto}
            alt="GRENDACC — Em defesa da criança com câncer"
            loading="lazy"
            onClick={handleCharityClick}
          />
          <div className="charity-copy flex flex-col items-center text-center">
            <img
              src={grendacc}
              alt="GRENDACC"
              loading="lazy"
              className="cursor-pointer mx-auto block mb-4"
              onClick={handleCharityClick}
            />
            <p className="text-center">

              Em defesa da Criança com Câncer, a GRENDACC garante um tratamento
              gratuito digno, além de qualidade de vida não só para as crianças e
              adolescentes com câncer, como também para os portadores de doenças
              hematológicas, e reúne no mesmo local, especialistas em ortopedia,
              neurologia, nefrologia, oncologia e cardiologia.
            </p>
            <p>
              <strong
                className="cursor-pointer hover:underline text-[#518b2b]"
                onClick={handleCharityClick}
              >
                Junte-se a nós nesta causa, que visa a luta social no combate ao
                câncer →
              </strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
