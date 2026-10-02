import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import SearchDialog from "./SearchDialog";
import { usePlayer } from "@/context/PlayerContext";

const LINKS = [
  { to: "/", label: "Inicio", id: "inicio" },
  { to: "/canciones", label: "Canciones", id: "canciones" },
  { to: "/canciones/corneta", label: "Corneta", id: "corneta" },
  { to: "/audios", label: "Audios", id: "audios" },
  { to: "/lemas", label: "Lemas", id: "lemas" },
  { to: "/enlaces", label: "Enlaces", id: "enlaces" },
  { to: "/libro-de-visitas", label: "Libro de Visitas", id: "libro" },
  { to: "/contacto", label: "Contacto", id: "contacto" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { track, playing } = usePlayer();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-olive-600/60 bg-obsidian/90 backdrop-blur-md" data-testid="site-header">
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-3" data-testid="brand-link" onClick={() => setOpen(false)}>
          <img
            src="/assets/img/logo-apl.png"
            alt="A Paso Ligero — corneta y laurel"
            className="h-11 w-11 object-contain transition-transform duration-300 group-hover:scale-105"
            data-testid="brand-logo"
          />
          <span className="leading-none whitespace-nowrap">
            <span className="block font-display text-xl font-extrabold uppercase tracking-wide text-parchment group-hover:text-brass transition-colors">
              A Paso Ligero
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-khaki sm:block">
              .com · músicas militares
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-4 xl:flex 2xl:gap-5" data-testid="main-nav">
          {LINKS.map((l) => (
            <NavLink
              key={l.id}
              to={l.to}
              end={l.to === "/"}
              data-testid={`nav-link-${l.id}`}
              className={({ isActive }) =>
                `relative whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.18em] transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:bg-brass after:transition-all after:duration-300 ${
                  isActive ? "text-brass after:w-full" : "text-sage hover:text-parchment after:w-0 hover:after:w-full"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar en el archivo"
            data-testid="header-search-button"
            className="group flex h-9 items-center gap-2 border border-olive-600 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-sage transition-colors hover:border-brass hover:text-brass"
          >
            <Search size={14} />
            <span className="hidden md:inline xl:hidden 2xl:inline">Buscar</span>
            <kbd className="hidden border border-olive-600 px-1 py-px text-[9px] text-khaki group-hover:border-brass/50 lg:inline xl:hidden 2xl:inline">⌘K</kbd>
          </button>
          {track && (
            <div className="hidden items-center gap-2 border border-olive-600 bg-olive-950 px-3 py-1.5 xl:flex" data-testid="nav-playing-pill">
              <span className={`h-1.5 w-1.5 ${playing ? "bg-green-500 led-pulse" : "bg-brass"}`} />
              <span className="max-w-[140px] truncate font-mono text-[10px] uppercase tracking-widest text-sage">
                {track.title}
              </span>
            </div>
          )}
          <Link
            to="/contacto"
            data-testid="aporten-cta"
            className="hidden border border-brass/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-brass transition-colors hover:bg-brass hover:text-obsidian sm:block"
          >
            ¡Aporten!
          </Link>
          <button
            className="text-parchment xl:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            data-testid="mobile-menu-toggle"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" className="border-t border-olive-600/60 bg-olive-950 px-4 py-4 xl:hidden" data-testid="mobile-nav">
          <div className="grid gap-1">
            {LINKS.map((l, i) => (
              <NavLink
                key={l.id}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                data-testid={`mobile-nav-link-${l.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-2 px-3 py-2.5 font-mono text-xs uppercase tracking-[0.18em] ${
                    isActive ? "border-brass text-brass" : "border-transparent text-sage"
                  }`
                }
              >
                <span className="text-khaki">{String(i + 1).padStart(2, "0")}</span>
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
