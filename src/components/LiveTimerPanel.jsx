import React, { useEffect, useRef } from "react";
import useLiveTimer, { TIMER_STATE_LABEL } from "../hooks/useLiveTimer";
import { formatScore } from "../utils/score";
import { targetReached, TARGET_REACHED_COLOR } from "../hooks/useLiveTimer";

const BADGE = {
  running: "bg-amber-400 text-zinc-900 animate-pulse",
  stopped: "bg-emerald-500 text-white",
  ready: "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  unknown: "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
};

/**
 * Chrono en direct pour l'écran de saisie. Appelle onStop(frame) une seule fois
 * par course, quand le chrono s'arrête — jamais pour un temps déjà affiché au
 * moment où la page s'est connectée. Le parent décide quoi en faire (armé ou non).
 */
export default function LiveTimerPanel({
  onStop,
  onOpenSettings,
  armed,
  onArmedChange,
  competitorName,
  isTimerHost,
  pendingSeconds = null,
  withFinishDialog = true,
  target = null,
}) {
  const { frame, status, online } = useLiveTimer();
  const onStopRef = useRef(onStop);
  const handledRef = useRef(null); // { session, runId } de la dernière course traitée

  useEffect(() => { onStopRef.current = onStop; }, [onStop]);

  useEffect(() => {
    if (!frame) return;
    const handled = handledRef.current;
    if (!handled || handled.session !== frame.session) {
      // Première trame vue : une course déjà arrêtée n'est pas une nouvelle arrivée,
      // mais une course en cours doit être saisie à son arrêt.
      handledRef.current = {
        session: frame.session,
        runId: frame.state === "running" ? frame.runId - 1 : frame.runId,
      };
      return;
    }
    if (frame.state === "stopped" && frame.runId > handled.runId && frame.seconds > 0) {
      handledRef.current = { session: frame.session, runId: frame.runId };
      onStopRef.current?.(frame);
    }
  }, [frame]);

  const state = frame?.state ?? "unknown";
  const connected = online && status?.connected;
  const disabled = status?.config?.enabled === false;

  let detail;
  if (!online) detail = "Chrono disponible uniquement dans l'application FWST Scoring.";
  else if (disabled) detail = "Lecture du chrono désactivée.";
  else if (connected) detail = `Chrono connecté — ${status.port}${frame?.eye ? ` · cellule ${frame.eye}` : ""}`;
  else detail = status?.error || "Recherche du chrono USB…";
  if (connected && armed && !isTimerHost && withFinishDialog) {
    detail += pendingSeconds != null
      ? ` · arrivée ${formatScore(pendingSeconds, "time")} en attente de validation sur l'ordinateur du chrono`
      : " · la fenêtre d'arrivée s'ouvre sur l'ordinateur du chrono";
  }

  return (
    <div
      className={
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 transition-colors " +
        (armed && connected
          ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
          : "bg-zinc-500/5 ring-1 ring-zinc-500/15")
      }
    >
      <label
        className={
          "flex items-center gap-2 select-none cursor-pointer rounded-xl border px-3 py-2 font-semibold text-sm " +
          (armed
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-zinc-300 dark:border-zinc-700")
        }
        title={
          withFinishDialog
            ? "Armé : le chrono s'affiche sur les sorties et une fenêtre s'ouvre à l'arrivée pour valider le temps"
            : "Armé : le chrono s'affiche en direct sur les sorties"
        }
      >
        <input
          type="checkbox"
          checked={armed}
          onChange={(e) => onArmedChange(e.target.checked)}
          className="w-4 h-4"
        />
        {armed ? "Armé" : "Désarmé"}
      </label>
      <div
        className={`font-mono tabular-nums font-black text-4xl md:text-5xl leading-none min-w-[7ch] text-right ${
          connected ? "" : "opacity-30"
        }`}
        aria-live="off"
        style={connected && frame && targetReached(frame.seconds, target) ? { color: TARGET_REACHED_COLOR } : undefined}
      >
        {connected && frame ? formatScore(frame.seconds, "time") : "–.–––"}
      </div>
      <div className="flex-1 min-w-[12rem] space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          {connected && (
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${BADGE[state]}`}>
              {TIMER_STATE_LABEL[state]}
            </span>
          )}
          <span className="truncate text-sm">
            {competitorName
              ? <>Sur le parcours : <strong>{competitorName}</strong></>
              : <span className="opacity-60">Aucun compétiteur sélectionné</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              connected ? "bg-emerald-500" : disabled ? "bg-zinc-400" : "bg-red-500"
            }`}
          />
          <span className="truncate">{detail}</span>
        </div>
      </div>
      {online && onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-xs underline opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0"
        >
          Réglages du chrono
        </button>
      )}
    </div>
  );
}
