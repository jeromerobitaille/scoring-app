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

// Mode temps : juste après l'arrêt, le temps reste affiché le temps que la
// course en attente (pendingRun) arrive du poste du chrono — évite un clignotement.
// Mode pointage (pas de fenêtre d'arrivée) : le temps final reste quelques secondes.
export const HOLD_TIME_MODE_MS = 2000;
export const HOLD_SCORE_MODE_MS = 6000;

/** Couleur du temps une fois la cible atteinte (ex. 8 s en monte). */
export const TARGET_REACHED_COLOR = "#34d399";

export function targetReached(seconds, target) {
  return target != null && seconds >= target;
}

/**
 * Décide quoi afficher sur une sortie à partir de la trame du chrono. Fonction
 * pure (testable) : `mem` est la mémoire de l'appelant, modifiée sur place.
 *   mem = { seen, stop: { key, at } | null, ignored }
 *
 * - pendant la course : le temps qui défile ;
 * - après l'arrivée : le temps arrêté, tant que la course n'a pas été validée
 *   ou annulée sur le poste du chrono (`pendingRun`, état partagé) ;
 * - une arrivée en attente GÈLE l'affichage : un nouveau départ déclenché avant
 *   la validation (cheval qui repasse devant la cellule) est ignoré, y compris
 *   après la validation, jusqu'à la course suivante ;
 * - jamais pour un temps arrêté dont on n'a pas vu la course (ex. au branchement).
 *
 * L'arrêt est traité pendant le rendu, pas dans un effet : sinon une image
 * sans chrono passe entre « en course » et « arrêté » (scintillement).
 */
export function resolveOutputTimer(mem, { enabled, frame, pendingRun, holdMs, now }) {
  if (!enabled) return null;
  const key = frame ? `${frame.session}:${frame.runId}` : null;
  const state = frame?.state;

  if (key && state === "running") {
    // Départ vu pendant qu'une arrivée attend sa validation : faux départ.
    if (pendingRun && mem.seen !== key) mem.ignored = key;
    if (mem.ignored !== key) {
      mem.seen = key;
      mem.stop = null;
    }
  } else if (key && state === "stopped") {
    if (mem.seen === key && mem.stop?.key !== key) mem.stop = { key, at: now };
  } else if (state === "ready") {
    mem.stop = null;
  }

  if (pendingRun) return { ...pendingRun, state: "stopped" };
  if (!frame || mem.ignored === key) return null;
  if (state === "running") return frame;
  if (state === "stopped" && mem.stop?.key === key && now - mem.stop.at < holdMs) return frame;
  return null;
}

/** Chrono à afficher sur une sortie (tableau, bandeau, canevas), ou null. Voir resolveOutputTimer. */
export function useOutputTimer({ enabled, pendingRun = null, holdMs = HOLD_TIME_MODE_MS }) {
  const { frame } = useLiveTimer({ enabled });
  const memRef = useRef({ seen: null, stop: null, ignored: null });
  const [, rerender] = useState(0);

  const shown = resolveOutputTimer(memRef.current, { enabled, frame, pendingRun, holdMs, now: Date.now() });

  // Fin du maintien : un rendu de plus pour retirer le temps arrêté.
  const stopKey = memRef.current.stop?.key ?? null;
  useEffect(() => {
    const stop = memRef.current.stop;
    if (!stop) return;
    const t = setTimeout(() => rerender((n) => n + 1), Math.max(0, holdMs - (Date.now() - stop.at)) + 20);
    return () => clearTimeout(t);
  }, [stopKey, holdMs]);

  return shown;
}
