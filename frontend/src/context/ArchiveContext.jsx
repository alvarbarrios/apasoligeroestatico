import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { mergeDynamicSongs } from "@/data/archive";
import { resetIndex } from "@/data/searchIndex";
import { IS_STATIC } from "@/lib/static";

const API = process.env.REACT_APP_BACKEND_URL;
const ArchiveCtx = createContext({ version: 0, ready: false, refresh: () => {} });

/** Loads owner-added songs once and merges them into the static archive; bumps `version` so pages re-render. */
export function ArchiveProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (IS_STATIC) {
      setReady(true);
      return;
    }
    try {
      const { data } = await axios.get(`${API}/api/songs`);
      if (mergeDynamicSongs(data, API)) {
        resetIndex();
        setVersion((v) => v + 1);
      }
    } catch {
      /* static archive still works */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <ArchiveCtx.Provider value={{ version, ready, refresh }}>{children}</ArchiveCtx.Provider>;
}

export const useArchive = () => useContext(ArchiveCtx);
