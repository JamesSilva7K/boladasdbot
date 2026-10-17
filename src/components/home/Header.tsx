import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";
import aplicap from "@/assets/aplicap.webp";
import { navigation } from "@/lib/constants";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
              onClick={() => setMenuOpen(false)}
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
