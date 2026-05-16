import React, { useEffect, useState } from "react";

/**
 * Single "Ouvrir" control with an optional fullscreen toggle. When the
 * checkbox is off (default), the button opens a regular browser window via
 * window.open (works in dev mode and in Electron). When checked, the
 * dropdown of OS displays becomes enabled and the button opens a
 * borderless fullscreen window on the chosen display via Electron IPC.
 *
 * Layouts:
 *   inline (default): one row — [☐ Plein écran] [▾ Écran] [Ouvrir]
 *   stacked:          two rows — checkbox + dropdown on top, button below
 *                     (the whole control right-aligns its rows)
 */
export default function OutputLauncher({
  buildUrl,
  windowName,
  windowFeatures = "noopener,noreferrer",
  label = "Ouvrir",
  icon: Icon,
  onBeforeLaunch,
  stacked = false,
}) {
  const inElectron = typeof window !== "undefined" && !!window.fwst?.openOnDisplay;

  const [fullscreen, setFullscreen] = useState(false);
  const [displays, setDisplays] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!inElectron) return;
    let cancelled = false;
    window.fwst.displays.list()
      .then((list) => {
        if (cancelled) return;
        setDisplays(list);
        const def = list.find((d) => !d.isPrimary) || list.find((d) => d.isPrimary) || list[0];
        setSelectedId(def?.id ?? null);
      })
      .catch(() => setDisplays([]));
    return () => { cancelled = true; };
  }, [inElectron]);

  async function launch() {
    if (busy) return;
    const url = buildUrl();
    if (!url) return;
    try { onBeforeLaunch?.(); } catch {}

    setBusy(true);
    try {
      if (fullscreen && inElectron && selectedId != null) {
        await window.fwst.openOnDisplay({ url, displayId: selectedId });
      } else {
        const w = window.open(url, windowName, windowFeatures);
        w?.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  const fullscreenControls = inElectron && (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={fullscreen}
          onChange={(e) => setFullscreen(e.target.checked)}
          className="w-4 h-4"
        />
        <span>Plein écran</span>
      </label>
      <select
        value={selectedId ?? ""}
        onChange={(e) => setSelectedId(Number(e.target.value))}
        disabled={!fullscreen || displays.length === 0}
        className="rounded-xl border px-3 py-2 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Écran cible"
        title={fullscreen ? "Écran cible" : "Activez Plein écran pour choisir un écran"}
      >
        {displays.length === 0 && <option value="">Aucun écran détecté</option>}
        {displays.map((d) => (
          <option key={d.id} value={d.id}>{d.label}</option>
        ))}
      </select>
    </div>
  );

  const openButton = (
    <button
      type="button"
      onClick={launch}
      disabled={busy || (fullscreen && selectedId == null)}
      className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:shadow active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      {label}
    </button>
  );

  if (stacked) {
    return (
      <div className="flex flex-col items-end gap-2">
        {fullscreenControls}
        {openButton}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {fullscreenControls}
      {openButton}
    </div>
  );
}
