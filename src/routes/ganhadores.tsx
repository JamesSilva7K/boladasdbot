import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import logo from "@/assets/logo.webp";
import aplicapLogo from "@/assets/aplicap.webp";
import bannerGanhadores from "@/assets/banner.webp";
import footerLogo from "@/assets/footer-logo.webp";
import grendaccLogo from "@/assets/footer-grendacc.webp";
import playcapLogo from "@/assets/playcap.webp";
import { Instagram, Search, X } from "lucide-react";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";

export const Route = createFileRoute("/ganhadores")({
  head: () => ({
    meta: [
      { title: "Ganhadores — Edição 64 Bolada Pix Raspadinhas" },
      { name: "description", content: "Conheça os nossos ganhadores da Edição 64 Bolada Pix Raspadinhas. Cotas premiadas e sorteios oficiais." },
    ],
  }),
  component: GanhadoresPage,
});

interface WinnerCard {
  id: string;
  prize: string;
  drawNumber: string;
  date: string;
  winnerName: string;
  cpf: string;
}

const WINNERS_DATA: WinnerCard[] = [
  {
    id: "1",
    prize: "COTA PREMIADA R$ 10.000,00",
    drawNumber: "924532",
    date: "11/10/2026",
    winnerName: "Cristiane S****",
    cpf: "078.***.***-**",
  },
  {
    id: "2",
    prize: "COTA PREMIADA R$ 5.000,00",
    drawNumber: "924839",
    date: "13/10/2026",
    winnerName: "Helvacimar B******",
    cpf: "015.***.***-**",
  },
  {
    id: "3",
    prize: "COTA PREMIADA R$ 2.000,00",
    drawNumber: "925453",
    date: "05/10/2026",
    winnerName: "Eliane R*********",
    cpf: "071.***.***-**",
  },
  {
    id: "4",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "928830",
    date: "15/10/2026",
    winnerName: "Ronevon F*********",
    cpf: "040.***.***-**",
  },
  {
    id: "5",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "926681",
    date: "05/10/2026",
    winnerName: "Luis M*****",
    cpf: "890.***.***-**",
  },
  {
    id: "6",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "934049",
    date: "03/10/2026",
    winnerName: "Maria S*****",
    cpf: "450.***.***-**",
  },
  {
    id: "7",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "926067",
    date: "03/10/2026",
    winnerName: "Marivete M*******",
    cpf: "000.***.***-**",
  },
  {
    id: "8",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "929137",
    date: "15/10/2026",
    winnerName: "Mariana R*********",
    cpf: "152.***.***-**",
  },
  {
    id: "9",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "931593",
    date: "14/10/2026",
    winnerName: "Rosiney G*********",
    cpf: "739.***.***-**",
  },
  {
    id: "10",
    prize: "COTA PREMIADA R$ 50,00",
    drawNumber: "933742",
    date: "14/10/2026",
    winnerName: "Aparecida M*****",
    cpf: "024.***.***-**",
  },
];

function GoldCoin({ className }: { className?: string }) {
  return (
    <div
      className={`absolute w-8 h-8 rounded-full bg-gradient-to-br from-[#ffe066] via-[#f59f00] to-[#d9480f] shadow-lg transform rotate-12 border-2 border-[#fff3bf] pointer-events-none select-none flex items-center justify-center text-[10px] font-black text-amber-950 ${className}`}
    >
      $
    </div>
  );
}

function TicketCard({ item }: { item: WinnerCard }) {
  return (
    <div className="relative bg-[#5b8def] text-white rounded-2xl shadow-sm border border-[#4878d6] flex flex-col items-center justify-center p-4 min-h-[140px] overflow-hidden select-none">
      {/* Recorte circular esquerdo */}
      <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#4878d6] shadow-inner" />
      {/* Recorte circular direito */}
      <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#4878d6] shadow-inner" />

      {/* Conteúdo do bilhete */}
      <div className="w-full flex flex-col items-center text-center z-10 px-2">
        {/* Cabeçalho da cota */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold uppercase tracking-wide">
          <span>🏷️</span>
          <span>{item.prize}</span>
        </div>

        {/* Número da sorte */}
        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
          <span className="opacity-90">Número da sorte:</span>
          <span className="bg-[#1e40af] text-white font-extrabold px-2.5 py-0.5 rounded-full text-xs font-mono tracking-wider shadow-xs">
            {item.drawNumber}
          </span>
        </div>

        {/* Linha pontilhada divisória */}
        <div className="w-full border-b border-dashed border-white/40 my-2" />

        {/* Data e Ganhador */}
        <div className="text-[11px] sm:text-xs font-medium text-white/90">
          Data: <strong className="text-white">{item.date}</strong>
        </div>
        <div className="text-[11.5px] sm:text-xs font-bold text-white mt-0.5">
          Ganhador(a): <span className="underline decoration-white/40">{item.winnerName}</span>
        </div>
        <div className="text-[10.5px] sm:text-[11px] font-mono text-white/80 mt-0.5">
          CPF: {item.cpf}
        </div>
      </div>
    </div>
  );
}

function GanhadoresPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const filteredWinners = useMemo(() => {
    if (!searchTerm.trim()) return WINNERS_DATA;
    const term = searchTerm.toLowerCase();
    return WINNERS_DATA.filter(
      (w) =>
        w.drawNumber.includes(term) ||
        w.winnerName.toLowerCase().includes(term) ||
        w.cpf.includes(term) ||
        w.prize.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
      {/* =========================================================================
          1. HEADER AZUL IDÊNTICO À IMAGEM 2
          ========================================================================= */}
      <header className="w-full bg-[#0a4bbd] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#083ea0] shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <a href="/" className="inline-flex items-center">
            <img src={logo} alt="Bolada Pix" className="h-9 sm:h-11 w-auto object-contain" />
          </a>
          <nav className="hidden md:flex items-center gap-5 text-xs sm:text-sm font-semibold">
            <a href="/" className="hover:text-amber-300 transition-colors">
              Início
            </a>
            <a
              href="/ganhadores"
              className="text-amber-300 underline font-bold transition-colors"
            >
              Ganhadores
            </a>
            <a
              href="/comprar"
              className="hover:text-amber-300 transition-colors"
            >
              Meus Números
            </a>
            <a
              href="#quem-somos"
              onClick={() => redirectToWhatsApp("quem_somos")}
              className="hover:text-amber-300 transition-colors"
            >
              Quem Somos
            </a>
            <a
              href="#contato"
              onClick={() => redirectToWhatsApp("fale_conosco")}
              className="hover:text-amber-300 transition-colors"
            >
              Fale Conosco
            </a>
            <a
              href="#edicoes"
              onClick={() => redirectToWhatsApp("edicoes_anteriores")}
              className="hover:text-amber-300 transition-colors"
            >
              Edições Anteriores
            </a>
          </nav>
        </div>

        <div className="flex items-center">
          <img
            src={aplicapLogo}
            alt="ApliCap"
            className="h-7 sm:h-9 w-auto object-contain cursor-pointer transition-transform hover:scale-105"
            onClick={() => redirectToWhatsApp("regulamento")}
          />
        </div>
      </header>

      {/* =========================================================================
          2. SEÇÃO GANHADORES COM MOEDAS E BANNER IDÊNTICO À IMAGEM 2
          ========================================================================= */}
      <section className="relative w-full bg-white pt-6 pb-4 px-4 flex flex-col items-center overflow-hidden">
        {/* Moedas douradas flutuantes */}
        <GoldCoin className="top-4 left-6 sm:left-14 rotate-[-25deg]" />
        <GoldCoin className="top-16 left-2 sm:left-8 rotate-[15deg] w-7 h-7" />
        <GoldCoin className="top-6 right-6 sm:right-14 rotate-[35deg]" />
        <GoldCoin className="top-20 right-3 sm:right-10 rotate-[-15deg] w-7 h-7" />

        {/* Título Ganhadores */}
        <h1 className="text-3xl sm:text-4xl font-black text-[#0a4bbd] tracking-tight text-center uppercase m-0">
          GANHADORES
        </h1>
        <p className="text-sm font-semibold text-[#0a4bbd] mt-1 text-center">
          Conheça os nossos ganhadores
        </p>

        {/* Banner Oficial dos Prêmios */}
        <div className="w-full max-w-5xl mt-6 rounded-2xl overflow-hidden shadow-lg border border-gray-100">
          <img
            src={bannerGanhadores}
            alt="Concorra a 30.000 em Prêmios - Bolada Pix"
            className="w-full h-auto object-cover block"
          />
        </div>
      </section>

      {/* =========================================================================
          3. EDIÇÃO 64 - COTAS PREMIADAS IDÊNTICO À IMAGEM 3
          ========================================================================= */}
      <section className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col items-center">
        {/* Link Selecionar outra edição */}
        <button
          type="button"
          onClick={() => redirectToWhatsApp("edicoes_anteriores")}
          className="text-sm font-bold text-[#0a4bbd] hover:underline cursor-pointer"
        >
          Selecionar outra edição
        </button>

        {/* Título Edição 64 */}
        <h2 className="text-2xl sm:text-3xl font-black text-[#0a4bbd] text-center mt-2 uppercase tracking-tight">
          EDIÇÃO 64 BOLADA PIX - RASPADINHAS
        </h2>
        <span className="text-sm font-medium text-gray-700 mt-1">
          Sorteio dia 04/11/2026
        </span>

        {/* Campo de Busca por Número do Bilhete */}
        <div className="w-full max-w-3xl mt-5 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite o número do bilhete"
            className="w-full h-11 sm:h-12 pl-4 pr-10 rounded-md border-2 border-[#3b82f6] text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0a4bbd] bg-white shadow-xs"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>

        {/* Seção Cotas Premiadas */}
        <div className="w-full mt-8">
          <h3 className="text-lg sm:text-xl font-black text-[#0a4bbd] uppercase tracking-wide mb-4">
            COTAS PREMIADAS
          </h3>

          {/* Grid dos bilhetes de cotas premiadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredWinners.map((winner) => (
              <TicketCard key={winner.id} item={winner} />
            ))}
          </div>

          {filteredWinners.length === 0 && (
            <div className="w-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 mt-2">
              Nenhuma cota premiada encontrada para a busca "{searchTerm}".
            </div>
          )}
        </div>

        {/* Paginação Estilizada (1, 2, 3, 4, 5, >) */}
        <div className="flex items-center justify-center gap-2 mt-10 select-none">
          {[1, 2, 3, 4, 5].map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 rounded-full border text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                currentPage === page
                  ? "border-[#0a4bbd] bg-[#0a4bbd] text-white shadow-xs"
                  : "border-[#0a4bbd] text-[#0a4bbd] bg-white hover:bg-blue-50"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(5, p + 1))}
            className="w-9 h-9 rounded-full border border-[#0a4bbd] text-[#0a4bbd] bg-white hover:bg-blue-50 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Próxima página"
          >
            &gt;
          </button>
        </div>
      </section>

      {/* =========================================================================
          4. FOOTER AZUL REAL PROFUNDO IDÊNTICO À IMAGEM 4
          ========================================================================= */}
      <footer className="w-full bg-[#0a4bbd] text-white mt-12 pt-10 pb-8 px-4 sm:px-8 border-t border-[#083ea0]">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          {/* Colunas do Rodapé */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
            {/* Coluna 1: Logo e Slogan */}
            <div className="flex flex-col items-start gap-2">
              <a href="/" className="inline-flex">
                <img src={footerLogo} alt="Bolada Pix" className="h-12 w-auto object-contain" />
              </a>
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                Prêmios incríveis, que podem<br />
                mudar o seu estilo de <strong className="text-white font-bold">vida!</strong>
              </p>
            </div>

            {/* Coluna 2: Contato */}
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-extrabold tracking-wider text-white uppercase">
                CONTATO
              </h4>
              <a
                href="#contato"
                onClick={(e) => {
                  e.preventDefault();
                  redirectToWhatsApp("fale_conosco");
                }}
                className="text-xs text-white hover:underline font-medium"
              >
                suporte@boladapix.com
              </a>
            </div>

            {/* Coluna 3: Sobre Nós */}
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-extrabold tracking-wider text-white uppercase">
                SOBRE NÓS
              </h4>
              <ul className="flex flex-col gap-1 text-xs text-white/90">
                <li>
                  <a
                    href="#quem-somos"
                    onClick={(e) => {
                      e.preventDefault();
                      redirectToWhatsApp("quem_somos");
                    }}
                    className="hover:underline"
                  >
                    Quem Somos
                  </a>
                </li>
                <li>
                  <a
                    href="#privacidade"
                    onClick={(e) => {
                      e.preventDefault();
                      redirectToWhatsApp("privacidade");
                    }}
                    className="hover:underline"
                  >
                    Política de Privacidade
                  </a>
                </li>
                <li>
                  <a
                    href="#termos"
                    onClick={(e) => {
                      e.preventDefault();
                      redirectToWhatsApp("termos");
                    }}
                    className="hover:underline"
                  >
                    Termos de Uso
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Redes Sociais */}
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-extrabold tracking-wider text-white uppercase">
                REDES SOCIAIS
              </h4>
              <a
                href="#instagram"
                onClick={(e) => {
                  e.preventDefault();
                  redirectToWhatsApp("instagram");
                }}
                aria-label="Instagram Bolada Pix"
                className="text-white hover:text-amber-300 transition-colors inline-block mt-1"
              >
                <Instagram size={28} />
              </a>
            </div>
          </div>

          {/* Logos dos Parceiros (Aplicap + Grendacc) */}
          <div className="flex items-center gap-4 pt-2">
            <img
              src={aplicapLogo}
              alt="ApliCap"
              className="h-8 w-auto object-contain cursor-pointer"
              onClick={() => redirectToWhatsApp("regulamento")}
            />
            <img
              src={grendaccLogo}
              alt="GRENDACC"
              className="h-7 w-auto object-contain cursor-pointer"
              onClick={() => redirectToWhatsApp("grendacc")}
            />
          </div>

          {/* Texto Legal SUSEP */}
          <p className="text-[10.5px] leading-relaxed text-white/80 font-normal m-0 text-justify">
            Processo SUSEP nº 15414.656983/2026-96. Título de capitalização da modalidade filantropia premiável de pagamento único emitido pela ApliCap Capitalização S/A, CNPJ: 13.122.801/0001-71. Ao adquirir este título você cede o direito de resgate à GRENDACC CNPJ: 00.797.397/0001-94, caso não haja comunicação do subscritor à sociedade de capitalização, sobre a desistência da cessão, até o dia anterior à realização do primeiro sorteio previsto no título de capitalização. Saiba mais sobre os projetos em: https://institucional.grendacc.org.br/. A aquisição implica automática adesão às Condições Gerais do Bolada Pix Título de Capitalização, as quais o subscritor declara ter tomado ciência. Sorteios lastreados em Títulos de Capitalização de modalidade incentivo consulte regulamento. É proibida a participação por menores de 18 (dezoito) anos. Telefone de Atendimento: (51) 3584-1393. Ouvidoria: 0800 642 8080. Os prêmios serão pagos em moeda corrente nacional. As condições gerais do produto podem ser consultadas no endereço eletrônico: https://www.gov.br/susep/pt-br
          </p>

          <p className="text-center text-[11px] text-white/70 italic m-0">
            Imagens meramente ilustrativas
          </p>

          {/* Linha Divisória */}
          <div className="w-full border-t border-white/20 pt-4 flex flex-col items-center gap-3">
            <span className="text-xs font-bold text-white tracking-wider">
              {new Date().getFullYear()} - BOLADA PIX
            </span>

            {/* Logo PlayCap Tech */}
            <div
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => redirectToWhatsApp("regulamento")}
            >
              <img src={playcapLogo} alt="PlayCap Tech" className="h-6 w-auto object-contain" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
