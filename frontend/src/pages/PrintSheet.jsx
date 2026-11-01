import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Printer, ArrowLeft, Columns2, Rows3, Minus, Plus } from "lucide-react";
import CornetaMark from "@/components/CornetaMark";
import NotFound from "@/pages/NotFound";
import useTitle from "@/hooks/useTitle";
import data, { HIMNOS_META } from "@/data/archive";

const SECTION = {
  "paso-ligero": { key: "pasoligero", label: "Canciones de Paso Ligero", back: "/canciones/paso-ligero" },
  otras: { key: "otras", label: "Otras Canciones", back: "/canciones/otras" },
  himnos: { key: "himnos", label: "Himnos", back: "/canciones/himnos" },
};

export default function PrintSheet() {
  const params = useParams();
  const { group, slug } = params;
  const section = params.section || "himnos";
  const [cols, setCols] = useState(2);
  const [size, setSize] = useState(1);
  const cfg = SECTION[section];
  const key = section === "himnos" ? `himnos/${group}/${slug}` : `${cfg?.key}/${slug}`;
  const song = cfg ? data.songs[key] : null;
  const meta = section === "himnos" ? HIMNOS_META[group] || {} : {};
  useTitle(song ? `Imprimir · ${song.title}` : "Imprimir");

  useEffect(() => {
    window.__lenis?.stop();
    return () => window.__lenis?.start();
  }, []);

  if (!song) return <NotFound />;
  const back = section === "himnos" ? `/canciones/himnos/${group}/${slug}` : `${cfg.back}/${slug}`;
  const lines = song.stanzas.reduce((n, s) => n + s.length, 0);

  return (
    <div className="print-root min-h-screen bg-[#e9e6dc] text-black" data-testid="print-page">
      <div className="no-print sticky top-0 z-10 border-b border-black/10 bg-[#e9e6dc]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to={back} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black/70 hover:text-black" data-testid="print-back">
            <ArrowLeft size={14} /> Volver a la letra
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setCols(cols === 2 ? 1 : 2)} data-testid="print-toggle-columns" className="flex h-9 items-center gap-2 border border-black/30 px-3 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white">
              {cols === 2 ? <Rows3 size={13} /> : <Columns2 size={13} />} {cols === 2 ? "1 columna" : "2 columnas"}
            </button>
            <span className="flex h-9 items-center border border-black/30">
              <button onClick={() => setSize((s) => Math.max(0.8, +(s - 0.1).toFixed(1)))} aria-label="Reducir letra" data-testid="print-font-minus" className="flex h-full w-9 items-center justify-center hover:bg-black hover:text-white"><Minus size={13} /></button>
              <span className="px-2 font-mono text-[10px] tracking-widest" data-testid="print-font-size">{Math.round(size * 100)}%</span>
              <button onClick={() => setSize((s) => Math.min(1.4, +(s + 0.1).toFixed(1)))} aria-label="Aumentar letra" data-testid="print-font-plus" className="flex h-full w-9 items-center justify-center hover:bg-black hover:text-white"><Plus size={13} /></button>
            </span>
            <button onClick={() => window.print()} data-testid="print-button" className="flex h-9 items-center gap-2 bg-black px-4 font-mono text-[10px] uppercase tracking-[0.25em] text-white hover:bg-[#8a6d2f]">
              <Printer size={13} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      </div>

      <article className="print-sheet mx-auto my-8 max-w-[210mm] bg-white px-[16mm] py-[14mm] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)] print:my-0 print:max-w-none print:shadow-none" data-testid="print-sheet" style={{ fontSize: `${size}rem` }}>
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-black/60">A Paso Ligero .com · Cancionero militar</p>
            <h1 className="mt-2 font-display text-[2.6em] font-extrabold uppercase leading-[0.95] tracking-tight" data-testid="print-title">{song.title}</h1>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.25em] text-black/70">
              <span>{cfg.label}{meta.short ? ` · ${meta.short}` : ""}</span>
              {song.date && <span>Registro {song.date}</span>}
              <span>{song.stanzas.length} estrofas · {lines} versos</span>
            </p>
          </div>
          {meta.emblem ? (
            <img src={meta.emblem} alt="" className="h-20 w-20 shrink-0 object-contain" />
          ) : (
            <span className="shrink-0 text-black"><CornetaMark size={64} mono /></span>
          )}
        </header>

        <div className={`mt-8 gap-x-10 ${cols === 2 ? "sm:columns-2 print:columns-2" : ""}`} data-testid="print-lyrics">
          {song.stanzas.map((stanza, si) => (
            <div key={si} className="mb-5 break-inside-avoid border-l border-black/25 pl-4">
              {stanza.map((line, li) => (
                <p key={li} className="font-serified text-[1.02em] italic leading-[1.55] text-black/90">{line}</p>
              ))}
            </div>
          ))}
        </div>

        {song.source && (
          <div className="mt-6 border-t border-black/20 pt-3" data-testid="print-source">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-black/60">Fuente</p>
            <p className="mt-1 text-[0.8em] text-black/80">{song.source}</p>
          </div>
        )}

        {song.notes.length > 0 && (
          <div className="mt-6 border-t border-black/20 pt-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-black/60">Notas</p>
            <ul className="mt-1 space-y-0.5 text-[0.8em] text-black/80">
              {song.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t-2 border-black pt-3 font-mono text-[9px] uppercase tracking-[0.25em] text-black/60">
          <span>www.apasoligero.com · Álvar Barrios Martínez</span>
          <span className="normal-case tracking-normal">"Si vas a copiar algo, por favor, cita el origen"</span>
        </footer>
      </article>
    </div>
  );
}
