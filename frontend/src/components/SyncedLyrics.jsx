import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Radio } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

/** Estimated verse timing: proportional to line length, with a short intro/outro margin. */
const buildTimeline = (stanzas, dur) => {
  const lines = [];
  stanzas.forEach((st, si) => st.forEach((text, li) => lines.push({ si, li, w: Math.max(text.length, 14) })));
  const total = lines.reduce((n, l) => n + l.w, 0) || 1;
  const intro = Math.min(6, dur * 0.05);
  const span = Math.max(0, dur - intro - dur * 0.03);
  let acc = 0;
  return lines.map((l) => {
    const start = intro + (acc / total) * span;
    acc += l.w;
    return { ...l, start };
  });
};

export default function SyncedLyrics({ song }) {
  const { track, playing, time, dur, seek, play } = usePlayer();
  const [follow, setFollow] = useState(true);
  const refs = useRef([]);
  const file = song.audios[0]?.file;
  const live = Boolean(file && track?.file === file && dur > 0);

  const timeline = useMemo(() => (live ? buildTimeline(song.stanzas, dur) : []), [live, song.stanzas, dur]);
  let current = -1;
  for (let i = 0; i < timeline.length; i++) if (timeline[i].start <= time) current = i;
  const activeStanza = current >= 0 ? timeline[current].si : -1;

  useEffect(() => {
    if (!live || !follow || !playing || activeStanza < 0) return;
    const el = refs.current[activeStanza];
    if (!el) return;
    if (window.__lenis) window.__lenis.scrollTo(el, { offset: -window.innerHeight * 0.35, duration: 0.9 });
    else el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeStanza, live, follow, playing]);

  const jump = (si, li) => {
    if (!file) return;
    if (track?.file === file && dur === 0) return; // metadata still loading — ignore instead of restarting
    if (!live) {
      play({ file, title: song.title, sub: "Letra sincronizada" });
      return;
    }
    const t = timeline.find((l) => l.si === si && l.li === li);
    if (t) seek(t.start);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-brass">Letra · Documento transcrito</p>
        {file && (
          <div className="flex items-center gap-2" data-testid="synced-controls">
            <span
              className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] ${live ? "text-brass" : "text-khaki"}`}
              data-testid="synced-status"
            >
              <Radio size={10} className={live && playing ? "led-pulse" : ""} />
              {live ? "Sincronización estimada" : "Pulse un verso para escuchar"}
            </span>
            <button
              onClick={() => setFollow((f) => !f)}
              aria-pressed={follow}
              data-testid="synced-follow-toggle"
              className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] transition-colors ${
                follow ? "border-brass bg-brass/10 text-brass" : "border-olive-600 text-khaki hover:border-olive-500"
              }`}
            >
              <Crosshair size={10} /> Seguir letra
            </button>
          </div>
        )}
      </div>
      <div className="mt-6 space-y-8" data-testid="song-lyrics">
        {song.stanzas.map((stanza, si) => {
          const isActiveStanza = live && si === activeStanza;
          return (
            <div
              key={si}
              ref={(el) => (refs.current[si] = el)}
              data-testid={`stanza-${si}`}
              data-active={isActiveStanza || undefined}
              className={`border-l-2 pl-5 transition-colors duration-500 ${
                isActiveStanza ? "border-brass" : live ? "border-olive-600/60" : "border-olive-600 hover:border-brass/60"
              }`}
            >
              {stanza.map((line, li) => {
                const idx = timeline.findIndex((l) => l.si === si && l.li === li);
                const isCurrent = live && idx === current;
                const isPast = live && idx >= 0 && idx < current;
                const buttonClass = `block w-full text-left font-serif-ed text-lg italic leading-relaxed transition-all duration-500 sm:text-xl ${file ? "cursor-pointer" : ""} ${
                  isCurrent
                    ? "translate-x-1 text-brass"
                    : isPast
                      ? "text-parchment/45"
                      : live
                        ? "text-parchment/70"
                        : "text-parchment/90"
                } ${file ? "hover:text-brass" : ""}`;
                return file ? (
                  <button
                    key={li}
                    type="button"
                    onClick={() => jump(si, li)}
                    aria-label={`Ir al verso ${si + 1}.${li + 1}`}
                    data-testid={isCurrent ? "current-line" : undefined}
                    className={buttonClass}
                  >
                    {line}
                  </button>
                ) : (
                  <p key={li} className={buttonClass} data-testid={isCurrent ? "current-line" : undefined}>
                    {line}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
