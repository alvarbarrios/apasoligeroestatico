import data from "./archive.json";

export default data;

export const HIMNOS_META = {
  espana: { short: "España", code: "ESP", emblem: "/assets/img/bandera-espana.svg" },
  tierra: { short: "Ejército de Tierra", code: "ET", emblem: "/assets/img/et.png" },
  armada: { short: "Armada Española", code: "ARM", emblem: "/assets/img/ae.gif" },
  aire: { short: "Ejército del Aire", code: "EA", emblem: "/assets/img/ea.PNG" },
  cucos: { short: "Cuerpos Comunes de la Defensa", code: "CUCOS", emblem: "/assets/img/cc.gif" },
  gcivil: { short: "Guardia Civil", code: "GC", emblem: "/assets/img/gc.gif" },
  greal: { short: "Guardia Real", code: "GR", emblem: "/assets/img/gr.png" },
  ume: { short: "Unidad Militar de Emergencias", code: "UME", emblem: "/assets/img/ume.png" },
  varios: { short: "Varios", code: "VAR", emblem: "/assets/img/escudo-espana.svg" },
};

export const LEMAS_META = {
  ltierra: { short: "Ejército de Tierra", code: "ET", emblem: "/assets/img/et.png" },
  larmada: { short: "Armada Española", code: "ARM", emblem: "/assets/img/ae.gif" },
  laire: { short: "Ejército del Aire", code: "EA", emblem: "/assets/img/ea.PNG" },
  lcucos: { short: "Cuerpos Comunes", code: "CUCOS", emblem: "/assets/img/cc.gif" },
  lgcivil: { short: "Guardia Civil", code: "GC", emblem: "/assets/img/gc.gif" },
  lgreal: { short: "Guardia Real", code: "GR", emblem: "/assets/img/gr.png" },
  lume: { short: "UME", code: "UME", emblem: "/assets/img/ume.png" },
  lvarios: { short: "Varios", code: "VAR", emblem: "/assets/img/escudo-espana.svg" },
};

export const getHimnosGroup = (slug) => data.himnosGroups.find((g) => g.slug === slug);
export const getLemasGroup = (slug) => data.lemasGroups.find((g) => g.slug === "l" + slug || g.slug === slug);
export const getSong = (key) => data.songs[key];

export const STATS = {
  get canciones() { return Object.keys(data.songs).length; },
  get toques() { return data.corneta.calls.length; },
  get audios() { return data.audios.items.length + data.corneta.calls.filter((c) => c.file).length + data.cornetin.calls.filter((c) => c.file).length; },
  get lemas() { return data.lemasGroups.reduce((n, g) => n + g.entries.length, 0); },
};

const byTitle = (a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" });
const DYNAMIC_KEYS = new Set();

/** Merge owner-added songs (from /api/songs) into the static archive. Idempotent; returns true if anything changed. */
export function mergeDynamicSongs(list, apiBase) {
  const incoming = new Set();
  let changed = false;
  for (const s of list) {
    const key = s.section === "himnos" ? `himnos/${s.group}/${s.slug}` : `${s.section}/${s.slug}`;
    incoming.add(key);
    const existing = data.songs[key];
    if (existing && !existing.dynamic) continue;
    const file = s.audio ? `${apiBase}${s.audio}` : null;
    const songRecord = {
      title: s.title,
      stanzas: s.stanzas,
      audios: file ? [{ file, label: s.audio_name || "audio.mp3" }] : [],
      notes: s.notes,
      images: [],
      date: s.date,
      dynamic: true,
      id: s.id,
    };
    if (!existing) {
      data.songs[key] = songRecord;
      const list_ = s.section === "himnos" ? data.himnosGroups.find((g) => g.slug === s.group)?.items : data[s.section].items;
      if (list_) {
        list_.push({ slug: s.slug, title: s.title });
        list_.sort(byTitle);
      }
      if (file) {
        data.audios.items.push({ file, title: s.title });
        data.audios.items.sort(byTitle);
      }
      DYNAMIC_KEYS.add(key);
      changed = true;
    } else {
      Object.assign(existing, songRecord, { dynamic: true });
      changed = true;
    }
  }
  for (const key of [...DYNAMIC_KEYS]) {
    if (incoming.has(key)) continue;
    const song = data.songs[key];
    if (!song || !song.dynamic) {
      DYNAMIC_KEYS.delete(key);
      continue;
    }
    const [section, group, slug] = key.split("/");
    const list_ = section === "himnos" ? data.himnosGroups.find((g) => g.slug === group)?.items : data[section].items;
    const s = section === "himnos" ? slug : group;
    if (list_) {
      const idx = list_.findIndex((i) => i.slug === s);
      if (idx >= 0) list_.splice(idx, 1);
    }
    if (song.audios[0]) {
      const audioIdx = data.audios.items.findIndex((a) => a.file === song.audios[0].file);
      if (audioIdx >= 0) data.audios.items.splice(audioIdx, 1);
    }
    delete data.songs[key];
    DYNAMIC_KEYS.delete(key);
    changed = true;
  }
  return changed;
}

export const CORNETA_INDEX = 29;
