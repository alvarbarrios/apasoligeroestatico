import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Download, FileAudio, ChevronRight, Printer, Loader2 } from "lucide-react";
import AudioButton from "@/components/AudioButton";
import QueueButton from "@/components/QueueButton";
import CornetaMark from "@/components/CornetaMark";
import SyncedLyrics from "@/components/SyncedLyrics";
import useTitle from "@/hooks/useTitle";
import NotFound from "@/pages/NotFound";
import { useArchive } from "@/context/ArchiveContext";
import data, { HIMNOS_META, getHimnosGroup } from "@/data/archive";

export default function SongDetail({ section, base, crumb }) {
  const { group, slug } = useParams();
  const { ready } = useArchive();
  const isHimno = section === "himnos";
  const key = isHimno ? `himnos/${group}/${slug}` : `${section}/${slug}`;
  const song = data.songs[key];
  useTitle(song ? (song.docTitle || song.title) : "Registro");

  if (!song && !ready) {
    return (
      <p className="flex items-center justify-center gap-2 py-32 font-mono text-xs uppercase tracking-widest text-khaki" data-testid="song-loading">
        <Loader2 size={14} className="animate-spin" /> Consultando el archivo…
      </p>
    );
  }
  if (!song) return <NotFound />;

  const meta = isHimno ? HIMNOS_META[group] || {} : {};
  const list = isHimno ? (getHimnosGroup(group)?.items || []) : data[section].items;
  const idx = list.findIndex((i) => i.slug === slug);
  const prev = idx > 0 ? list[idx - 1] : null;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const backTo = isHimno ? `/canciones/himnos/${group}` : base;
  const printTo = isHimno ? `/imprimir/himnos/${group}/${slug}` : `/imprimir/${base.split("/").pop()}/${slug}`;
  const crumbs = isHimno
    ? [
        { to: "/", label: "Inicio" },
        { to: "/canciones", label: "Canciones" },
        { to: "/canciones/himnos", label: "Himnos" },
        { to: backTo, label: meta.short || group },
        { label: song.title },
      ]
    : [
        { to: "/", label: "Inicio" },
        { to: "/canciones", label: "Canciones" },
        { to: base, label: crumb },
        { label: song.title },
      ];

  return (
    <div data-testid={`song-detail-${slug}`}>
      <div className="tactical-grid noise relative border-b border-olive-600/60 bg-olive-950">
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <nav className="mb-6 flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-khaki" data-testid="breadcrumbs">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} className="text-brass/60" />}
                {c.to ? (
                  <Link to={c.to} className="transition-colors hover:text-brass" data-testid={`crumb-${i}`}>
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-sage">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-parchment sm:text-5xl"
            data-testid="song-title"
          >
            {song.title}
          </motion.h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-khaki">
            <span className="border border-olive-600 px-2 py-1" data-testid="song-section-badge">{crumb}</span>
            {song.date && (
              <span className="border border-olive-600 px-2 py-1" data-testid="song-date-badge">Registro · {song.date}</span>
            )}
            {song.audios.length > 0 && (
              <span className="border border-brass/50 px-2 py-1 text-brass" data-testid="song-audio-badge">Audio disponible</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12">
        {/* Dossier lateral */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-4"
        >
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="relative border border-olive-600/70 bg-olive-950 p-5" data-testid="song-dossier">
              <span className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-brass" />
              <span className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-brass" />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-khaki">Ficha del registro</p>
              <div className="mt-4 flex items-center gap-4">
                {meta.emblem ? (
                  <img src={meta.emblem} alt="" className="h-16 w-16 border border-olive-600 bg-olive-900 object-contain p-1" />
                ) : (
                  <CornetaMark size={64} />
                )}
                <div>
                  <p className="font-display text-lg font-bold uppercase leading-tight text-parchment">{song.title}</p>
                  {meta.short && <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">{meta.short}</p>}
                </div>
              </div>
              {song.audios.length > 0 && (
                <div className="mt-5 space-y-3 border-t border-olive-600/60 pt-5">
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-khaki">
                    <FileAudio size={12} className="text-brass" /> Escúchela aquí
                  </p>
                  {song.audios.map((a, i) => (
                    <div key={i} className="flex items-center gap-3" data-testid={`song-audio-${i}`}>
                      <AudioButton file={a.file} title={song.title} sub={crumb} testid={`song-play-${i}`} />
                      <QueueButton file={a.file} title={song.title} sub={crumb} size="md" testid={`song-queue-${i}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-sage">{a.label}</p>
                        <a
                          href={a.file}
                          download
                          data-testid={`song-download-${i}`}
                          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-khaki transition-colors hover:text-brass"
                        >
                          <Download size={10} /> Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {song.notes.length > 0 && (
                <div className="mt-5 border-t border-olive-600/60 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-khaki">Notas del archivo</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-sage" data-testid="song-notes">
                    {song.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5 border-t border-olive-600/60 pt-4">
                <Link
                  to={printTo}
                  data-testid="song-print-link"
                  className="group flex items-center justify-between gap-3 border border-olive-600 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-sage transition-colors hover:border-brass hover:text-brass"
                >
                  <span className="flex items-center gap-2"><Printer size={13} /> Hoja imprimible</span>
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.15em] text-khaki">Letra limpia en A4 · para cancioneros de unidad</p>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Letra */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-8"
        >
          <SyncedLyrics song={song} />
          <div className="mt-14 flex items-center justify-between gap-4 border-t border-olive-600/60 pt-6">
            {prev ? (
              <Link
                to={`${backTo}/${prev.slug}`}
                data-testid="song-prev"
                className="group flex max-w-[45%] items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-sage transition-colors hover:text-brass"
              >
                <ArrowLeft size={14} className="shrink-0 transition-transform group-hover:-translate-x-1" />
                <span className="truncate">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={`${backTo}/${next.slug}`}
                data-testid="song-next"
                className="group flex max-w-[45%] items-center gap-2 text-right font-mono text-[11px] uppercase tracking-[0.15em] text-sage transition-colors hover:text-brass"
              >
                <span className="truncate">{next.title}</span>
                <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </motion.article>
      </div>
    </div>
  );
}
