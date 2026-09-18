import React, { useEffect, useRef, useState } from "react";
import {
  TrashIcon,
  ClockIcon,
  TvIcon,
  PhotoIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import Card from "../../components/ui/Card";
import Label from "../../components/ui/Label";
import TextInput from "../../components/ui/TextInput";
import OutputLauncher from "../../components/FullscreenLauncher";
import CanvasStage from "../../components/outputs/CanvasStage";
import { CANVAS_BACKGROUNDS } from "../../state/canvas";
import { bus } from "../../sync/SyncBus";
import { FONTS } from "../../state/look";
import { VARIABLES } from "../../state/bindings";
import { GRAPHIC_LAYER_DEFAULTS } from "../../state/useSyncedState";
import { uploadImage } from "../../state/media";

const INPUT =
  "w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";
const SMALL =
  "w-full min-w-0 rounded-lg border px-2 py-1 text-xs outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";
const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

// Chrono d'exemple pour l'aperçu quand aucun vrai chrono ne tourne.
const PREVIEW_TIMER = { seconds: 6.42, state: "running", runId: 0, session: "preview" };

const KIND_ICON = { banner: TvIcon, timer: ClockIcon, graphic: PhotoIcon };
const KIND_LABEL = { banner: "Bandeau", timer: "Chrono", graphic: "Infographie" };

/**
 * Aperçu réel du canevas, à l'échelle. Les éléments (et les calques de
 * l'infographie sélectionnée) se déplacent à la souris ; le coin bas-droit
 * redimensionne.
 */
function CanvasEditor({ state, canvas, selectedId, selectedLayerId, onSelect, onSelectLayer, onMove, onMoveLayer, showSampleTimer }) {
  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWrapW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(wrapW / canvas.width, 460 / canvas.height);
  const previewW = Math.round(canvas.width * scale);
  const previewH = Math.round(canvas.height * scale);

  const dragRef = useRef(null);
  function startDrag(e, target, mode, apply) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, x: target.x, y: target.y, w: target.width, h: target.height };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / scale;
      const dy = (ev.clientY - d.startY) / scale;
      if (d.mode === "move") apply({ x: Math.round(d.x + dx), y: Math.round(d.y + dy) });
      else apply({ width: Math.round(d.w + dx), height: Math.round(d.h + dy) });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const selectedEl = canvas.banners.find((b) => b.id === selectedId);
  const layers = selectedEl?.kind === "graphic" ? selectedEl.layers : [];

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
        onMouseDown={() => { onSelect(null); onSelectLayer(null); }}
      >
        <div style={{ width: canvas.width, height: canvas.height, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          <CanvasStage state={state} timerFrame={showSampleTimer ? PREVIEW_TIMER : null} width={canvas.width} height={canvas.height} />
        </div>

        {/* Calque d'édition : éléments */}
        {canvas.banners.map((el) => {
          const sel = el.id === selectedId;
          return (
            <div
              key={el.id}
              onMouseDown={(e) => { onSelect(el.id); onSelectLayer(null); startDrag(e, el, "move", (p) => onMove(el.id, p)); }}
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
                  onMouseDown={(e) => startDrag(e, el, "resize", (p) => onMove(el.id, p))}
                  className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-sm bg-amber-400 border border-black/40"
                  style={{ cursor: "nwse-resize" }}
                />
              )}
            </div>
          );
        })}

        {/* Calque d'édition : calques de texte de l'infographie sélectionnée */}
        {selectedEl &&
          layers.map((l) => {
            const sel = l.id === selectedLayerId;
            return (
              <div
                key={l.id}
                onMouseDown={(e) => { onSelectLayer(l.id); startDrag(e, l, "move", (p) => onMoveLayer(selectedEl.id, l.id, p)); }}
                title={l.text}
                className={sel ? "ring-2 ring-sky-400" : "ring-1 ring-sky-300/60 hover:ring-sky-300"}
                style={{
                  position: "absolute",
                  left: Math.round((selectedEl.x + l.x) * scale),
                  top: Math.round((selectedEl.y + l.y) * scale),
                  width: Math.max(4, Math.round(l.width * scale)),
                  height: Math.max(4, Math.round(l.height * scale)),
                  cursor: "move",
                  boxSizing: "border-box",
                  zIndex: 5,
                }}
              >
                {sel && (
                  <span
                    onMouseDown={(e) => startDrag(e, l, "resize", (p) => onMoveLayer(selectedEl.id, l.id, p))}
                    className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-sm bg-sky-400 border border-black/40"
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

/** Réglages d'un calque de texte. */
function LayerEditor({ layer, onChange, onRemove, onDuplicate }) {
  const num = (key, label, min, max, step = 1) => (
    <label className="block">
      <span className="text-[11px] opacity-60">{label}</span>
      <input
        type="number"
        className={SMALL}
        value={layer[key]}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  const toggle = (key, label) => (
    <label className="flex items-center gap-1.5 select-none cursor-pointer text-xs">
      <input type="checkbox" checked={!!layer[key]} onChange={(e) => onChange({ [key]: e.target.checked })} className="w-3.5 h-3.5" />
      {label}
    </label>
  );
  return (
    <div className="rounded-xl border border-sky-300/60 dark:border-sky-800 p-3 space-y-2 bg-sky-50/40 dark:bg-sky-950/20">
      <div className="flex items-center gap-2">
        <input
          className={INPUT}
          value={layer.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Texte avec variables, ex. {competitor.name}"
          aria-label="Texte du calque"
        />
        <select
          className={`${INPUT} !w-44`}
          value=""
          onChange={(e) => { if (e.target.value) onChange({ text: `${layer.text}{${e.target.value}}` }); }}
          aria-label="Insérer une variable"
        >
          <option value="">+ variable…</option>
          {VARIABLES.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {num("x", "X", -4000, 8000)}
        {num("y", "Y", -4000, 8000)}
        {num("width", "Largeur", 8, 8000)}
        {num("height", "Hauteur", 8, 4000)}
      </div>
      <div className="grid grid-cols-4 gap-1.5 items-end">
        <label className="block col-span-2">
          <span className="text-[11px] opacity-60">Police</span>
          <select className={SMALL} value={layer.font} onChange={(e) => onChange({ font: e.target.value })}>
            {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
          </select>
        </label>
        {num("size", "Taille (px)", 6, 600)}
        <label className="block">
          <span className="text-[11px] opacity-60">Couleur</span>
          <input type="color" value={layer.color} onChange={(e) => onChange({ color: e.target.value })} className="block w-full h-7 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer" />
        </label>
      </div>
      <div className="grid grid-cols-4 gap-1.5 items-end">
        <label className="block">
          <span className="text-[11px] opacity-60">Horizontal</span>
          <select className={SMALL} value={layer.align} onChange={(e) => onChange({ align: e.target.value })}>
            <option value="left">Gauche</option><option value="center">Centré</option><option value="right">Droite</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] opacity-60">Vertical</span>
          <select className={SMALL} value={layer.valign} onChange={(e) => onChange({ valign: e.target.value })}>
            <option value="top">Haut</option><option value="middle">Milieu</option><option value="bottom">Bas</option>
          </select>
        </label>
        {num("letterSpacing", "Interlettrage (em)", -0.1, 1, 0.01)}
        <div className="flex flex-col gap-1 pb-1">
          {toggle("bold", "Gras")}
          {toggle("uppercase", "Majuscules")}
          {toggle("shadow", "Ombre")}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
          <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Dupliquer
        </button>
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer">
          <TrashIcon className="w-3.5 h-3.5" /> Retirer
        </button>
      </div>
    </div>
  );
}

export default function CanvasTab({ state, push }) {
  const canvas = state.canvas;
  const [selectedId, setSelectedId] = useState(canvas.banners[0]?.id ?? null);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [sampleTimer, setSampleTimer] = useState(true);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const fileTargetRef = useRef(null); // id de l'élément dont on remplace l'image, ou null = nouveau
  const selected = canvas.banners.find((b) => b.id === selectedId);

  const updateCanvas = (patch) => push({ ...state, canvas: { ...canvas, ...patch } });
  const updateEl = (id, patch) =>
    updateCanvas({ banners: canvas.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const addEl = (el) => {
    const id = newId("c");
    updateCanvas({ banners: [...canvas.banners, { id, ...el }] });
    setSelectedId(id);
    setSelectedLayerId(null);
    return id;
  };
  const addBanner = () =>
    addEl({ kind: "banner", label: `Bandeau ${canvas.banners.length + 1}`, x: 0, y: 0, width: Math.min(1920, canvas.width), height: Math.min(216, canvas.height), pageSize: 3, nameScale: 1, scoreScale: 1, showLogo: true });
  const addTimer = () => {
    const width = Math.min(640, canvas.width);
    addEl({ kind: "timer", label: "Chrono", x: Math.max(0, canvas.width - width), y: 0, width, height: Math.min(160, canvas.height), showName: false, align: "center", timeScale: 1 });
  };
  const pickImage = (targetId) => {
    fileTargetRef.current = targetId;
    fileRef.current?.click();
  };
  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { url, width: iw, height: ih } = await uploadImage(file);
      const targetId = fileTargetRef.current;
      if (targetId) {
        updateEl(targetId, { image: url });
      } else {
        // Nouvel élément : taille de l'image, réduite si elle dépasse le canevas.
        const fit = Math.min(1, canvas.width / (iw || canvas.width), canvas.height / (ih || canvas.height));
        const width = Math.round((iw || canvas.width) * fit);
        const height = Math.round((ih || Math.round(canvas.height / 4)) * fit);
        addEl({
          kind: "graphic",
          label: `Infographie ${canvas.banners.filter((b) => b.kind === "graphic").length + 1}`,
          x: Math.round((canvas.width - width) / 2),
          y: canvas.height - height,
          width,
          height,
          image: url,
          keyColor: null,
          keyTolerance: 0.35,
          hideWhenEmpty: true,
          animate: true,
          layers: [{ ...GRAPHIC_LAYER_DEFAULTS, id: newId("l"), x: Math.round(width * 0.2), y: Math.round(height * 0.35), width: Math.round(width * 0.4), height: Math.round(height * 0.3), size: Math.round(height * 0.22) }],
        });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }
  const duplicate = (el) => {
    const { id, ...rest } = el;
    void id;
    addEl({ ...rest, label: `${el.label} (copie)`, x: Math.min(canvas.width - el.width, el.x + 40), y: Math.min(canvas.height - el.height, el.y + 40) });
  };
  const removeEl = (id) => {
    const next = canvas.banners.filter((b) => b.id !== id);
    updateCanvas({ banners: next });
    if (selectedId === id) { setSelectedId(next[0]?.id ?? null); setSelectedLayerId(null); }
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

  // Calques de texte
  const updateLayer = (elId, layerId, patch) => {
    const el = canvas.banners.find((b) => b.id === elId);
    if (!el) return;
    updateEl(elId, { layers: el.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) });
  };
  const moveLayer = (elId, layerId, patch) => {
    const el = canvas.banners.find((b) => b.id === elId);
    const l = el?.layers.find((x) => x.id === layerId);
    if (!l) return;
    updateLayer(elId, layerId, {
      x: patch.x ?? l.x,
      y: patch.y ?? l.y,
      width: Math.max(8, patch.width ?? l.width),
      height: Math.max(8, patch.height ?? l.height),
    });
  };
  const addLayer = (el) => {
    const id = newId("l");
    updateEl(el.id, { layers: [...el.layers, { ...GRAPHIC_LAYER_DEFAULTS, id, y: 40 + el.layers.length * 90 }] });
    setSelectedLayerId(id);
  };
  const duplicateLayer = (el, l) => {
    const id = newId("l");
    updateEl(el.id, { layers: [...el.layers, { ...l, id, y: l.y + 60 }] });
    setSelectedLayerId(id);
  };
  const removeLayer = (el, layerId) => {
    updateEl(el.id, { layers: el.layers.filter((l) => l.id !== layerId) });
    if (selectedLayerId === layerId) setSelectedLayerId(null);
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
          Une fenêtre qui compose librement des bandeaux, un chrono et vos infographies
          broadcast (image fournie par l'équipe + textes avec variables). Déplacez les
          éléments dans l'aperçu ; poignée dans le coin pour la taille.
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} className="hidden" />

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
                onClick={() => { setSelectedId(b.id); setSelectedLayerId(null); }}
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
            <button type="button" onClick={addBanner} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
              <TvIcon className="w-4 h-4" /> Ajouter un bandeau
            </button>
            <button type="button" onClick={addTimer} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-dashed border-emerald-400/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer">
              <ClockIcon className="w-4 h-4" /> Ajouter un chrono
            </button>
            <button type="button" onClick={() => pickImage(null)} disabled={uploading} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-dashed border-rose-400/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer">
              <ArrowUpTrayIcon className="w-4 h-4" /> {uploading ? "Téléversement…" : "Ajouter une infographie (image)"}
            </button>
            {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}
          </div>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-2 tabular-nums text-center">Aperçu — {canvas.width}×{canvas.height} px</div>
          <CanvasEditor
            state={state}
            canvas={canvas}
            selectedId={selectedId}
            selectedLayerId={selectedLayerId}
            onSelect={setSelectedId}
            onSelectLayer={setSelectedLayerId}
            onMove={moveEl}
            onMoveLayer={moveLayer}
            showSampleTimer={sampleTimer}
          />
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

          {selected.kind === "graphic" && (
            <div className="mt-4 grid lg:grid-cols-[260px_1fr] gap-4">
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide opacity-60">Image</div>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 bg-[repeating-conic-gradient(#8883_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                  {selected.image ? (
                    <img src={selected.image} alt="" className="w-full h-auto rounded-md" />
                  ) : (
                    <div className="text-xs opacity-60 italic p-3 text-center">Aucune image</div>
                  )}
                </div>
                <button type="button" onClick={() => pickImage(selected.id)} disabled={uploading} className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer">
                  <ArrowUpTrayIcon className="w-4 h-4" /> Remplacer l'image…
                </button>
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" checked={!!selected.keyColor} onChange={(e) => updateEl(selected.id, { keyColor: e.target.checked ? "#00ff00" : null })} className="w-4 h-4" />
                  <span className="text-sm">Rendre une couleur transparente</span>
                </label>
                {selected.keyColor && (
                  <div className="space-y-2 pl-6">
                    <ColorRow label="Couleur à effacer" value={selected.keyColor} onChange={(v) => updateEl(selected.id, { keyColor: v })} />
                    <div>
                      <Label htmlFor="ktol">Tolérance — {Math.round(selected.keyTolerance * 100)} %</Label>
                      <input id="ktol" type="range" min="0.05" max="0.8" step="0.01" value={selected.keyTolerance} onChange={(e) => updateEl(selected.id, { keyTolerance: Number(e.target.value) })} className="w-full mt-1" />
                    </div>
                    <p className="text-[11px] opacity-60">Le fond vert du gabarit devient transparent dans l'app : avec un fond de canevas transparent, OBS l'affiche sans incrustation.</p>
                  </div>
                )}
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" checked={selected.hideWhenEmpty !== false} onChange={(e) => updateEl(selected.id, { hideWhenEmpty: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Masquer quand tous les textes sont vides</span>
                </label>
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" checked={selected.animate !== false} onChange={(e) => updateEl(selected.id, { animate: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm">Animer l'entrée quand le sujet change</span>
                </label>
              </div>

              <div className="space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wide opacity-60">Calques de texte ({selected.layers.length})</div>
                  <button type="button" onClick={() => addLayer(selected)} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-sky-400/60 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer">
                    <PlusIcon className="w-3.5 h-3.5" /> Ajouter un texte
                  </button>
                </div>
                {selected.layers.length === 0 && (
                  <p className="text-xs opacity-60 italic">Aucun calque. Ajoutez un texte, puis placez-le sur l'image dans l'aperçu.</p>
                )}
                {selected.layers.map((l) => (
                  <div key={l.id}>
                    {l.id === selectedLayerId ? (
                      <LayerEditor
                        layer={l}
                        onChange={(patch) => updateLayer(selected.id, l.id, patch)}
                        onRemove={() => removeLayer(selected, l.id)}
                        onDuplicate={() => duplicateLayer(selected, l)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedLayerId(l.id)}
                        className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 cursor-pointer"
                      >
                        <span className="font-mono text-xs truncate block">{l.text || "(vide)"}</span>
                        <span className="text-[11px] opacity-60 tabular-nums">{FONTS[l.font]?.label} · {l.size} px · ({l.x},{l.y}) {l.width}×{l.height}</span>
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-[11px] opacity-60">
                  Variables : {VARIABLES.map((v) => `{${v.key}}`).join(" ")}
                </p>
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
          icon={PhotoIcon}
          onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
          stacked
        />
      </div>
    </Card>
  );
}
