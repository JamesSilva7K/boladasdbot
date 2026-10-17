import { useState } from "react";
import banner from "@/assets/banner.webp";
import { useRifaConfig, reportUserActivity } from "@/hooks/useRifaConfig";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { PaymentModal } from "@/components/PaymentModal";
import { cloakText } from "@/lib/cloaker";
import { Minus, Plus } from "lucide-react";

function CameraVector() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function GoldenTicketVector() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
      <path d="M6 8h3v3H6V8zm5 0h3v3h-3V8zm5 0h2v3h-2V8zm-10 5h3v3H6v-3zm5 0h3v3h-3v-3zm5 0h2v3h-2v-3z" fill="#fef08a" />
      <circle cx="17.5" cy="12" r="1.5" fill="#a16207" />
    </svg>
  );
}

interface PlanCard {
  id: number;
  cotas: number;
  bonusText: string;
  isPopular?: boolean;
}

const MIN_COTAS = 23; // Mínimo exigido conforme gateway e tela oficial (23 cotas = R$ 15,87)

const PLANS: PlanCard[] = [
  { id: 1, cotas: 23, bonusText: "Recebe +4 Raspadinhas dos Sonhos" },
  { id: 2, cotas: 30, bonusText: "Recebe +8 Raspadinhas dos Sonhos", isPopular: true },
  { id: 3, cotas: 50, bonusText: "Recebe +10 Raspadinhas dos Sonhos" },
  { id: 4, cotas: 100, bonusText: "Recebe +20 Raspadinhas dos Sonhos" },
];

export function ModernPrizeSection() {
  const config = useRifaConfig();
  const { redirectToWhatsApp } = useWhatsAppRedirect();
  const [selectedCotas, setSelectedCotas] = useState<number>(23); // Default 23 idêntico à imagem 1
  const [minNotice, setMinNotice] = useState<string | null>(null);

  const unitPrice = config.ticketPrice || 0.69;
  const totalPrice = Number((selectedCotas * unitPrice).toFixed(2));
  const totalPriceFormatted = totalPrice.toFixed(2).replace(".", ",");

  const showMinWarning = () => {
    setMinNotice(`Compra mínima de ${MIN_COTAS} cotas (R$ ${(MIN_COTAS * unitPrice).toFixed(2).replace(".", ",")}) exigida pela adquirente.`);
    setTimeout(() => setMinNotice(null), 3500);
  };

  const handleSelectPlan = (cotas: number) => {
    setSelectedCotas(cotas);
    setMinNotice(null);
    reportUserActivity("selecao_cotas", { cotas, valor: (cotas * unitPrice).toFixed(2) });
  };

  const handleDecrement = () => {
    if (selectedCotas <= MIN_COTAS) {
      showMinWarning();
      return;
    }
    setSelectedCotas((prev) => Math.max(MIN_COTAS, prev - 1));
  };

  const handleIncrement = () => {
    setMinNotice(null);
    setSelectedCotas((prev) => prev + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (rawVal === "") {
      setSelectedCotas(MIN_COTAS);
      return;
    }
    const val = parseInt(rawVal, 10);
    if (val < MIN_COTAS) {
      setSelectedCotas(MIN_COTAS);
      showMinWarning();
    } else {
      setMinNotice(null);
      setSelectedCotas(Math.min(val, 10000));
    }
  };

  const handleBuyClick = () => {
    reportUserActivity("click_comprar", {
      cotas: selectedCotas,
      valor: totalPriceFormatted,
      plano: `${selectedCotas} números`,
    });
  };

  return (
    <section className="w-full bg-white flex flex-col" aria-label={cloakText("Sorteio Bolada Pix")}>
      {/* 1. Banner Principal */}
      <div className="w-full relative overflow-hidden">
        <img
          src={banner}
          alt={`Banner etapa ${config.edition} Bolada Pix — ${config.totalPrize}`}
          className="w-full h-auto object-cover block"
          fetchPriority="high"
        />
      </div>

      {/* 2. Barra de Informações do Sorteio e Preço Unitário */}
      <div className="w-full px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm bg-white border-b border-gray-100">
        <button
          type="button"
          onClick={() => redirectToWhatsApp("edicoes_anteriores")}
          className="text-gray-600 hover:text-gray-900 underline text-xs font-medium cursor-pointer"
        >
          {cloakText("Ver todas as datas de sorteios")}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
          <span>{cloakText("Por apenas")}</span>
          <span className="bg-gray-200 text-gray-900 font-bold px-2 py-0.5 rounded text-xs">
            R$ {unitPrice.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      {/* 3. Seção "Aumente suas chances!" */}
      <div className="w-full px-4 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm sm:text-base">
          <CameraVector />
          <span>{cloakText("Aumente suas chances!")}</span>
        </div>

        {/* Grid 2x2 com os 4 pacotes da imagem */}
        <div className="grid grid-cols-2 gap-2.5">
          {PLANS.map((plan) => {
            const isSelected = selectedCotas === plan.cotas;
            const planTotal = (plan.cotas * unitPrice).toFixed(2).replace(".", ",");

            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan.cotas)}
                className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#4d8227] bg-[#f2f8ee] shadow-2xs ring-1 ring-[#4d8227]"
                    : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                {/* Badge "Mais vendido" */}
                {plan.isPopular && (
                  <div className="absolute -top-2.5 left-3 bg-[#b91c1c] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs uppercase tracking-wide z-10">
                    <span>🔥</span>
                    <span>{cloakText("Mais vendido")}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <div className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                    {plan.cotas} {cloakText("números")}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium leading-tight">
                    <GoldenTicketVector />
                    <span>{cloakText(plan.bonusText)}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-600 font-semibold">
                  Por: <strong className="text-gray-900 font-bold text-sm">R$ {planTotal}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stepper numérico com botões [-] e [+] */}
        <div className="w-full flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleDecrement}
            className={`w-12 h-11 border rounded-lg flex items-center justify-center font-bold text-lg transition-colors cursor-pointer ${
              selectedCotas <= MIN_COTAS
                ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100"
            }`}
            aria-label="Diminuir cotas"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            type="text"
            inputMode="numeric"
            value={selectedCotas}
            onChange={handleInputChange}
            className="flex-1 h-11 border border-gray-300 rounded-lg text-center font-bold text-base text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#4d8227] focus:border-[#4d8227]"
            aria-label="Quantidade de cotas"
          />

          <button
            type="button"
            onClick={handleIncrement}
            className="w-12 h-11 border border-gray-300 rounded-lg flex items-center justify-center font-bold text-lg text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Aumentar cotas"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Notificação dinâmica de limite mínimo para o lead */}
        {minNotice && (
          <div className="w-full py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] font-semibold text-amber-800 text-center animate-fadeIn">
            {minNotice}
          </div>
        )}

        {/* Barra de Ação / Compra */}
        <div className="w-full bg-white pt-2 pb-1 flex items-center justify-between border-t border-gray-100 mt-1">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase font-bold text-gray-500 tracking-wider">
              {selectedCotas} {cloakText("Números")}
            </span>
            <span className="text-xl sm:text-2xl font-black text-gray-900 leading-none">
              R$ {totalPriceFormatted}
            </span>
          </div>

          <PaymentModal
            selectedCotas={selectedCotas}
            totalPrice={totalPrice}
            onModalOpen={handleBuyClick}
          >
            <button
              type="button"
              className="px-8 py-3 bg-[#4d8227] hover:bg-[#437222] text-white font-black text-sm sm:text-base rounded-md shadow-xs active:scale-98 transition-all uppercase tracking-wider cursor-pointer"
            >
              {cloakText("COMPRAR")}
            </button>
          </PaymentModal>
        </div>
      </div>
    </section>
  );
}
