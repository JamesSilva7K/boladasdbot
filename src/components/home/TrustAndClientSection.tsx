import { useState, useEffect } from "react";
import { ShieldCheck, Search, ChevronRight } from "lucide-react";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";
import aplicapLogo from "@/assets/aplicap.webp";
import boladaLogo from "@/assets/logo.webp";
import grendaccLogo from "@/assets/grendacc.webp";

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
    <section className="w-full bg-[#f4f6f8] px-4 py-4 flex flex-col gap-6">
      {/* 1. Compra segura e transparente */}
      <div className="w-full flex flex-col gap-3">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0">
          {cloakText("Compra segura e transparente")}
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {guarantees.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-3.5 border border-gray-200/80 shadow-xs flex flex-col gap-2 justify-center"
            >
              <div className="w-6 h-6 rounded-full bg-[#eef7ea] text-[#4d8227] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#4d8227]" />
              </div>
              <span className="text-xs font-semibold text-gray-800 leading-snug">
                {cloakText(item.title)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Área do cliente */}
      <div className="w-full flex flex-col gap-3">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0">
          {cloakText("Área do cliente")}
        </h2>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => redirectToWhatsApp("meus_numeros")}
            className="w-full bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">
                {cloakText("Minhas compras")}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={() => redirectToWhatsApp("comunidade_vip")}
            className="w-full bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">💬</span>
              <span className="text-sm font-semibold text-gray-800">
                {cloakText("Grupo VIP")}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 3. Banner de Consentimento de Cookies */}
      {!cookieAccepted && (
        <div className="w-full bg-white rounded-xl p-3.5 border border-gray-200/80 shadow-xs flex items-center justify-between gap-3 text-xs text-gray-600">
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
      <div className="w-full flex items-center justify-center gap-8 py-3 opacity-90">
        <img
          src={aplicapLogo}
          alt="ApliCap"
          className="h-7 w-auto object-contain cursor-pointer"
          onClick={() => redirectToWhatsApp("regulamento")}
        />
        <img
          src={boladaLogo}
          alt={cloakText("Bolada Pix")}
          className="h-8 w-auto object-contain"
        />
        <img
          src={grendaccLogo}
          alt="GRENDACC"
          className="h-7 w-auto object-contain cursor-pointer"
          onClick={() => redirectToWhatsApp("grendacc")}
        />
      </div>

      {/* 5. Texto Legal SUSEP */}
      <div className="w-full text-center text-[10px] text-gray-500 leading-relaxed px-2 pb-6">
        <p className="m-0">
          Processo SUSEP nº 15414.656983/2026-96. Título de capitalização da modalidade filantropia premiável de pagamento único emitido pela ApliCap Capitalização S/A, CNPJ: 13.122.801/0001-71. Ao adquirir este título você cede o direito de resgate à GRENDACC CNPJ: 00.797.397/0001-94, caso não haja comunicação do subscritor à sociedade de capitalização, sobre a desistência da cessão, até o dia anterior à realização do primeiro sorteio previsto no título de capitalização. Saiba mais sobre os projetos em: https://institucional.grendacc.org.br/ A aquisição implica automática adesão às Condições Gerais do Bolada Pix Título de Capitalização, as quais o subscritor declara ter tomado ciência. Sorteios lastreados em Títulos de Capitalização de modalidade incentivo consulte regulamento. É proibida a participação por menores de 18 (dezoito) anos. Telefone de Atendimento: (51) 3534-1390. Ouvidoria: 0800 642 8080. Os prêmios serão pagos em moeda corrente nacional. As condições gerais do produto podem ser consultadas no endereço eletrônico: https://www.gov.br/susep/pt-br
        </p>
      </div>
    </section>
  );
}
