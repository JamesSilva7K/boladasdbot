import logo from "@/assets/logo.webp";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";
import { cloakText } from "@/lib/cloaker";
import { ChevronRight } from "lucide-react";

export function ModernHeader() {
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  return (
    <header className="w-full bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
      <a href="/" className="inline-flex items-center" aria-label={cloakText("Bolada Pix")}>
        <img
          src={logo}
          alt={cloakText("Bolada Pix")}
          className="h-10 w-auto object-contain"
        />
      </a>

      <a
        href="/ganhadores"
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
        title="Consultar resultados e cotas premiadas"
      >
        <span>{cloakText("Minhas compras")}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
      </a>
    </header>
  );
}
