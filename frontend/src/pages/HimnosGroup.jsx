import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import useTitle from "@/hooks/useTitle";
import NotFound from "@/pages/NotFound";
import data, { HIMNOS_META, getHimnosGroup } from "@/data/archive";

export default function HimnosGroup() {
  const { group } = useParams();
  const g = getHimnosGroup(group);
  const meta = HIMNOS_META[group] || {};
  const [q, setQ] = useState("");
  useTitle(g ? g.title : "Himnos");

  const items = useMemo(() => {
    if (!g) return [];
    const t = q.trim().toLowerCase();
    if (!t) return g.items;
    return g.items.filter((i) => i.title.toLowerCase().includes(t));
  }, [q, g]);

  if (!g) return <NotFound />;

  return (
    <div data-testid={`himnos-group-${group}`}>
      <PageHeader
        eyebrow={`SEC_02 // Himnos · ${meta.code || group}`}
        title={g.title}
        intro={g.intro}
        image={meta.emblem || undefined}
        crumbs={[
          { to: "/", label: "Inicio" },
          { to: "/canciones", label: "Canciones" },
          { to: "/canciones/himnos", label: "Himnos" },
          { label: meta.short || g.title },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-khaki" data-testid="list-count">
            Registros · {items.length} / {g.items.length}
          </p>
          <label className="flex items-center gap-2 border border-olive-600 bg-olive-950 px-3 py-2">
            <Search size={14} className="text-khaki" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar himno…"
              data-testid="himno-search-input"
              className="w-48 bg-transparent font-mono text-xs uppercase tracking-widest text-parchment placeholder:text-khaki/60 focus:outline-none sm:w-64"
            />
          </label>
        </div>
        <div className="mt-6 divide-y divide-olive-600/50 border border-olive-600/70">
          {items.map((item, i) => {
            const song = data.songs[`himnos/${group}/${item.slug}`];
            return (
              <Reveal key={item.slug} delay={Math.min(i * 0.02, 0.3)} y={10}>
                <Link
                  to={`/canciones/himnos/${group}/${item.slug}`}
                  data-testid={`himno-row-${item.slug}`}
                  className="group flex items-center gap-4 bg-olive-950/60 px-4 py-3.5 transition-colors hover:bg-olive-900 sm:px-6"
                >
                  <span className="w-8 shrink-0 font-mono text-[10px] tracking-widest text-khaki">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-display text-lg font-bold uppercase tracking-wide text-sage transition-colors group-hover:text-brass sm:text-xl">
                    {item.title}
                  </span>
                  {song?.audios?.length > 0 && (
                    <span className="hidden border border-olive-600 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-brass sm:block">
                      Audio
                    </span>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-olive-500 transition-all group-hover:translate-x-1 group-hover:text-brass" />
                </Link>
              </Reveal>
            );
          })}
          {items.length === 0 && (
            <p className="px-6 py-10 text-center font-mono text-xs uppercase tracking-widest text-khaki" data-testid="no-results">
              Sin resultados para «{q}»
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
