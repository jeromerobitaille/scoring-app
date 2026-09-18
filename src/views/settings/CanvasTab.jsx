import React, { useEffect, useRef, useState } from "react";
import { PlusIcon, TrashIcon, ClockIcon, TvIcon, RectangleStackIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import Label from "../../components/ui/Label";
import TextInput from "../../components/ui/TextInput";
import OutputLauncher from "../../components/FullscreenLauncher";
import CanvasStage from "../../components/outputs/CanvasStage";
import { CANVAS_BACKGROUNDS } from "../../state/canvas";
import { bus } from "../../sync/SyncBus";
import { FONTS } from "../../state/look";
import { BINDINGS } from "../../state/bindings";
import { LOWER_THIRD_DEFAULTS } from "../../state/useSyncedState";

const INPUT =
  "w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";
const newId = () => `c-${Math.random().toString(36).slice(2, 8)}`;

// Chrono d'exemple pour l'aperçu quand aucun vrai chrono ne tourne.
const PREVIEW_TIMER = { seconds: 6.42, state: "running", runId: 0, session: "preview" };

const KIND_ICON = { banner: TvIcon, timer: ClockIcon, lowerThird: RectangleStackIcon };
const KIND_LABEL = { banner: "Bandeau", timer: "Chrono", lowerThird: "Infographie" };

/** Aperçu réel du canevas, à l'échelle, avec déplacement et redimensionnement à la souris. */
function CanvasEditor({ state, canvas, selectedId, onSelect, onMove, showSampleTimer }) {
  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWrapW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(wrapW / canvas.width, 420 / canvas.height);
  const previewW = Math.round(canvas.width * scale);
  const previewH = Math.round(canvas.height * scale);

  // Glisser : déplacement (poignée = tout l'élément) ou redimensionnement (coin bas-droit).
  const dragRef = useRef(null);
  function startDrag(e, el, mode) {
    e.preventDefault();
    e.stopPropagation();
    onSelect(el.id);
    dragRef.current = { id: el.id, mode, startX: e.clientX, startY: e.clientY, x: el.x, y: el.y, w: el.width, h: el.height };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / scale;
      const dy = (ev.clientY - d.startY) / scale;
      if (d.mode === "move") onMove(d.id, { x: Math.round(d.x + dx), y: Math.round(d.y + dy) });
      else onMove(d.id, { width: Math.round(d.w + dx), height: Math.round(d.h + dy) });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div ref={wrapRef} className="w-full">
      <div
        className="relative mx-auto rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden select-none"
        style={{
          width: previewW,
          height: previewH,
          // Damier derrière un fond transparent.
          backgroundImage:
            "linear-gradient(45deg,#8883 25%,transparent 25%),linear-gradient(-45deg,#8883 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#8883 75%),linear-gradient(-45deg,transparent 75%,#8883 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
        }}
        onMouseDown={() => onSelect(null)}
      >
        <div style={{ width: canvas.width, height: canvas.height, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          <CanvasStage state={state} timerFrame={showSampleTimer ? PREVIEW_TIMER : null} width={canvas.width} height={canvas.height} />
        </div>
        {/* Calque d'édition */}
        {canvas.banners.map((el) => {
          const sel = el.id === selectedId;
          return (
            <div
              key={el.id}
              onMouseDown={(e) => startDrag(e, el, "move")}
              title={`${el.label} — ${el.width}×${el.height} @ (${el.x},${el.y})`}
              className={sel ? "ring-2 ring-amber-400" : "ring-1 ring-white/40 hover:ring-white/80"}
              style={{
                position: "absolute",
                left: Math.round(el.x * scale),
                top: Math.round(el.y * scale),
                width: Math.max(4, Math.round(el.width * scale)),
                height: Math.max(4, Math.round(el.height * scale)),
                cursor: "move",
                boxSizing: "border-box",
              }}
            >
              <span className="absolute -top-4 left-0 text-[10px] font-mono px-1 rounded bg-black/70 text-white whitespace-nowrap">{el.label}</span>
              {sel && (
                <span
                  onMouseDown={(e) => startDrag(e, el, "resize")}
                  className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-sm bg-amber-400 border border-black/40"
                  style={{ cursor: "nwse-resize" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-2 py-1.5 cursor-pointer">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer" />
      <span className="text-xs flex-1">{label}</span>
      <span className="text-[10px] font-mono opacity-50">{value}</span>
    </label>
  );
}

function FieldEditor({ label, field, onChange }) {
  const custom = field.source === "text";
  const templated = !custom && field.source !== "none";
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 space-y-1.5">
      <div className="text-xs font-semibold">{label}</div>
      <select className={INPUT} value={field.source} onChange={(e) => onChange({ ...field, source: e.target.value })}>
        {BINDINGS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
      </select>
      {(custom || templated) && (
        <input
          className={INPUT}
          placeholder={custom ? "Texte à afficher" : "Habillage facultatif, ex. « {value} s »"}
          value={field.text}
          onChange={(e) => onChange({ ...field, text: e.target.value })}
        />
      )}
    </div>
  );
}

export default function CanvasTab({ state, push }) {
  const canvas = state.canvas;
  const [selectedId, setSelectedId] = useState(canvas.banners[0]?.id ?? null);
  const [sampleTimer, setSampleTimer] = useState(true);
  const selected = canvas.banners.find((b) => b.id === selectedId);

  const updateCanvas = (patch) => push({ ...state, canvas: { ...canvas, ...patch } });
  const updateEl = (id, patch) =>
    updateCanvas({ banners: canvas.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const addEl = (el) => {
    const id = newId();
    updateCanvas({ banners: [...canvas.banners, { id, ...el }] });
    setSelectedId(id);
  };
  const addBanner = () =>
    addEl({ kind: "banner", label: `Bandeau ${canvas.banners.length + 1}`, x: 0, y: 0, width: Math.min(1920, canvas.width), height: Math.min(216, canvas.height), pageSize: 3, nameScale: 1, scoreScale: 1, showLogo: true });
  const addTimer = () => {
    const width = Math.min(640, canvas.width);
    addEl({ kind: "timer", label: "Chrono", x: Math.max(0, canvas.width - width), y: 0, width, height: Math.min(160, canvas.height), showName: false, align: "center", timeScale: 1 });
  };
  const addLowerThird = () => {
    const width = Math.min(1760, canvas.width - 160);
    const height = Math.min(250, canvas.height);
    addEl({ kind: "lowerThird", label: "Infographie", x: Math.round((canvas.width - width) / 2), y: Math.max(0, canvas.height - height - 40), width, height, ...LOWER_THIRD_DEFAULTS });
  };
  const duplicate = (el) => {
    const { id, ...rest } = el;
    void id;
    addEl({ ...rest, label: `${el.label} (copie)`, x: Math.min(canvas.width - el.width, el.x + 40), y: Math.min(canvas.height - el.height, el.y + 40) });
  };
  const removeEl = (id) => {
    const next = canvas.banners.filter((b) => b.id !== id);
    updateCanvas({ banners: next });
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };
  const moveEl = (id, patch) => {
    const el = canvas.banners.find((b) => b.id === id);
    if (!el) return;
    const width = Math.max(64, Math.min(canvas.width, patch.width ?? el.width));
    const height = Math.max(32, Math.min(canvas.height, patch.height ?? el.height));
    updateEl(id, {
      width,
      height,
      x: Math.max(0, Math.min(canvas.width - width, patch.x ?? el.x)),
      y: Math.max(0, Math.min(canvas.height - height, patch.y ?? el.y)),
    });
  };

  function buildCanvasUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("canvas", "1");
    return url.toString();
  }

  const numField = (key, label, min, max) => (
    <div>
      <Label htmlFor={`el-${key}`}>{label}</Label>
      <TextInput
        id={`el-${key}`}
        type="number"
        value={selected[key]}
        onChange={(e) => moveEl(selected.id, { [key]: Math.max(min, Math.min(max, Number(e.target.value) || 0)) })}
        inputMode="numeric"
      />
    </div>
  );

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Canevas</h2>
        <p className="text-sm opacity-70">
          Une fenêtre qui compose librement des bandeaux, un chrono et des infographies
          broadcast. Déplacez les éléments dans l'aperçu (poignée orange pour la taille).
          Fond vert ou transparent pour l'incrustation.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label htmlFor="cw">Largeur (px)</Label>
          <TextInput id="cw" type="number" value={canvas.width} onChange={(e) => updateCanvas({ width: Math.max(320, Number(e.target.value) || 0) })} inputMode="numeric" className="!w-28" />
        </div>
        <div>
          <Label htmlFor="ch">Hauteur (px)</Label>
          <TextInput id="ch" type="number" value={canvas.height} onChange={(e) => updateCanvas({ height: Math.max(64, Number(e.target.value) || 0) })} inputMode="numeric" className="!w-28" />
        </div>
        <div>
          <Label htmlFor="cbg">Fond</Label>
          <select id="cbg" className={`${INPUT} !w-64`} value={canvas.background in CANVAS_BACKGROUNDS ? canvas.background : "custom"} onChange={(e) => updateCanvas({ background: e.target.value === "custom" ? "#101010" : e.target.value })}>
            {Object.entries(CANVAS_BACKGROUNDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            <option value="custom">Couleur personnalisée…</option>
          </select>
        </div>
        {!(canvas.background in CANVAS_BACKGROUNDS) && (
          <input type="color" value={canvas.background} onChange={(e) => updateCanvas({ background: e.target.value })} className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer" aria-label="Couleur du fond" />
        )}
        <label className="flex items-center gap-2 select-none cursor-pointer text-sm ml-auto">
          <input type="checkbox" checked={sampleTimer} onChange={(e) => setSampleTimer(e.target.checked)} className="w-4 h-4" />
          Simuler un chrono dans l'aperçu
        </label>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-4">
        <div className="space-y-1.5">
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Éléments ({canvas.banners.length})</div>
          {canvas.banners.length === 0 && <div className="text-xs opacity-60 italic px-1 py-2">Aucun élément.</div>}
          {canvas.banners.map((b) => {
            const Icon = KIND_ICON[b.kind] ?? TvIcon;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={
                  "w-full text-left text-sm px-3 py-2 rounded-xl border transition cursor-pointer " +
                  (b.id === selectedId
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40")
                }
              >
                <div className="font-medium truncate flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  <span className="truncate">{b.label}</span>
                </div>
                <div className="text-[11px] opacity-70 tabular-nums">{KIND_LABEL[b.kind]} · {b.width}×{b.height} @ ({b.x},{b.y})</div>
              </button>
            );
          })}
          <div className="pt-2 space-y-1.5">
            {[
              ["Ajouter un bandeau", TvIcon, addBanner, ""],
              ["Ajouter un chrono", ClockIcon, addTimer, "border-emerald-400/60 text-emerald-700 dark:text-emerald-300"],
              ["Ajouter une infographie", RectangleStackIcon, addLowerThird, "border-rose-400/60 text-rose-700 dark:text-rose-300"],
            ].map(([label, Icon, fn, cls]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                className={`w-full inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer ${cls}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-2 tabular-nums text-center">Aperçu — {canvas.width}×{canvas.height} px</div>
          <CanvasEditor state={state} canvas={canvas} selectedId={selectedId} onSelect={setSelectedId} onMove={moveEl} showSampleTimer={sampleTimer} />
        </div>
      </div>

      {selected ? (
        <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <input
              type="text"
              value={selected.label}
              onChange={(e) => updateEl(selected.id, { label: e.target.value })}
              className="text-base font-semibold bg-transparent border-0 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-500 focus:outline-none px-0 py-0.5 flex-1 min-w-0"
              aria-label="Nom de l'élément"
            />
            <span className="text-xs opacity-60 flex-shrink-0">{KIND_LABEL[selected.kind]}</span>
            <button type="button" onClick={() => duplicate(selected)} className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Dupliquer
            </button>
            <button type="button" onClick={() => removeEl(selected.id)} className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer">
              <TrashIcon className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {numField("x", "X (px)", 0, canvas.width)}
            {numField("y", "Y (px)", 0, canvas.height)}
            {numField("width", "Largeur (px)", 64, canvas.width)}
            {numField("height", "Hauteur (px)", 32, canvas.height)}
          </div>

          {selected.kind === "banner" && (
            <>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div>
                  <Label htmlFor="bps">Entrées par page — {selected.pageSize}</Label>
                  <input id="bps" type="range" min="1" max="6" step="1" value={selected.pageSize} onChange={(e) => updateEl(selected.id, { pageSize: Number(e.target.value) })} className="w-full mt-1" />
                </div>
                <div>
                  <Label htmlFor="bns">Échelle nom — {Number(selected.nameScale).toFixed(2)}×</Label>
                  <input id="bns" type="range" min="0.6" max="2" step="0.05" value={selected.nameScale} onChange={(e) => updateEl(selected.id, { nameScale: Number(e.target.value) })} className="w-full mt-1" />
                </div>
                <div>
                  <Label htmlFor="bss">Échelle score — {Number(selected.scoreScale).toFixed(2)}×</Label>
                  <input id="bss" type="range" min="0.6" max="2" step="0.05" value={selected.scoreScale} onChange={(e) => updateEl(selected.id, { scoreScale: Number(e.target.value) })} className="w-full mt-1" />
                </div>
              </div>
              <label className="mt-4 flex items-center gap-2 select-none cursor-pointer">
                <input type="checkbox" checked={selected.showLogo !== false} onChange={(e) => updateEl(selected.id, { showLogo: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Afficher le logo Festival Western</span>
              </label>
            </>
          )}

          {selected.kind === "timer" && (
            <div className="grid md:grid-cols-3 gap-4 mt-4 items-end">
              <div>
                <Label htmlFor="tscale">Taille du temps — {Number(selected.timeScale).toFixed(2)}×</Label>
                <input id="tscale" type="range" min="0.5" max="1.5" step="0.05" value={selected.timeScale} onChange={(e) => updateEl(selected.id, { timeScale: Number(e.target.value) })} className="w-full mt-1" />
              </div>
              <div>
                <Label htmlFor="talign">Alignement</Label>
                <select id="talign" value={selected.align} onChange={(e) => updateEl(selected.id, { align: e.target.value })} className={`${INPUT} mt-1`}>
                  <option value="left">Gauche</option>
                  <option value="center">Centré</option>
                  <option value="right">Droite</option>
                </select>
              </div>
              <label className="flex items-center gap-2 select-none cursor-pointer pb-2">
                <input type="checkbox" checked={!!selected.showName} onChange={(e) => updateEl(selected.id, { showName: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">Afficher le nom du compétiteur</span>
              </label>
              <p className="md:col-span-3 text-xs opacity-60">
                Le temps apparaît pendant la course et reste affiché jusqu'à ce que l'arrivée soit validée ou annulée. Noir quand le chrono est désarmé.
              </p>
            </div>
          )}

          {selected.kind === "lowerThird" && (
            <div className="mt-4 grid lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">Champs</div>
                <FieldEditor label="Ligne principale" field={selected.fields.title} onChange={(f) => updateEl(selected.id, { fields: { ...selected.fields, title: f } })} />
                <FieldEditor label="Ligne secondaire" field={selected.fields.subtitle} onChange={(f) => updateEl(selected.id, { fields: { ...selected.fields, subtitle: f } })} />
                <FieldEditor label="Boîte de droite" field={selected.fields.box} onChange={(f) => updateEl(selected.id, { fields: { ...selected.fields, box: f } })} />
                <FieldEditor label="Étiquette de la boîte" field={selected.fields.boxLabel} onChange={(f) => updateEl(selected.id, { fields: { ...selected.fields, boxLabel: f } })} />
                <p className="text-[11px] opacity-60">L'infographie disparaît d'elle-même quand tous ses champs sont vides (ex. aucun compétiteur sélectionné).</p>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">Style</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <ColorRow label="Bordeaux (tuile, bande)" value={selected.style.primary} onChange={(v) => updateEl(selected.id, { style: { ...selected.style, primary: v } })} />
                  <ColorRow label="Charbon (barres)" value={selected.style.panel} onChange={(v) => updateEl(selected.id, { style: { ...selected.style, panel: v } })} />
                  <ColorRow label="Crème (liserés)" value={selected.style.light} onChange={(v) => updateEl(selected.id, { style: { ...selected.style, light: v } })} />
                  <ColorRow label="Texte" value={selected.style.text} onChange={(v) => updateEl(selected.id, { style: { ...selected.style, text: v } })} />
                </div>
                <div>
                  <Label htmlFor="ltfont">Police</Label>
                  <select id="ltfont" className={`${INPUT} mt-1`} value={selected.font} onChange={(e) => updateEl(selected.id, { font: e.target.value })}>
                    {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" checked={selected.showLogo !== false} onChange={(e) => updateEl(selected.id, { showLogo: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Tuile logo</span>
                </label>
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" checked={selected.animate !== false} onChange={(e) => updateEl(selected.id, { animate: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Animer l'entrée quand le texte change</span>
                </label>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 text-sm opacity-60 text-center py-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
          Sélectionnez un élément dans la liste ou l'aperçu pour modifier ses propriétés.
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <OutputLauncher
          buildUrl={buildCanvasUrl}
          windowName="rodeo-canvas"
          windowFeatures={`noopener,noreferrer,width=${canvas.width},height=${canvas.height}`}
          label="Ouvrir le canevas"
          icon={RectangleStackIcon}
          onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
          stacked
        />
      </div>
    </Card>
  );
}
