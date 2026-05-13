import { useEffect, useMemo, useRef, useState } from "react";
import LocalSocket from "../sync/LocalSocket";
import { bus } from "../sync/SyncBus";

const LS_KEY = "rodeo-scoring-state-v1";
function loadState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; } }
function saveState(state) { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

const DEFAULT_STATE = {
  eventName: "Rodeo",
  scoreMode: "higher",
  entries: [],
  theme: "dark",
  bannerWidth: 2592,
  bannerHeight: 216,
  bannerNameScale: 1.0,   // multiplies base name font (banner only)
  bannerScoreScale: 1.0,
};

export default function useSyncedState() {
  const [state, setState] = useState(() => {
    const saved = loadState() ?? {};
    // Soft-migrate old saves (ensure new keys exist)
    return {
      ...DEFAULT_STATE,
      ...saved,
      bannerNameScale: Number(saved.bannerNameScale ?? 1.0),
      bannerScoreScale: Number(saved.bannerScoreScale ?? 1.0),
    };
  });
  const params = useMemo(() => {
    if (typeof window === "undefined") return { useNet: false, roomId: "default" };
    const p = new URLSearchParams(window.location.search);
    const useNet = p.get("net") === "1" || p.get("sync") === "net"; // active hub
    const roomId = (p.get("room") || "default").trim();
    return { useNet, roomId };
  }, []);

  // ws URL même origine: ws://host/live-score ou wss://
  const wsURL = useMemo(() => {
    if (typeof window === "undefined") return null;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/live-score`;
  }, []);

  const sockRef = useRef(null);

  // Sauvegarde locale
  useEffect(() => saveState(state), [state]);

  // Abonnement — utilise un setState fonctionnel pour comparer au state le plus
  // récent (pas le snapshot capturé à la souscription).
  useEffect(() => {
    if (params.useNet) {
      const sock = new LocalSocket(wsURL, params.roomId);
      sockRef.current = sock;
      sock.connect();
      const off = sock.on((remote) => {
        setState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(remote)) return prev;
          saveState(remote);
          return remote;
        });
      });
      return () => { off(); sock.close(); };
    }

    if (!bus) return;
    const off = bus.on((data) => {
      if (data?.type === "sync:update" && data.payload) {
        setState((prev) => (JSON.stringify(prev) === JSON.stringify(data.payload) ? prev : data.payload));
      }
    });
    return off;
  }, [params.useNet, params.roomId, wsURL]);

  // push: local + diffuse
  const push = (next) => {
    setState(next);
    saveState(next);
    if (params.useNet) {
      sockRef.current?.push(next);
    } else {
      bus?.post({ type: "sync:update", payload: next });
    }
  };

  return [state, push];
}
