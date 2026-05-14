import { useEffect, useMemo, useRef, useState } from "react";
import LocalSocket from "../sync/LocalSocket";
import { bus } from "../sync/SyncBus";

const LS_KEY = "rodeo-scoring-state-v1";
function loadState() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; } }
function saveState(state) { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

export const DEFAULT_BANNERS = [
  {
    id: "primary",
    label: "Bandeau principal",
    width: 2592,
    height: 216,
    nameScale: 1.0,
    scoreScale: 1.0,
    pageSize: 3,
    showLogo: true,
  },
  {
    id: "secondary",
    label: "Bandeau secondaire",
    width: 1920,
    height: 144,
    nameScale: 1.0,
    scoreScale: 1.0,
    pageSize: 2,
    showLogo: true,
  },
];

const DEFAULT_STATE = {
  eventName: "Rodeo",
  scoreMode: "higher",
  entries: [],
  theme: "dark",
  banners: DEFAULT_BANNERS,
  // Tableau plein écran
  displayPageSize: 5,           // entries per page (1–10)
  displayRotationMs: 5000,      // ms between auto-rotations; 0 disables rotation
  displayShowPagination: true,  // show the dot indicators
  showDisplayLogo: true,        // hide the FWST logo on the fullscreen leaderboard
};

function normalizeBanner(src, fallback) {
  return {
    id: src?.id ?? fallback.id,
    label: src?.label ?? fallback.label,
    width: Math.max(320, Number(src?.width ?? fallback.width) || fallback.width),
    height: Math.max(64, Number(src?.height ?? fallback.height) || fallback.height),
    nameScale: Math.min(2, Math.max(0.6, Number(src?.nameScale ?? fallback.nameScale))),
    scoreScale: Math.min(2, Math.max(0.6, Number(src?.scoreScale ?? fallback.scoreScale))),
    pageSize: Math.min(6, Math.max(1, Number(src?.pageSize ?? fallback.pageSize))),
    showLogo: src?.showLogo ?? fallback.showLogo,
  };
}

function migrateBanners(saved) {
  if (Array.isArray(saved.banners) && saved.banners.length >= 1) {
    return [
      normalizeBanner(saved.banners[0], DEFAULT_BANNERS[0]),
      normalizeBanner(saved.banners[1] ?? DEFAULT_BANNERS[1], DEFAULT_BANNERS[1]),
    ];
  }
  // Legacy: build banners[0] from the old flat fields
  const legacyPrimary = {
    ...DEFAULT_BANNERS[0],
    width: saved.bannerWidth ?? DEFAULT_BANNERS[0].width,
    height: saved.bannerHeight ?? DEFAULT_BANNERS[0].height,
    nameScale: Number(saved.bannerNameScale ?? DEFAULT_BANNERS[0].nameScale),
    scoreScale: Number(saved.bannerScoreScale ?? DEFAULT_BANNERS[0].scoreScale),
    showLogo: saved.showBannerLogo ?? DEFAULT_BANNERS[0].showLogo,
  };
  return [normalizeBanner(legacyPrimary, DEFAULT_BANNERS[0]), DEFAULT_BANNERS[1]];
}

export default function useSyncedState() {
  const [state, setState] = useState(() => {
    const saved = loadState() ?? {};
    return {
      ...DEFAULT_STATE,
      ...saved,
      banners: migrateBanners(saved),
      displayPageSize: Math.min(10, Math.max(1, Number(saved.displayPageSize ?? DEFAULT_STATE.displayPageSize))),
      displayRotationMs: Math.max(0, Number(saved.displayRotationMs ?? DEFAULT_STATE.displayRotationMs)),
      displayShowPagination: saved.displayShowPagination ?? DEFAULT_STATE.displayShowPagination,
      showDisplayLogo: saved.showDisplayLogo ?? DEFAULT_STATE.showDisplayLogo,
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
