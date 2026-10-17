import { useState, useEffect } from "react";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";
import aplicapLogo from "@/assets/aplicap.webp";
import boladaLogo from "@/assets/logo.webp";
import grendaccLogo from "@/assets/grendacc.webp";
import playcapLogo from "@/assets/playcap.webp";

function ShieldCheckVector() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#4d8227"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#eef7ea"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="#4d8227"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchVector() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function WhatsAppVector() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M17.472 14.382c-.301-.15-1.78-.877-2.056-.977-.275-.101-.475-.15-.675.15-.2.301-.775.977-.95 1.177-.175.2-.351.226-.651.075-.301-.15-1.27-.468-2.42-1.493-.894-.798-1.498-1.784-1.674-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.451-.526.15-.175.2-.301.3-.501.1-.2.05-.376-.025-.526-.075-.15-.676-1.63-.926-2.231-.244-.587-.492-.507-.676-.516l-.576-.01c-.2 0-.525.075-.8.376-.275.301-1.05 1.027-1.05 2.506 0 1.479 1.076 2.907 1.226 3.108.15.2 2.116 3.232 5.127 4.533.716.31 1.275.495 1.71.634.719.229 1.374.197 1.892.12.577-.087 1.78-.727 2.03-1.429.251-.702.251-1.303.176-1.429-.076-.125-.276-.201-.576-.351z"
        fill="#25D366"
      />
      <path
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"
        fill="#25D366"
      />
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
              className="bg-white rounded-xl p-3.5 border border-gray-200/80 shadow-2xs flex flex-col gap-2 justify-center"
            >
              <div className="w-6 h-6 rounded-full bg-[#eef7ea] flex items-center justify-center">
                <ShieldCheckVector />
              </div>
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
          <button
            type="button"
            onClick={() => redirectToWhatsApp("meus_numeros")}
            className="w-full bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <SearchVector />
              <span className="text-sm font-semibold text-gray-800">
                {cloakText("Minhas compras")}
              </span>
            </div>
            <ChevronRightVector />
          </button>

          <button
            type="button"
            onClick={() => redirectToWhatsApp("comunidade_vip")}
            className="w-full bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <WhatsAppVector />
              <span className="text-sm font-semibold text-gray-800">
                {cloakText("Grupo VIP")}
              </span>
            </div>
            <ChevronRightVector />
          </button>
        </div>
      </div>

      {/* 3. Banner de Consentimento de Cookies */}
      {!cookieAccepted && (
        <div className="w-full bg-white rounded-xl p-3.5 border border-gray-200/80 shadow-2xs flex items-center justify-between gap-3 text-xs text-gray-600">
          <span>
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
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-800 hover:bg-gray-100 cursor-pointer shadow-2xs"
          >
            Ok
          </button>
        </div>
      )}

      {/* 4. Logos dos Parceiros */}
      <div className="w-full flex items-center justify-center gap-6 py-2 opacity-90">
        <img
          src={aplicapLogo}
          alt="ApliCap"
          className="h-6 w-auto object-contain cursor-pointer"
          onClick={() => redirectToWhatsApp("regulamento")}
        />
        <img
          src={boladaLogo}
          alt={cloakText("Bolada Pix")}
          className="h-7 w-auto object-contain"
        />
        <img
          src={grendaccLogo}
          alt="GRENDACC"
          className="h-6 w-auto object-contain cursor-pointer"
          onClick={() => redirectToWhatsApp("grendacc")}
        />
      </div>

      {/* 5. Texto Legal SUSEP */}
      <div className="w-full text-center text-[10px] text-gray-500 leading-relaxed px-2">
        <p className="m-0">
          Processo SUSEP nº 15414.656983/2026-96. Título de capitalização da modalidade filantropia premiável de pagamento único emitido pela ApliCap Capitalização S/A, CNPJ: 13.122.801/0001-71. Ao adquirir este título você cede o direito de resgate à GRENDACC CNPJ: 00.797.397/0001-94, caso não haja comunicação do subscritor à sociedade de capitalização, sobre a desistência da cessão, até o dia anterior à realização do primeiro sorteio previsto no título de capitalização. Saiba mais sobre os projetos em: https://institucional.grendacc.org.br/ A aquisição implica automática adesão às Condições Gerais do Bolada Pix Título de Capitalização, as quais o subscritor declara ter tomado ciência. Sorteios lastreados em Títulos de Capitalização de modalidade incentivo consulte regulamento. É proibida a participação por menores de 18 (dezoito) anos. Telefone de Atendimento: (51) 3584-1393. Ouvidoria: 0800 642 8080. Os prêmios serão pagos em moeda corrente nacional. As condições gerais do produto podem ser consultadas no endereço eletrônico: https://www.gov.br/susep/pt-br
        </p>
      </div>

      {/* 6. Links de Condições e Regulamento + Logo PlayCap + Versão (Imagem 4) */}
      <div className="w-full flex flex-col items-center gap-2 pt-1 pb-4 text-center">
        <span className="text-[11px] text-gray-500 font-medium">
          Consulte nossas Condições gerais e Regulamento
        </span>
        <div className="flex items-center gap-4 text-xs font-semibold text-gray-700">
          <a
            href="#condicoes"
            onClick={(e) => {
              e.preventDefault();
              redirectToWhatsApp("condicoes_gerais");
            }}
            className="underline hover:text-gray-900"
          >
            Condições gerais
          </a>
          <a
            href="#regulamento"
            onClick={(e) => {
              e.preventDefault();
              redirectToWhatsApp("regulamento");
            }}
            className="underline hover:text-gray-900"
          >
            Regulamento
          </a>
        </div>

        <div className="mt-3 flex flex-col items-center gap-1">
          <img
            src={playcapLogo}
            alt="PlayCap"
            className="h-5 w-auto object-contain opacity-75 cursor-pointer"
            onClick={() => redirectToWhatsApp("regulamento")}
          />
          <span className="text-[10px] text-gray-400 font-mono">
            v0.2.491-2
          </span>
        </div>
      </div>
    </section>
  );
}
