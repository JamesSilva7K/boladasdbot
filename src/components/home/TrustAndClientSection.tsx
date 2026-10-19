import { useState, useEffect } from "react";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";
import aplicapLogo from "@/assets/aplicap.webp";
import boladaLogo from "@/assets/logo.webp";
import grendaccLogo from "@/assets/grendacc.webp";
import playcapLogo from "@/assets/playcap.webp";

function ShieldCheckVector() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4d8227" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function UserTicketVector() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronRightVector() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function TrustAndClientSection() {
  const { redirectToWhatsApp } = useWhatsAppRedirect();
  const [cookieAccepted, setCookieAccepted] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem("bolada_cookie_consent");
    if (!consent) {
      setCookieAccepted(false);
    }
  }, []);

  const handleAcceptCookie = () => {
    localStorage.setItem("bolada_cookie_consent", "true");
    setCookieAccepted(true);
  };

  const guarantees = [
    { id: 1, title: "Sorteio regulamentado" },
    { id: 2, title: "Sorteio com Transmissão ao vivo" },
    { id: 3, title: "Processo nº 15414.656983/2026-96." },
    { id: 4, title: "Suporte humano disponível" },
  ];

  return (
    <>
      <section className="w-full bg-[#f4f6f8] px-4 py-4 flex flex-col gap-5">
      {/* 1. Compra segura e transparente */}
      <div className="w-full flex flex-col gap-2.5">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0">
          {cloakText("Compra segura e transparente")}
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {guarantees.map((item) => (
            <div
              key={item.id}
              className="bg-[#f8fafc] rounded-xl p-3.5 border border-gray-100/80 shadow-2xs flex flex-col gap-2 justify-center"
            >
              <ShieldCheckVector />
              <span className="text-xs font-semibold text-gray-800 leading-snug">
                {cloakText(item.title)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Área do cliente */}
      <div className="w-full flex flex-col gap-2.5">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0">
          {cloakText("Área do cliente")}
        </h2>

        <div className="flex flex-col gap-2.5">
          <a
            href="/ganhadores"
            className="w-full bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <UserTicketVector />
              <span className="text-sm font-semibold text-gray-800">
                {cloakText("Minhas compras / Ver Resultados")}
              </span>
            </div>
            <ChevronRightVector />
          </a>
        </div>
      </div>

      {/* 3. Banner de Consentimento de Cookies */}
      {/* 3. Banner de Consentimento de Cookies */}
      {!cookieAccepted && (
        <div className="w-full bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs flex items-center justify-between gap-3 text-[11px] sm:text-xs text-gray-700">
          <span className="leading-snug">
            {cloakText("Ao navegar em nosso site, você concorda com nosso uso de cookies. Confira em ")}
            <a
              href="#privacidade"
              onClick={(e) => {
                e.preventDefault();
                redirectToWhatsApp("privacidade");
              }}
              className="text-gray-900 underline font-medium"
            >
              Política de Privacidade
            </a>
          </span>
          <button
            type="button"
            onClick={handleAcceptCookie}
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer shadow-2xs shrink-0"
          >
            Ok
          </button>
        </div>
      )}
    </section>

    {/* 4. Rodapé Oficial / Identidade Visual (Idêntico à Imagem 1) */}
    <footer className="w-full bg-white px-4 pt-4 pb-8 flex flex-col gap-4 border-t border-gray-100">
      {/* Logos dos Parceiros */}
      <div className="w-full flex items-center justify-center gap-8 py-1">
        <img
          src={aplicapLogo}
          alt="ApliCap"
          className="h-7 sm:h-8 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
          onClick={() => redirectToWhatsApp("regulamento")}
        />
        <img
          src={boladaLogo}
          alt={cloakText("Bolada Pix")}
          className="h-8 sm:h-9 w-auto object-contain"
        />
        <img
          src={grendaccLogo}
          alt="GRENDACC"
          className="h-7 sm:h-8 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
          onClick={() => redirectToWhatsApp("grendacc")}
        />
      </div>

      {/* Texto Legal SUSEP com alto contraste e nitidez */}
      <div className="w-full text-center text-[10.5px] sm:text-[11px] text-gray-800 leading-relaxed px-2 font-normal">
        <p className="m-0">
          Processo SUSEP nº 15414.656983/2026-96. Título de capitalização da modalidade filantropia premiável de pagamento único emitido pela ApliCap Capitalização S/A, CNPJ: 13.122.801/0001-71. Ao adquirir este título você cede o direito de resgate à GRENDACC CNPJ: 00.797.397/0001-94, caso não haja comunicação do subscritor à sociedade de capitalização, sobre a desistência da cessão, até o dia anterior à realização do primeiro sorteio previsto no título de capitalização. Saiba mais sobre os projetos em: https://institucional.grendacc.org.br/ A aquisição implica automática adesão às Condições Gerais do Bolada Pix Título de Capitalização, as quais o subscritor declara ter tomado ciência. Sorteios lastreados em Títulos de Capitalização de modalidade incentivo consulte regulamento. É proibida a participação por menores de 18 (dezoito) anos. Telefone de Atendimento: (51) 3584-1393. Ouvidoria: 0800 642 8080. Os prêmios serão pagos em moeda corrente nacional. As condições gerais do produto podem ser consultadas no endereço eletrônico: https://www.gov.br/susep/pt-br
        </p>
      </div>

      {/* Links de Condições e Regulamento + Logo PlayCap + Versão */}
      <div className="w-full flex flex-col items-center gap-2 pt-1 text-center">
        <span className="text-[11.5px] sm:text-xs text-gray-800 font-semibold">
          Consulte nossas Condições gerais e Regulamento
        </span>
        <div className="flex items-center gap-5 text-xs font-semibold text-gray-900">
          <a
            href="#condicoes"
            onClick={(e) => {
              e.preventDefault();
              redirectToWhatsApp("condicoes_gerais");
            }}
            className="underline hover:text-[#4d8227]"
          >
            Condições gerais
          </a>
          <a
            href="#regulamento"
            onClick={(e) => {
              e.preventDefault();
              redirectToWhatsApp("regulamento");
            }}
            className="underline hover:text-[#4d8227]"
          >
            Regulamento
          </a>
        </div>

        <div className="mt-2.5 flex flex-col items-center gap-1">
          <img
            src={playcapLogo}
            alt="PlayCap"
            className="h-6 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
            onClick={() => redirectToWhatsApp("regulamento")}
          />
          <span className="text-[11px] text-gray-600 font-mono font-medium">
            v0.2.491-2
          </span>
        </div>
      </div>
    </footer>
    </>
  );
}
