import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const PlayerCtx = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const queueRef = useRef([]);
  const [track, setTrack] = useState(null);
  const [queue, setQueueState] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  const setQueue = (q) => {
    queueRef.current = q;
    setQueueState(q);
  };

  const ensureAnalyser = () => {
    const a = audioRef.current;
    if (!a || ctxRef.current) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      const src = ctx.createMediaElementSource(a);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.82;
      src.connect(an);
      an.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = an;
    } catch {
      /* visualizer unavailable — playback still works */
    }
  };

  const start = useCallback((t) => {
    const a = audioRef.current;
    if (!a) return;
    ensureAnalyser();
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    a.src = t.file;
    setTrack(t);
    setPlaying(false);
    setTime(0);
    setDur(0);
    const onPlayResult = async () => {
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };
    onPlayResult();
  }, []);

  const next = useCallback(() => {
    const [head, ...rest] = queueRef.current;
    if (!head) {
      setPlaying(false);
      return false;
    }
    setQueue(rest);
    start(head);
    return true;
  }, [start]);

  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    a.crossOrigin = "anonymous";
    audioRef.current = a;
    const onTime = () => setTime(a.currentTime);
    const onDur = () => setDur(a.duration || 0);
    const onPlaying = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setPlaying(false);
    const onEnd = () => next();
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
      a.removeEventListener("ended", onEnd);
      ctxRef.current?.close();
    };
  }, [next]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !track) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const play = (t) => {
    if (track && track.file === t.file) {
      toggle();
      return;
    }
    start(t);
  };

  const enqueue = (t) => {
    if (!track) {
      start(t);
      return "playing";
    }
    if (track.file === t.file || queueRef.current.some((q) => q.file === t.file)) return "duplicate";
    setQueue([...queueRef.current, t]);
    return "queued";
  };

  const playAll = (list) => {
    if (!list.length) return;
    const [head, ...rest] = list;
    setQueue(rest);
    start(head);
  };

  const playFromQueue = (file) => {
    const idx = queueRef.current.findIndex((q) => q.file === file);
    if (idx < 0) return;
    const t = queueRef.current[idx];
    setQueue(queueRef.current.filter((_, i) => i !== idx));
    start(t);
  };

  const removeFromQueue = (file) => setQueue(queueRef.current.filter((q) => q.file !== file));
  const clearQueue = () => setQueue([]);

  const seek = (s) => {
    if (audioRef.current) audioRef.current.currentTime = s;
  };

  const close = () => {
    const a = audioRef.current;
    if (a) a.pause();
    setTrack(null);
    setPlaying(false);
    setTime(0);
    setDur(0);
    setQueue([]);
  };

  return (
    <PlayerCtx.Provider
      value={{
        track, playing, time, dur, queue, analyserRef,
        play, toggle, seek, close, next, enqueue, playAll, playFromQueue, removeFromQueue, clearQueue,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}

export const usePlayer = () => useContext(PlayerCtx);
