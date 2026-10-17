import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";
import aplicap from "@/assets/aplicap.webp";
import { navigation } from "@/lib/constants";
import { useWhatsAppRedirect, type WhatsAppActionType } from "@/hooks/useWhatsAppRedirect";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const handleNavClick = (e: React.MouseEvent, label: string) => {
    if (label === "Início") {
      setMenuOpen(false);
      return;
    }

    e.preventDefault();
    setMenuOpen(false);

    const mapping: Record<string, WhatsAppActionType> = {
      Ganhadores: "ganhadores",
      "Meus Números": "meus_numeros",
      "Quem Somos": "quem_somos",
      "Fale Conosco": "fale_conosco",
      "Edições Anteriores": "edicoes_anteriores",
    };

    redirectToWhatsApp(mapping[label] || "default");
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="/" aria-label="Bolada Pix — Início">
          <img className="header-logo" src={logo} alt="Bolada Pix" />
        </a>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Menu principal">
          {navigation.map(([label, href], index) => (
            <a
              key={label}
              className={index === 0 ? "active" : undefined}
              href={href}
              onClick={(e) => handleNavClick(e, label)}
            >
              {label}
            </a>
          ))}
        </nav>
        <img className="header-aplicap" src={aplicap} alt="ApliCap" />
        <Button
          variant="navigation"
          size="icon"
          className="mobile-menu"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </div>
    </header>
  );
}
