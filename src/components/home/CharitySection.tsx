import grendaccPhoto from "@/assets/grendacc-photo.webp";
import grendacc from "@/assets/grendacc.webp";

export function CharitySection() {
  return (
    <section className="charity-section" id="quem-somos">
      <div className="section-inner">
        <h2>
          <strong>BOLADA PIX</strong> <span>É SEGURO</span>
        </h2>
        <div className="charity-inner">
          <img
            className="charity-photo"
            src={grendaccPhoto}
            alt="GRENDACC — Em defesa da criança com câncer"
            loading="lazy"
          />
          <div className="charity-copy">
            <img src={grendacc} alt="GRENDACC" loading="lazy" />
            <p>
              Em defesa da Criança com Câncer, a GRENDACC garante um tratamento
              gratuito digno, além de qualidade de vida não só para as crianças e
              adolescentes com câncer, como também para os portadores de doenças
              hematológicas, e reúne no mesmo local, especialistas em ortopedia,
              neurologia, nefrologia, oncologia e cardiologia.
            </p>
            <p>
              <strong>
                Junte-se a nós nesta causa, que visa a luta social no combate ao
                câncer.
              </strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
