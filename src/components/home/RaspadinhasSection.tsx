import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Ticket } from "lucide-react";
import { cloakText } from "@/lib/cloaker";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";

interface ScratchTicket {
  id: string;
  code: string;
  prize: string;
  status: "disponivel" | "comprado";
  date?: string;
  winner?: string;
}

const INITIAL_AVAILABLE: ScratchTicket[] = [
  { id: "1", code: "0925146", prize: "R$ 3.000,00", status: "disponivel" },
  { id: "2", code: "0925760", prize: "R$ 1.000,00", status: "disponivel" },
  { id: "3", code: "0926988", prize: "R$ 50,00", status: "disponivel" },
  { id: "4", code: "0960451", prize: "R$ 50,00", status: "disponivel" },
  { id: "5", code: "0945101", prize: "R$ 50,00", status: "disponivel" },
  { id: "6", code: "0981244", prize: "R$ 500,00", status: "disponivel" },
  { id: "7", code: "0918733", prize: "R$ 250,00", status: "disponivel" },
  { id: "8", code: "0934112", prize: "R$ 100,00", status: "disponivel" },
];

const INITIAL_BOUGHT: ScratchTicket[] = [
  { id: "b1", code: "0924532", prize: "R$ 10.000,00", status: "comprado", date: "11/10/2026 12:05", winner: "Cristiane S*****" },
  { id: "b2", code: "0924839", prize: "R$ 5.000,00", status: "comprado", date: "13/10/2026 08:28", winner: "Helvacimar B******" },
  { id: "b3", code: "0925453", prize: "R$ 2.000,00", status: "comprado", date: "05/10/2026 18:22", winner: "Eliane R*********" },
  { id: "b4", code: "0955846", prize: "R$ 50,00", status: "comprado", date: "16/10/2026 14:20", winner: "Márcia P******" },
  { id: "b5", code: "0936812", prize: "R$ 50,00", status: "comprado", date: "16/10/2026 19:43", winner: "Fernanda M******" },
  { id: "b6", code: "0977123", prize: "R$ 1.000,00", status: "comprado", date: "16/10/2026 21:10", winner: "Rodrigo M*****" },
  { id: "b7", code: "0988451", prize: "R$ 500,00", status: "comprado", date: "15/10/2026 17:34", winner: "Lucas P******" },
];

export function RaspadinhasSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"todas" | "disponiveis" | "compradas">("disponiveis");
  const [visibleCount, setVisibleCount] = useState(5);
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const getFilteredList = () => {
    if (activeTab === "disponiveis") return INITIAL_AVAILABLE;
    if (activeTab === "compradas") return INITIAL_BOUGHT;
    return [...INITIAL_AVAILABLE, ...INITIAL_BOUGHT];
  };

  const list = getFilteredList();
  const displayedItems = list.slice(0, visibleCount);
  const hasMore = visibleCount < list.length;

  return (
    <section className="w-full bg-[#f4f6f8] px-4 py-4 flex flex-col gap-3">
      {/* Card Informativo de Introdução */}
      <div className="w-full bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-[#4d8227] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            ?
          </span>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 m-0">
            {cloakText("Raspadinhas dos Sonhos")}
          </h2>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed m-0">
          {cloakText("Ao adquirir seus números você pode ganhar chances de raspar e ganhar ainda mais prêmios")}
        </p>
      </div>

      {/* Card Expansível / Accordion com Filtros e Listagem */}
      <div className="w-full bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Cabeçalho do Accordion */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[#4d8227] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              ?
            </span>
            <span className="text-sm sm:text-base font-bold text-gray-900">
              {cloakText("Raspadinhas dos Sonhos")}
            </span>
          </div>

          <div className="text-gray-500">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3.5 border-t border-gray-100 pt-3">
            {/* Contador de status */}
            <span className="text-xs text-gray-500 font-medium">
              128 disponíveis / 185 totais
            </span>

            {/* Abas de Filtro: Todas | Disponíveis | Compradas */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("todas");
                  setVisibleCount(5);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "todas"
                    ? "bg-[#cbd5e1] text-gray-900 shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Todas
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("disponiveis");
                  setVisibleCount(5);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "disponiveis"
                    ? "border-2 border-[#4d8227] text-gray-900 bg-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Disponíveis
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("compradas");
                  setVisibleCount(5);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "compradas"
                    ? "bg-[#cbd5e1] text-gray-900 shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Compradas
              </button>
            </div>

            {/* Lista de Números e Prêmios */}
            <div className="flex flex-col divide-y divide-gray-100">
              {displayedItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">
                      {item.prize}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                      <span>🎫</span>
                      <span>{item.code}</span>
                    </div>

                    {item.status === "comprado" && (
                      <div className="flex flex-col text-[10px] text-gray-400 mt-0.5">
                        <span>{item.date}</span>
                        <span className="font-medium text-gray-600">{item.winner}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    {item.status === "disponivel" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const buyBtn = document.querySelector(".purchase-area button, [aria-label*='COMPRAR']");
                          if (buyBtn instanceof HTMLElement) buyBtn.click();
                          else redirectToWhatsApp("duvida_item", `Cota disponível ${item.code}`);
                        }}
                        className="px-4 py-1.5 bg-[#4d8227] hover:bg-[#437222] text-white text-xs font-bold rounded-full shadow-xs cursor-pointer active:scale-95 transition-transform"
                      >
                        Disponível
                      </button>
                    ) : (
                      <span className="px-4 py-1.5 bg-[#cbd5e1] text-gray-700 text-xs font-bold rounded-full inline-block">
                        Comprado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Botão Ver mais números */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 5)}
                className="w-full py-2 flex items-center justify-center gap-1 text-xs font-bold text-[#4d8227] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{cloakText("Ver mais números")}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
