import { useEffect, useRef, useState } from "react";

/**
 * Temps en direct du chrono FarmTek, lu en USB par l'application de bureau et
 * diffusé sur le WebSocket local (canal « timer », séparé de l'état synchronisé).
 *
 * Retourne :
 *   frame  { eye, time, seconds, state, runId, session, ts } | null
 *          state : "ready" | "running" | "stopped" | "unknown"
 *   status { connected, port, error, config } | null
 *   online true tant que le serveur local est joignable
 */
export default function useLiveTimer({ enabled = true } = {}) {
  const [frame, setFrame] = useState(null);
  const [status, setStatus] = useState(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/live-score`;

    let ws = null;
    let retry = null;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(url);
      ws.addEventListener("open", () => {
        setOnline(true);
        ws.send(JSON.stringify({ type: "timer:subscribe" }));
      });
      ws.addEventListener("message", (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === "timer:frame") setFrame(msg);
        else if (msg.type === "timer:status") setStatus(msg);
      });
      const onDown = () => {
        setOnline(false);
        if (closed) return;
        clearTimeout(retry);
        retry = setTimeout(connect, 2000);
      };
      ws.addEventListener("close", onDown);
      ws.addEventListener("error", () => { try { ws.close(); } catch { /* déjà fermé */ } });
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      try { ws?.close(); } catch { /* déjà fermé */ }
    };
  }, [enabled]);

  // Une trame n'a de sens que si le port est toujours ouvert.
  const live = status?.connected ? frame : null;
  return { frame: live, status, online };
}

export const TIMER_STATE_LABEL = {
  ready: "Prêt",
  running: "En course",
  stopped: "Arrêté",
  unknown: "En attente",
};

// Juste après l'arrêt, le temps reste affiché le temps que la course en
// attente (pendingRun) arrive du poste du chrono — évite un clignotement.
const HOLD_AFTER_STOP_MS = 2000;

/**
 * Chrono à afficher sur une sortie (tableau, bandeau, canevas), ou null.
 * - pendant la course : le temps qui défile ;
 * - après l'arrivée : le temps arrêté, tant que la course n'a pas été validée
 *   ou annulée sur le poste du chrono (`pendingRun`, état partagé) ;
 * - jamais pour un temps arrêté dont on n'a pas vu la course (ex. au branchement).
 */
export function useOutputTimer({ enabled, pendingRun = null }) {
  const { frame } = useLiveTimer({ enabled });
  const seenRunRef = useRef(null); // `${session}:${runId}` de la dernière course vue en marche
  const [held, setHeld] = useState(null); // clé de la course dont on affiche l'arrivée

  const key = frame ? `${frame.session}:${frame.runId}` : null;
  const state = frame?.state;

  useEffect(() => {
    if (!key) return;
    if (state === "running") {
      seenRunRef.current = key;
      setHeld(null);
      return;
    }
    if (state === "stopped" && seenRunRef.current === key) {
      setHeld(key);
      const t = setTimeout(() => setHeld((k) => (k === key ? null : k)), HOLD_AFTER_STOP_MS);
      return () => clearTimeout(t);
    }
    if (state === "ready") setHeld(null);
  }, [key, state]);

  if (!enabled) return null;
  if (frame && state === "running") return frame;
  if (pendingRun) return { ...pendingRun, state: "stopped" };
  if (frame && state === "stopped" && held === key) return frame;
  return null;
}
