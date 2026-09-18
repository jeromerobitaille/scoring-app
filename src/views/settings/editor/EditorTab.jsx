import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowUpTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  RectangleStackIcon,
  TableCellsIcon,
  ViewColumnsIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import Card from "../../../components/ui/Card";
import OutputLauncher from "../../../components/FullscreenLauncher";
import OutputStage from "../../../components/outputs/OutputStage";
import { bus } from "../../../sync/SyncBus";
import { buildContext, isElementShown, outputStateOf } from "../../../state/context";
import { computeRanking } from "../../../utils/score";
import { BACKGROUNDS, ELEMENT_KINDS, OUTPUT_STATES, SIZE_PRESETS, createElement, newId, normalizeOutput } from "../../../state/outputs";
import { SAMPLE_ENTRIES, SAMPLE_ROSTER, SAMPLE_TIMER } from "../../../state/sample";
import { uploadImage } from "../../../state/media";
import { useOutputTimer, HOLD_TIME_MODE_MS, HOLD_SCORE_MODE_MS } from "../../../hooks/useLiveTimer";
import ElementProperties from "./ElementProperties";
import { BTN, BTN_DANGER, Field, INPUT, SMALL, Toggle } from "./inputs";

const KIND_ICON = { text: DocumentTextIcon, image: PhotoIcon, card: RectangleStackIcon, table: TableCellsIcon, carousel: ViewColumnsIcon, timer: ClockIcon };

/** Adresse d'une sortie, en gardant la connexion (net, room) de la page courante. */
function outputUrl(id) {
  const url = new URL(window.location.href);
  for (const k of ["settings", "tab", "display", "banner", "canvas", "bid", "w", "h"]) url.searchParams.delete(k);
  url.searchParams.set("output", id);
  return url.toString();
}

/**
 * Contexte d'aperçu : données réelles, complétées par des données d'exemple
 * quand il n'y a rien à montrer, et état forcé par le simulateur.
 */
function previewContext(state, liveFrame, sim, useSample) {
  const ctx = buildContext(state, liveFrame);
  let { ranked, byCompetitor, current, timerFrame } = ctx;
  if (useSample) {
    if (ranked.length === 0) {
      ranked = computeRanking(SAMPLE_ENTRIES[state.scoreMode] ?? SAMPLE_ENTRIES.higher, state.scoreMode);
      byCompetitor = new Map(SAMPLE_ROSTER.map((p) => [p.id, p]));
    }
    current ??= SAMPLE_ROSTER[0];
  }
  if (sim === "none") { ranked = []; timerFrame = null; }
  else if (sim === "running") { timerFrame = SAMPLE_TIMER; }
  else if (sim === "results") { timerFrame = null; }
  return { ...ctx, ranked, byCompetitor, current, timerFrame, outputState: outputStateOf(ranked, timerFrame) };
}

/** Aperçu réel à l'échelle ; les éléments se déplacent à la souris, poignée pour la taille. */
function StageEditor({ output, ctx, selectedId, onSelect, onMove, onNudge, onDelete }) {
  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(760);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWrapW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(wrapW / output.width, 480 / output.height);
  const previewW = Math.round(output.width * scale);
  const previewH = Math.round(output.height * scale);

  const dragRef = useRef(null);
  function startDrag(e, target, mode) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, x: target.x, y: target.y, w: target.width, h: target.height, id: target.id };
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

  function onKeyDown(e) {
    if (!selectedId) return;
    const step = e.shiftKey ? 10 : 1;
    const map = { ArrowLeft: { x: -step }, ArrowRight: { x: step }, ArrowUp: { y: -step }, ArrowDown: { y: step } };
    if (map[e.key]) { e.preventDefault(); onNudge(selectedId, map[e.key]); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onDelete(selectedId); }
  }

  return (
    <div ref={wrapRef} className="w-full">
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative mx-auto rounded-md border border-zinc-300 dark:border-zinc-700 overflow-hidden select-none outline-none focus:ring-2 focus:ring-amber-400/60"
        style={{
          width: previewW,
          height: previewH,
          backgroundImage:
            "linear-gradient(45deg,#8883 25%,transparent 25%),linear-gradient(-45deg,#8883 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#8883 75%),linear-gradient(-45deg,transparent 75%,#8883 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
        }}
        onMouseDown={() => onSelect(null)}
      >
        <div style={{ width: output.width, height: output.height, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
          <OutputStage output={output} ctx={ctx} />
        </div>
        {output.elements.map((el) => {
          const sel = el.id === selectedId;
          const shown = isElementShown(el, ctx);
          return (
            <div
              key={el.id}
              onMouseDown={(e) => { onSelect(el.id); startDrag(e, el, "move"); }}
              title={`${el.name} — ${el.width}×${el.height} @ (${el.x},${el.y})${shown ? "" : " · masqué dans cet état"}`}
              className={sel ? "ring-2 ring-amber-400 z-10" : shown ? "ring-1 ring-white/30 hover:ring-white/80" : "ring-1 ring-dashed ring-white/20 hover:ring-white/60"}
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
              {sel && (
                <>
                  <span className="absolute -top-4 left-0 text-[10px] font-mono px-1 rounded bg-amber-400 text-black whitespace-nowrap">{el.name}</span>
                  <span
                    onMouseDown={(e) => startDrag(e, el, "resize")}
                    className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-sm bg-amber-400 border border-black/40"
                    style={{ cursor: "nwse-resize" }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EditorTab({ state, push }) {
  const outputs = state.outputs;
  const [outputId, setOutputId] = useState(outputs[0]?.id ?? null);
  const output = outputs.find((o) => o.id === outputId) ?? outputs[0] ?? null;
  const [selectedId, setSelectedId] = useState(null);
  const [sim, setSim] = useState("auto");
  const [useSample, setUseSample] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const fileTargetRef = useRef(null); // id de l'image à remplacer, ou null = nouvel élément

  const liveFrame = useOutputTimer({
    enabled: state.timerArmed && state.showLiveTimer !== false,
    pendingRun: state.pendingRun,
    holdMs: state.scoreMode === "lower" ? HOLD_TIME_MODE_MS : HOLD_SCORE_MODE_MS,
  });
  const ctx = useMemo(() => previewContext(state, liveFrame, sim, useSample), [state, liveFrame, sim, useSample]);

  useEffect(() => {
    if (output && output.id !== outputId) setOutputId(output.id);
  }, [output, outputId]);

  // ── Sorties ──────────────────────────────────────────────────────────
  const setOutputs = (next) => push({ ...state, outputs: next });
  const updateOutput = (patch) => setOutputs(outputs.map((o) => (o.id === output.id ? { ...o, ...patch } : o)));
  const selectOutput = (id) => { setOutputId(id); setSelectedId(null); };
  const addOutput = (src) => {
    const created = normalizeOutput({ ...src, id: newId("out"), legacy: null });
    setOutputs([...outputs, created]);
    selectOutput(created.id);
  };
  const newOutput = () => addOutput({ name: `Sortie ${outputs.length + 1}`, width: 1920, height: 1080, background: "look", elements: [] });
  const duplicateOutput = () => addOutput({ ...output, name: `${output.name} (copie)`, elements: output.elements.map((e) => ({ ...e, id: newId() })) });
  const removeOutput = () => {
    if (outputs.length <= 1) return;
    if (!window.confirm(`Supprimer la sortie « ${output.name} » et tous ses éléments ?`)) return;
    const next = outputs.filter((o) => o.id !== output.id);
    setOutputs(next);
    selectOutput(next[0].id);
  };
  const applyPreset = (v) => {
    const p = SIZE_PRESETS[Number(v)];
    if (p) updateOutput({ width: p.width, height: p.height });
  };

  // ── Éléments ─────────────────────────────────────────────────────────
  const elements = output?.elements ?? [];
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const setElements = (next) => updateOutput({ elements: next });
  const updateEl = (id, patch) => setElements(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const moveEl = (id, patch) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const width = Math.max(8, Math.min(output.width, patch.width ?? el.width));
    const height = Math.max(8, Math.min(output.height, patch.height ?? el.height));
    updateEl(id, {
      width,
      height,
      x: Math.max(-width + 8, Math.min(output.width - 8, patch.x ?? el.x)),
      y: Math.max(-height + 8, Math.min(output.height - 8, patch.y ?? el.y)),
    });
  };
  const nudge = (id, d) => {
    const el = elements.find((e) => e.id === id);
    if (el) moveEl(id, { x: el.x + (d.x ?? 0), y: el.y + (d.y ?? 0) });
  };
  const addEl = (kind, patch = {}) => {
    const el = createElement(kind, patch, output);
    // Par défaut : centré, taille réduite si la sortie est plus petite.
    const width = Math.min(el.width, output.width);
    const height = Math.min(el.height, output.height);
    const placed = { ...el, width, height, x: patch.x ?? Math.round((output.width - width) / 2), y: patch.y ?? Math.round((output.height - height) / 2) };
    setElements([...elements, placed]);
    setSelectedId(placed.id);
  };
  const duplicateEl = (id) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const copy = { ...el, id: newId(), name: `${el.name} (copie)`, x: Math.min(output.width - el.width, el.x + 40), y: Math.min(output.height - el.height, el.y + 40) };
    setElements([...elements, copy]);
    setSelectedId(copy.id);
  };
  const removeEl = (id) => {
    setElements(elements.filter((e) => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const reorder = (id, dir) => {
    const i = elements.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= elements.length) return;
    const next = [...elements];
    [next[i], next[j]] = [next[j], next[i]];
    setElements(next);
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
      if (targetId && elements.some((el) => el.id === targetId)) {
        updateEl(targetId, { src: url });
      } else {
        const fit = Math.min(1, output.width / (iw || output.width), output.height / (ih || output.height));
        const width = Math.round((iw || output.width) * fit);
        const height = Math.round((ih || Math.round(output.height / 4)) * fit);
        addEl("image", { name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Image", src: url, fit: "fill", width, height, x: Math.round((output.width - width) / 2), y: output.height - height });
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(outputUrl(output.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* presse-papiers indisponible */ }
  }

  if (!output) return null;
  const presetIndex = SIZE_PRESETS.findIndex((p) => p.width === output.width && p.height === output.height);
  const isCustomBg = !(output.background in BACKGROUNDS);

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Éditeur de sorties</h2>
        <p className="text-sm opacity-70">
          Chaque sortie (tableau, bandeau LED, canevas OBS…) est une scène composée d'éléments : texte avec variables,
          image, carte, tableau, carrousel, chrono. Chaque élément peut n'apparaître que dans certains états
          (aucun résultat / en course / affichage des résultats).
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} className="hidden" />

      {/* Sorties */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {outputs.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => selectOutput(o.id)}
            className={
              "px-3 py-1.5 rounded-xl text-sm border transition cursor-pointer " +
              (o.id === output.id
                ? "border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40")
            }
          >
            {o.name} <span className="opacity-60 text-xs tabular-nums">{o.width}×{o.height}</span>
          </button>
        ))}
        <button type="button" onClick={newOutput} className={BTN}><PlusIcon className="w-3.5 h-3.5" /> Nouvelle sortie</button>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nom" className="w-44">
            <input className={SMALL} value={output.name} onChange={(e) => updateOutput({ name: e.target.value })} />
          </Field>
          <Field label="Taille">
            <select className={SMALL} value={presetIndex >= 0 ? String(presetIndex) : "custom"} onChange={(e) => applyPreset(e.target.value)}>
              {SIZE_PRESETS.map((p, i) => <option key={i} value={String(i)}>{p.label}</option>)}
              <option value="custom">Personnalisée</option>
            </select>
          </Field>
          <Field label="Largeur" className="w-20">
            <input type="number" className={SMALL} value={output.width} min={64} max={8192} onChange={(e) => updateOutput({ width: Math.max(64, Number(e.target.value) || 0) })} />
          </Field>
          <Field label="Hauteur" className="w-20">
            <input type="number" className={SMALL} value={output.height} min={32} max={8192} onChange={(e) => updateOutput({ height: Math.max(32, Number(e.target.value) || 0) })} />
          </Field>
          <Field label="Fond" className="w-56">
            <div className="flex gap-1">
              <select className={SMALL} value={isCustomBg ? "custom" : output.background} onChange={(e) => updateOutput({ background: e.target.value === "custom" ? "#101010" : e.target.value })}>
                {Object.entries(BACKGROUNDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                <option value="custom">Couleur personnalisée…</option>
              </select>
              {isCustomBg && <input type="color" value={output.background} onChange={(e) => updateOutput({ background: e.target.value })} className="w-8 h-7 flex-shrink-0 rounded-md border-0 bg-transparent cursor-pointer" aria-label="Couleur du fond" />}
            </div>
          </Field>
          <button type="button" onClick={duplicateOutput} className={BTN}><DocumentDuplicateIcon className="w-3.5 h-3.5" /> Dupliquer</button>
          <button type="button" onClick={removeOutput} disabled={outputs.length <= 1} className={BTN_DANGER}><TrashIcon className="w-3.5 h-3.5" /> Supprimer</button>
        </div>
        <div className="flex flex-col items-end gap-2">
          <OutputLauncher
            buildUrl={() => outputUrl(output.id)}
            windowName={`fwst-output-${output.id}`}
            windowFeatures={`noopener,noreferrer,width=${output.width},height=${output.height}`}
            label="Ouvrir la sortie"
            icon={ArrowTopRightOnSquareIcon}
            onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
          />
          <button type="button" onClick={copyUrl} className={BTN} title="Adresse à coller dans une source navigateur OBS ou un autre poste">
            <ClipboardDocumentIcon className="w-3.5 h-3.5" /> {copied ? "Adresse copiée" : "Copier l'adresse"}
          </button>
        </div>
      </div>

      {/* Simulateur d'état */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        <span className="opacity-60 uppercase tracking-wide">Aperçu</span>
        <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
          {[["auto", "Réel"], ...OUTPUT_STATES.map((s) => [s.key, s.label])].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSim(k)}
              className={"px-2.5 py-1 cursor-pointer " + (sim === k ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
            >
              {l}
            </button>
          ))}
        </div>
        <Toggle label="Données d'exemple s'il n'y a rien à afficher" checked={useSample} onChange={setUseSample} />
        <span className="ml-auto opacity-60">
          État affiché : <b>{OUTPUT_STATES.find((s) => s.key === ctx.outputState)?.label}</b>
        </span>
      </div>

      <div className="grid md:grid-cols-[230px_1fr] gap-4">
        {/* Liste des éléments (le premier est au-dessus) */}
        <div className="space-y-1.5 min-w-0">
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Éléments ({elements.length})</div>
          {elements.length === 0 && <div className="text-xs opacity-60 italic px-1 py-2">Aucun élément. Ajoutez-en ci-dessous.</div>}
          {[...elements].reverse().map((el) => {
            const Icon = KIND_ICON[el.kind];
            const sel = el.id === selectedId;
            const shown = isElementShown(el, ctx);
            return (
              <div
                key={el.id}
                className={
                  "group flex items-center gap-1 rounded-xl border pl-2 pr-1 py-1 text-sm cursor-pointer " +
                  (sel
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40")
                }
                onClick={() => setSelectedId(el.id)}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${shown ? "opacity-70" : "opacity-30"}`} />
                <span className={`truncate flex-1 ${shown ? "" : "opacity-50"}`} title={`${ELEMENT_KINDS[el.kind].label} · ${el.width}×${el.height} @ (${el.x},${el.y})`}>{el.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); updateEl(el.id, { visible: !el.visible }); }} className="p-0.5 rounded opacity-60 hover:opacity-100 cursor-pointer" title={el.visible ? "Masquer" : "Afficher"}>
                  {el.visible ? <EyeIcon className="w-3.5 h-3.5" /> : <EyeSlashIcon className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); reorder(el.id, 1); }} className="p-0.5 rounded opacity-40 hover:opacity-100 cursor-pointer" title="Monter (au-dessus)">
                  <ChevronUpIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); reorder(el.id, -1); }} className="p-0.5 rounded opacity-40 hover:opacity-100 cursor-pointer" title="Descendre (en dessous)">
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <div className="pt-2">
            <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Ajouter</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(ELEMENT_KINDS).map(([kind, k]) => {
                const Icon = KIND_ICON[kind];
                return (
                  <button key={kind} type="button" onClick={() => addEl(kind)} title={k.description} className="inline-flex items-center justify-center gap-1.5 text-xs px-2 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                    <Icon className="w-3.5 h-3.5" /> {k.label}
                  </button>
                );
              })}
              <button type="button" onClick={() => pickImage(null)} disabled={uploading} className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs px-2 py-2 rounded-xl border border-dashed border-rose-400/60 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 cursor-pointer">
                <ArrowUpTrayIcon className="w-3.5 h-3.5" /> {uploading ? "Téléversement…" : "Téléverser une image (infographie)"}
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{uploadError}</p>}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-xs opacity-60 mb-2 tabular-nums text-center">
            {output.name} — {output.width}×{output.height} px · glisser pour déplacer, coin pour la taille, flèches pour ajuster (Maj = 10 px)
          </div>
          <StageEditor output={output} ctx={ctx} selectedId={selectedId} onSelect={setSelectedId} onMove={moveEl} onNudge={nudge} onDelete={removeEl} />
        </div>
      </div>

      <div className="mt-4">
        {selected ? (
          <ElementProperties
            el={selected}
            output={output}
            onChange={updateEl}
            onMove={moveEl}
            onDuplicate={duplicateEl}
            onRemove={removeEl}
            onPickImage={pickImage}
            uploading={uploading}
          />
        ) : (
          <div className="text-sm opacity-60 text-center py-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
            Sélectionnez un élément dans la liste ou l'aperçu pour modifier ses propriétés.
          </div>
        )}
      </div>
    </Card>
  );
}
