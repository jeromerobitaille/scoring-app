import React, { useEffect, useRef, useState } from "react";
import { useNaturalSize } from "../../../components/outputs/elements/imageCrop";
import { resolveImageSrc } from "../../../state/assets";
import { BTN, NumberField } from "./inputs";

const FULL = { x: 0, y: 0, w: 1, h: 1 };
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Recadrage d'une image : rectangle à déplacer (intérieur) ou redimensionner
 * (coin bas-droit) sur l'image entière ; valeurs en fraction de l'image.
 */
export default function CropEditor({ el, onChange, onFitHeight }) {
  const url = resolveImageSrc(el.src);
  const natural = useNaturalSize(url);
  const crop = el.crop ?? FULL;
  const wrapRef = useRef(null);
  const [wrapW, setWrapW] = useState(260);
  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWrapW(e.contentRect.width));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  const aspect = natural ? natural.w / natural.h : 16 / 9;
  const dispW = Math.max(1, wrapW);
  const dispH = Math.round(dispW / aspect);

  const set = (next) => {
    const w = clamp(next.w, 0.02, 1);
    const h = clamp(next.h, 0.02, 1);
    onChange({ crop: { x: clamp(next.x, 0, 1 - w), y: clamp(next.y, 0, 1 - h), w, h } });
  };

  const dragRef = useRef(null);
  function startDrag(e, mode) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, ...crop };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / dispW;
      const dy = (ev.clientY - d.startY) / dispH;
      if (d.mode === "move") set({ ...d, x: d.x + dx, y: d.y + dy });
      else set({ ...d, w: d.w + dx, h: d.h + dy });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  const pct = (v) => Math.round(v * 1000) / 10;
  const fromPct = (v) => v / 100;

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="w-full">
        <div
          className="relative overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 select-none bg-[repeating-conic-gradient(#8883_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]"
          style={{ width: dispW, height: dispH }}
        >
          {url && <img src={url} alt="" draggable={false} className="absolute inset-0 w-full h-full" style={{ objectFit: "fill" }} />}
          {/* Voile hors recadrage */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", left: crop.x * dispW, top: crop.y * dispH, width: crop.w * dispW, height: crop.h * dispH, position: "absolute", inset: "auto" }} />
          <div
            onMouseDown={(e) => startDrag(e, "move")}
            className="absolute ring-2 ring-sky-400 cursor-move"
            style={{ left: crop.x * dispW, top: crop.y * dispH, width: crop.w * dispW, height: crop.h * dispH, boxSizing: "border-box" }}
          >
            <span
              onMouseDown={(e) => startDrag(e, "resize")}
              className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-sm bg-sky-400 border border-black/40"
              style={{ cursor: "nwse-resize" }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <NumberField label="X %" value={pct(crop.x)} onChange={(v) => set({ ...crop, x: fromPct(v) })} min={0} max={100} step={0.5} />
        <NumberField label="Y %" value={pct(crop.y)} onChange={(v) => set({ ...crop, y: fromPct(v) })} min={0} max={100} step={0.5} />
        <NumberField label="Larg. %" value={pct(crop.w)} onChange={(v) => set({ ...crop, w: fromPct(v) })} min={2} max={100} step={0.5} />
        <NumberField label="Haut. %" value={pct(crop.h)} onChange={(v) => set({ ...crop, h: fromPct(v) })} min={2} max={100} step={0.5} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onChange({ crop: null })} disabled={!el.crop} className={BTN}>Image entière</button>
        <button
          type="button"
          onClick={() => natural && onFitHeight(Math.round(el.width * ((natural.h * crop.h) / (natural.w * crop.w))))}
          disabled={!natural}
          className={BTN}
          title="Donne à l'élément les proportions de la zone recadrée"
        >
          Ajuster la hauteur de l'élément
        </button>
      </div>
      {natural && (
        <p className="text-[11px] opacity-60 tabular-nums">
          Image {natural.w} × {natural.h} px · zone {Math.round(natural.w * crop.w)} × {Math.round(natural.h * crop.h)} px
        </p>
      )}
    </div>
  );
}
