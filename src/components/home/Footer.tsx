import { Instagram } from "lucide-react";
import footerLogo from "@/assets/footer-logo.webp";
import aplicap from "@/assets/aplicap.webp";
import grendacc from "@/assets/grendacc.webp";
import playcap from "@/assets/playcap.webp";
import { instagram } from "@/lib/constants";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";

export function Footer() {
  const { whatsappUrl, redirectToWhatsApp } = useWhatsAppRedirect();

  const handleActionClick = (e: React.MouseEvent, actionType: string) => {
    e.preventDefault();
    const messages: Record<string, string> = {
      contato: "Olá! Gostaria de falar com o suporte do Bolada Pix.",
      quemSomos: "Olá! Gostaria de mais informações sobre quem somos e os sorteios do Bolada Pix.",
      privacidade: "Olá! Gostaria de tirar dúvidas sobre a Política de Privacidade do Bolada Pix.",
      termos: "Olá! Gostaria de tirar dúvidas sobre os Termos de Uso do Bolada Pix.",
    };
    redirectToWhatsApp(messages[actionType] || "Olá! Vim através do site Bolada Pix.");
  };

  return (
    <footer className="site-footer" id="contato">
      <div className="section-inner footer-inner">
        <div className="footer-columns">
          <div className="footer-brand">
            <a href="/">
              <img src={footerLogo} alt="Bolada Pix" />
            </a>
            <p>
              <strong>Prêmios incríveis</strong>, que podem<br />
              mudar o seu <strong>estilo de vida!</strong>
            </p>
          </div>

          <div className="footer-col">
            <h3>CONTATO</h3>
            <a
              href={whatsappUrl}
              onClick={(e) => handleActionClick(e, "contato")}
              className="footer-whatsapp-link"
              title="Fale conosco diretamente via WhatsApp"
            >
              suporte@boladapix.com
            </a>
          </div>

          <div className="footer-col">
            <h3>SOBRE NÓS</h3>
            <ul className="footer-links-list">
              <li>
                <a
                  href={whatsappUrl}
                  onClick={(e) => handleActionClick(e, "quemSomos")}
                  className="footer-whatsapp-link"
                >
                  Quem Somos
                </a>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  onClick={(e) => handleActionClick(e, "privacidade")}
                  className="footer-whatsapp-link"
                >
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  onClick={(e) => handleActionClick(e, "termos")}
                  className="footer-whatsapp-link"
                >
                  Termos de Uso
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h3>REDES SOCIAIS</h3>
            <a
              href={instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram Bolada Pix"
              className="footer-social-icon"
            >
              <Instagram size={28} />
            </a>
          </div>
        </div>

        <div className="footer-legal-block">
          <div className="footer-partners">
            <img src={aplicap} alt="ApliCap" />
            <img src={grendacc} alt="GRENDACC" />
          </div>
          <p className="footer-legal-text">
            Processo SUSEP nº 15414.650303/2023-90. Título de capitalização da modalidade filantropia premiável de pagamento único emitido pela ApliCap Capitalização S/A, CNPJ: 13.122.801/0001-71. Ao adquirir este título você cede o direito de resgate à GRENDACC CNPJ: 00.797.397/0001-94, caso não haja comunicação do subscritor à sociedade de capitalização, sobre a desistência da cessão, até o dia anterior à realização do primeiro sorteio previsto no título de capitalização. Saiba mais sobre os projetos em: https://institucional.grendacc.org.br/ A aquisição implica automática adesão às Condições Gerais do Bolada Pix Título de Capitalização, as quais o subscritor declara ter tomado ciência. Sorteios lastreados em Títulos de Capitalização de modalidade incentivo consulte regulamento. É proibida a participação por menores de 18 (dezoito) anos. Telefone de Atendimento: (51) 3534-1390. Ouvidoria: 0800 642 8080. Os prêmios serão pagos em moeda corrente nacional. As condições gerais do produto podem ser consultadas no endereço eletrônico: https://www.gov.br/susep/pt-br
          </p>
        </div>

        <p className="illustration-note">Imagens meramente ilustrativas</p>
        <div className="copyright">{new Date().getFullYear()} - BOLADA PIX</div>
        <a
          className="playcap-logo"
          href="https://playcaptech.com.br/"
          target="_blank"
          rel="noreferrer"
        >
          <img src={playcap} alt="PlayCapTech" loading="lazy" />
        </a>
      </div>
    </footer>
  );
}
