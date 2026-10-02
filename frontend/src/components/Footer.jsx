import { Link } from "react-router-dom";
import { IS_STATIC } from "@/lib/static";

export default function Footer() {
  return (
    <footer className="border-t border-olive-600/60 bg-olive-950" data-testid="site-footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src="/assets/img/logo-apl.png" alt="" className="h-8 w-8 object-contain" data-testid="footer-logo" />
            <span className="font-display text-lg font-extrabold uppercase tracking-wide">A Paso Ligero .com</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-sage">
            Web de músicas militares. Canciones de paso ligero, himnos, toques de corneta, lemas de unidades y
            otras curiosidades de las Fuerzas Armadas Españolas.
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-khaki">Índice</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ["/", "Home"],
              ["/canciones", "Canciones"],
              ["/canciones/himnos", "Himnos"],
              ["/canciones/corneta", "Toques de Corneta"],
              ["/audios", "Archivo de Audio"],
              ["/lemas", "Lemas"],
              ["/libro-de-visitas", "Libro de Visitas"],
              ["/enlaces", "Enlaces"],
              ["/contacto", "Contacto"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="text-sage transition-colors hover:text-brass" data-testid={`footer-link-${label.toLowerCase().replace(/ /g, "-")}`}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-khaki">Colabora</p>
          <p className="mt-4 text-sm leading-relaxed text-sage">
            Este espacio es de todos. Envíe sus canciones y aportaciones a través de la página de contacto.
          </p>
          <Link
            to="/contacto"
            data-testid="footer-aporten-btn"
            className="mt-4 inline-block border border-brass/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-brass transition-colors hover:bg-brass hover:text-obsidian"
          >
            ¡Aporten!
          </Link>
        </div>
      </div>
      <div className="border-t border-olive-600/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 font-mono text-[10px] uppercase tracking-[0.15em] text-khaki sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>A Paso Ligero .com · Por: Álvar Barrios Martínez · ©®™{!IS_STATIC && <> · <Link to="/admin" className="hover:text-brass" data-testid="footer-admin-link">Acceso autor</Link></>}</span>
          <span className="normal-case tracking-normal text-khaki/80">
            "Si vas a copiar algo, por favor, cita el origen =&gt; www.apasoligero.com"
          </span>
        </div>
      </div>
    </footer>
  );
}
