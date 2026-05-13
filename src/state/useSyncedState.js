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
  bannerNameScale: 1.0,
  bannerScoreScale: 1.0,
};

export default function useSyncedState() {
  const [state, setState] = useState(() => {
    const saved = loadState() ?? {};
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
  const [netStatus, setNetStatus] = useState(params.useNet ? "connecting" : "local");

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (params.useNet) {
      const sock = new LocalSocket(wsURL, params.roomId);
      sockRef.current = sock;
      const offStatus = sock.onStatus(setNetStatus);
      sock.connect();
      const off = sock.on((remote) => {
        setState((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(remote)) return prev;
          saveState(remote);
          return remote;
        });
      });
      return () => { off(); offStatus(); sock.close(); };
    }

    setNetStatus("local");
    if (!bus) return;
    const off = bus.on((data) => {
      if (data?.type === "sync:update" && data.payload) {
        setState((prev) => (JSON.stringify(prev) === JSON.stringify(data.payload) ? prev : data.payload));
      }
    });
    return off;
  }, [params.useNet, params.roomId, wsURL]);

  const push = (next) => {
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
