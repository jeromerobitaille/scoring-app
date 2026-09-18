import { useEffect, useMemo, useRef, useState } from "react";
import LocalSocket from "../sync/LocalSocket";
import { bus } from "../sync/SyncBus";
import { normalizeState } from "./model";

const LS_KEY = "rodeo-scoring-state-v1";
function loadState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; } }
function saveState(state) { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

const DEFAULT_STATE = {
  eventName: "Rodeo",
  scoreMode: "higher",
  entries: [],
  theme: "dark",
  showLiveTimer: true, // chrono FarmTek en direct sur les sorties (quand il est armé)
};

export default function useSyncedState() {
  const [state, setState] = useState(() => {
    const saved = loadState() ?? {};
    // Les anciens réglages d'affichage (bandeaux, canevas, tableau) sont
    // convertis en sorties par normalizeState.
    return normalizeState({ ...DEFAULT_STATE, ...saved });
  });
  const params = useMemo(() => {
    if (typeof window === "undefined") return { useNet: false, roomId: "default" };
    const p = new URLSearchParams(window.location.search);
    const useNet = p.get("net") === "1" || p.get("sync") === "net";
    const roomId = (p.get("room") || "default").trim();
    return { useNet, roomId };
  }, []);

  const wsURL = useMemo(() => {
    if (typeof window === "undefined") return null;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/live-score`;
  }, []);

  const sockRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [netStatus, setNetStatus] = useState(params.useNet ? "connecting" : "local");

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (params.useNet) {
      const sock = new LocalSocket(wsURL, params.roomId);
      sockRef.current = sock;
      const offStatus = sock.onStatus(setNetStatus);
      // Serveur sans données pour cette room (premier lancement de la version
      // qui les enregistre sur disque) : l'app de bureau l'amorce avec les
      // siennes. Pas une tablette, dont le cache pourrait être périmé.
      const offEmpty = sock.onEmpty(() => {
        if (window.fwst?.isElectron) sock.push(stateRef.current);
      });
      sock.connect();
      const off = sock.on((incoming) => {
        const remote = normalizeState(incoming);
        setState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(remote)) return prev;
          saveState(remote);
          return remote;
        });
      });
      return () => { off(); offStatus(); offEmpty(); sock.close(); };
    }

    setNetStatus("local");
    if (!bus) return;
    const off = bus.on((data) => {
      if (data?.type === "sync:update" && data.payload) {
        const remote = normalizeState(data.payload);
        setState((prev) => (JSON.stringify(prev) === JSON.stringify(remote) ? prev : remote));
      }
    });
    return off;
  }, [params.useNet, params.roomId, wsURL]);

  const push = (input) => {
    const next = normalizeState(input);
    setState(next);
    saveState(next);
    if (params.useNet) {
      sockRef.current?.push(next);
    } else {
      bus?.post({ type: "sync:update", payload: next });
    }
  };

  return [state, push, { netStatus, roomId: params.roomId, useNet: params.useNet }];
}
