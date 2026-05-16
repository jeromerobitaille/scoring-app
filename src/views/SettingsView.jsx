import React, { useEffect, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import Tabs from "../components/ui/Tabs";
import { bus } from "../sync/SyncBus";
import {
  ComputerDesktopIcon,
  TvIcon,
  QrCodeIcon,
  Squares2X2Icon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import ShareConnection from "../components/ShareConnection";
import ThemeToggle from "../components/ui/ThemeToggle";
import OutputLauncher from "../components/FullscreenLauncher";

function BannerPreview({ width, height }) {
  const w = Math.max(1, Number(width) || 0);
  const h = Math.max(1, Number(height) || 0);
  const maxW = 320;
  const maxH = 80;
  const scale = Math.min(maxW / w, maxH / h, 1);
  const dispW = Math.round(w * scale);
  const dispH = Math.round(h * scale);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-gradient-to-r from-zinc-900 to-black flex items-center justify-center text-[10px] text-white/60 font-mono"
        style={{ width: dispW, height: Math.max(dispH, 6) }}
      >
        {dispH >= 14 ? `${w}×${h}` : ""}
      </div>
      <div className="text-[11px] opacity-60 tabular-nums">
        {w} × {h} px · ratio {(w / h).toFixed(2)}:1
      </div>
    </div>
  );
}

function DisplayPreview({ pageSize, showPagination }) {
  const rows = Math.min(10, Math.max(1, pageSize));
  return (
    <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-3 w-full max-w-xs">
      <div className="h-3 mb-2 rounded bg-zinc-300 dark:bg-zinc-700 mx-auto" style={{ width: "60%" }} />
      <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, i) => {
          const medalColor =
            i === 0 ? "bg-amber-400"
              : i === 1 ? "bg-zinc-300"
              : i === 2 ? "bg-orange-700"
              : "bg-zinc-500/40 dark:bg-zinc-700";
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-white/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800"
            >
              <span className={`w-3 h-3 rounded-full ${medalColor}`} />
              <span className="flex-1 h-1.5 rounded bg-zinc-300 dark:bg-zinc-700" />
              <span className="w-6 h-1.5 rounded bg-zinc-400 dark:bg-zinc-600" />
            </div>
          );
        })}
      </div>
      {showPagination && (
        <div className="mt-2 flex justify-center gap-1">
          <span className="w-1 h-1 rounded-full bg-zinc-800 dark:bg-zinc-200" />
          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
      )}
    </div>
  );
}

function QrTab() {
  return <ShareConnection />;
}

function BannerConfigSection({ banner, index, state, push }) {
  const updateBanner = (patch) => {
    const next = state.banners.map((b, i) => (i === index ? { ...b, ...patch } : b));
    push({ ...state, banners: next });
  };

  const id = (suffix) => `b${index}-${suffix}`;

  function buildBannerUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("banner", "1");
    url.searchParams.set("bid", String(index));
    url.searchParams.set("w", String(banner.width));
    url.searchParams.set("h", String(banner.height));
    return url.toString();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="mb-4">
        <input
          type="text"
          value={banner.label}
          onChange={(e) => updateBanner({ label: e.target.value })}
          className="text-base font-semibold bg-transparent border-0 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-500 focus:outline-none px-0 py-0.5 w-full"
          aria-label="Nom du bandeau"
        />
        <p className="text-xs opacity-60 mt-1">
          {banner.width} × {banner.height} px · {banner.pageSize} entrée{banner.pageSize > 1 ? "s" : ""} par page
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={id("w")}>Largeur (px)</Label>
              <TextInput
                id={id("w")}
                type="number"
                value={banner.width}
                onChange={(e) => updateBanner({ width: Math.max(320, Number(e.target.value) || 0) })}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor={id("h")}>Hauteur (px)</Label>
              <TextInput
                id={id("h")}
                type="number"
                value={banner.height}
                onChange={(e) => updateBanner({ height: Math.max(64, Number(e.target.value) || 0) })}
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={id("pageSize")}>
              Entrées par page — {banner.pageSize}
            </Label>
            <input
              id={id("pageSize")}
              type="range"
              min="1" max="6" step="1"
              value={banner.pageSize}
              onChange={(e) => updateBanner({ pageSize: Number(e.target.value) })}
              className="w-full mt-1"
            />
          </div>

          <div>
            <Label htmlFor={id("nameScale")}>
              Taille du nom — {Number(banner.nameScale).toFixed(2)}×
            </Label>
            <input
              id={id("nameScale")}
              type="range"
              min="0.6" max="2" step="0.05"
              value={banner.nameScale}
              onChange={(e) => updateBanner({ nameScale: Math.min(2, Math.max(0.6, Number(e.target.value))) })}
              className="w-full mt-1"
            />
          </div>

          <div>
            <Label htmlFor={id("scoreScale")}>
              Taille du score — {Number(banner.scoreScale).toFixed(2)}×
            </Label>
            <input
              id={id("scoreScale")}
              type="range"
              min="0.6" max="2" step="0.05"
              value={banner.scoreScale}
              onChange={(e) => updateBanner({ scoreScale: Math.min(2, Math.max(0.6, Number(e.target.value))) })}
              className="w-full mt-1"
            />
          </div>

          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={banner.showLogo !== false}
              onChange={(e) => updateBanner({ showLogo: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Afficher le logo Festival Western</span>
          </label>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
          <div className="text-xs opacity-60 mb-2">Aperçu des proportions</div>
          <BannerPreview width={banner.width} height={banner.height} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <OutputLauncher
          buildUrl={buildBannerUrl}
          windowName={`rodeo-banner-${index}`}
          windowFeatures={`noopener,noreferrer,width=${banner.width},height=${banner.height}`}
          label="Ouvrir le bandeau"
          icon={TvIcon}
          onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
          stacked
        />
      </div>
    </div>
  );
}

function BannerTab({ state, push }) {
  const banners = state.banners ?? [];
  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Bandeaux LED</h2>
        <p className="text-sm opacity-70">
          Deux bandeaux indépendants — chacun avec sa propre résolution, son nombre
          d'entrées par page, et sa fenêtre. Utile par exemple pour un grand bandeau
          d'arène et un second plus petit en régie.
        </p>
      </div>
      <div className="space-y-4">
        {banners.map((b, i) => (
          <BannerConfigSection
            key={b.id || i}
            banner={b}
            index={i}
            state={state}
            push={push}
          />
        ))}
      </div>
    </Card>
  );
}

function TableTab({ state, push }) {
  const setPageSize = (v) =>
    push({ ...state, displayPageSize: Math.min(10, Math.max(1, Number(v) || 5)) });
  const setRotationMs = (v) =>
    push({ ...state, displayRotationMs: Math.max(0, Number(v) || 0) });
  const setShowPagination = (v) =>
    push({ ...state, displayShowPagination: !!v });

  function buildDisplayUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("display", "1");
    return url.toString();
  }

  const rotationSec = Math.round((state.displayRotationMs ?? 5000) / 1000);
  const rotationOff = rotationSec === 0;

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Tableau plein écran</h2>
        <p className="text-sm opacity-70">
          Affichage pour 2<sup>e</sup> écran ou projecteur. Pagination automatique
          quand il y a plus d'entrées qu'une page.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="pageSize">
              Entrées par page — {state.displayPageSize ?? 5}
            </Label>
            <input
              id="pageSize"
              type="range"
              min="1" max="10" step="1"
              value={state.displayPageSize ?? 5}
              onChange={(e) => setPageSize(e.target.value)}
              className="w-full mt-1"
            />
            <p className="text-[11px] opacity-60 mt-1">
              Selon la résolution du projecteur — moins d'entrées = texte plus gros.
            </p>
          </div>

          <div>
            <Label htmlFor="rotation">
              Rotation auto — {rotationOff ? "désactivée" : `${rotationSec} s`}
            </Label>
            <input
              id="rotation"
              type="range"
              min="0" max="15" step="1"
              value={rotationSec}
              onChange={(e) => setRotationMs(Number(e.target.value) * 1000)}
              className="w-full mt-1"
            />
            <p className="text-[11px] opacity-60 mt-1">
              {rotationOff
                ? "L'affichage reste sur la première page (utile pour figer le top)."
                : "Cycle automatique entre les pages."}
            </p>
          </div>

          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={state.displayShowPagination !== false}
              onChange={(e) => setShowPagination(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Afficher les points de pagination</span>
          </label>

          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={state.showDisplayLogo !== false}
              onChange={(e) => push({ ...state, showDisplayLogo: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Afficher le logo Festival Western</span>
          </label>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
          <div className="text-xs opacity-60 mb-2">Aperçu</div>
          <DisplayPreview
            pageSize={state.displayPageSize ?? 5}
            showPagination={state.displayShowPagination !== false}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <OutputLauncher
          buildUrl={buildDisplayUrl}
          windowName="rodeo-display"
          label="Ouvrir l'affichage"
          icon={ComputerDesktopIcon}
          onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
          stacked
        />
      </div>
    </Card>
  );
}

function CanvasTab({ state, push }) {
  const canvas = state.canvas;
  const [selectedId, setSelectedId] = useState(canvas.banners[0]?.id ?? null);
  const selected = canvas.banners.find((b) => b.id === selectedId);

  const updateCanvas = (patch) => push({ ...state, canvas: { ...canvas, ...patch } });
  const updateBanner = (id, patch) => {
    const next = canvas.banners.map((b) => (b.id === id ? { ...b, ...patch } : b));
    updateCanvas({ banners: next });
  };
  const addBanner = () => {
    const id = `c-${Math.random().toString(36).slice(2, 8)}`;
    const newBanner = {
      id,
      label: `Bandeau ${canvas.banners.length + 1}`,
      x: 0,
      y: 0,
      width: Math.min(1920, canvas.width),
      height: Math.min(216, canvas.height),
      pageSize: 3,
      nameScale: 1,
      scoreScale: 1,
      showLogo: true,
    };
    updateCanvas({ banners: [...canvas.banners, newBanner] });
    setSelectedId(id);
  };
  const removeBanner = (id) => {
    const next = canvas.banners.filter((b) => b.id !== id);
    updateCanvas({ banners: next });
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  function buildCanvasUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("canvas", "1");
    return url.toString();
  }

  // Preview scaling
  const MAX_PREVIEW_W = 640;
  const MAX_PREVIEW_H = 400;
  const scale = Math.min(MAX_PREVIEW_W / canvas.width, MAX_PREVIEW_H / canvas.height, 0.5);
  const previewW = Math.max(1, Math.round(canvas.width * scale));
  const previewH = Math.max(1, Math.round(canvas.height * scale));

  return (
    <Card>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Canevas LED</h2>
        <p className="text-sm opacity-70 mb-3">
          Une seule fenêtre qui contient plusieurs bandeaux positionnés librement —
          pratique pour envoyer une image composée à un processeur LED multi-zones.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor="cw">Largeur (px)</Label>
            <TextInput
              id="cw"
              type="number"
              value={canvas.width}
              onChange={(e) => updateCanvas({ width: Math.max(320, Number(e.target.value) || 0) })}
              inputMode="numeric"
              className="!w-28"
            />
          </div>
          <div>
            <Label htmlFor="ch">Hauteur (px)</Label>
            <TextInput
              id="ch"
              type="number"
              value={canvas.height}
              onChange={(e) => updateCanvas({ height: Math.max(64, Number(e.target.value) || 0) })}
              inputMode="numeric"
              className="!w-28"
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-4">
        {/* Sidebar */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">
            Bandeaux ({canvas.banners.length})
          </div>
          {canvas.banners.length === 0 && (
            <div className="text-xs opacity-60 italic px-1 py-2">
              Aucun bandeau dans le canevas.
            </div>
          )}
          {canvas.banners.map((b) => (
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
              <div className="font-medium truncate">{b.label}</div>
              <div className="text-[11px] opacity-70 tabular-nums">
                {b.width}×{b.height} @ ({b.x},{b.y})
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={addBanner}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Ajouter un bandeau
          </button>
        </div>

        {/* Preview area */}
        <div className="flex flex-col items-center">
          <div className="text-xs opacity-60 mb-2 tabular-nums">
            Aperçu — {canvas.width}×{canvas.height} px (échelle {Math.round(scale * 100)}%)
          </div>
          <div
            onClick={() => setSelectedId(null)}
            className="relative rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-900 cursor-pointer"
            style={{ width: previewW, height: previewH }}
          >
            {canvas.banners.map((b) => {
              const isSel = b.id === selectedId;
              return (
                <div
                  key={b.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}
                  className={
                    "absolute flex items-center justify-center text-[10px] font-mono select-none px-1 truncate " +
                    (isSel ? "ring-2 ring-amber-400 text-amber-50" : "ring-1 ring-white/30 text-white/80")
                  }
                  style={{
                    left: Math.round(b.x * scale),
                    top: Math.round(b.y * scale),
                    width: Math.max(1, Math.round(b.width * scale)),
                    height: Math.max(1, Math.round(b.height * scale)),
                    background: isSel ? "rgba(251,191,36,0.22)" : "rgba(59,130,246,0.22)",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                  title={`${b.label} — ${b.width}×${b.height} @ (${b.x},${b.y})`}
                >
                  <span className="truncate">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Properties panel */}
      {selected ? (
        <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <input
              type="text"
              value={selected.label}
              onChange={(e) => updateBanner(selected.id, { label: e.target.value })}
              className="text-base font-semibold bg-transparent border-0 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-500 focus:outline-none px-0 py-0.5 flex-1 min-w-0"
              aria-label="Nom du bandeau"
            />
            <button
              type="button"
              onClick={() => removeBanner(selected.id)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="bx">X (px)</Label>
              <TextInput
                id="bx"
                type="number"
                value={selected.x}
                onChange={(e) => updateBanner(selected.id, {
                  x: Math.max(0, Math.min(canvas.width - selected.width, Number(e.target.value) || 0)),
                })}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="by">Y (px)</Label>
              <TextInput
                id="by"
                type="number"
                value={selected.y}
                onChange={(e) => updateBanner(selected.id, {
                  y: Math.max(0, Math.min(canvas.height - selected.height, Number(e.target.value) || 0)),
                })}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="bw">Largeur (px)</Label>
              <TextInput
                id="bw"
                type="number"
                value={selected.width}
                onChange={(e) => updateBanner(selected.id, {
                  width: Math.max(64, Math.min(canvas.width - selected.x, Number(e.target.value) || 0)),
                })}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="bh">Hauteur (px)</Label>
              <TextInput
                id="bh"
                type="number"
                value={selected.height}
                onChange={(e) => updateBanner(selected.id, {
                  height: Math.max(32, Math.min(canvas.height - selected.y, Number(e.target.value) || 0)),
                })}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="bps">Entrées par page — {selected.pageSize}</Label>
              <input
                id="bps"
                type="range"
                min="1" max="6" step="1"
                value={selected.pageSize}
                onChange={(e) => updateBanner(selected.id, { pageSize: Number(e.target.value) })}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bns">Échelle nom — {Number(selected.nameScale).toFixed(2)}×</Label>
              <input
                id="bns"
                type="range"
                min="0.6" max="2" step="0.05"
                value={selected.nameScale}
                onChange={(e) => updateBanner(selected.id, {
                  nameScale: Math.min(2, Math.max(0.6, Number(e.target.value))),
                })}
                className="w-full mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bss">Échelle score — {Number(selected.scoreScale).toFixed(2)}×</Label>
              <input
                id="bss"
                type="range"
                min="0.6" max="2" step="0.05"
                value={selected.scoreScale}
                onChange={(e) => updateBanner(selected.id, {
                  scoreScale: Math.min(2, Math.max(0.6, Number(e.target.value))),
                })}
                className="w-full mt-1"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={selected.showLogo !== false}
              onChange={(e) => updateBanner(selected.id, { showLogo: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Afficher le logo Festival Western</span>
          </label>
        </div>
      ) : (
        <div className="mt-5 text-sm opacity-60 text-center py-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl">
          Sélectionnez un bandeau dans la liste ou l'aperçu pour modifier ses propriétés.
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <OutputLauncher
          buildUrl={buildCanvasUrl}
          windowName="rodeo-canvas"
          windowFeatures={`noopener,noreferrer,width=${canvas.width},height=${canvas.height}`}
          label="Ouvrir le canevas"
          icon={Squares2X2Icon}
          onBeforeLaunch={() => bus?.post({ type: "sync:update", payload: state })}
          stacked
        />
      </div>
    </Card>
  );
}

const TABS = [
  { id: "qr",     label: "QR codes", icon: QrCodeIcon },
  { id: "banner", label: "Bandeau",  icon: TvIcon },
  { id: "canvas", label: "Canevas",  icon: Squares2X2Icon },
  { id: "table",  label: "Tableau",  icon: ComputerDesktopIcon },
];

export default function SettingsView() {
  const [state, push] = useSyncedState();
  const [active, setActive] = useState("qr");

  useEffect(() => { document.title = "FWST Scoring — Paramètres"; }, []);
  useEffect(() => {
    document.body.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  function goToScoring() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.delete("display");
    url.searchParams.delete("banner");
    url.searchParams.delete("canvas");
    window.location.href = url.toString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={goToScoring}
              aria-label="Retour au scoring"
              title="Retour au scoring"
              className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer flex-shrink-0"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold leading-tight">Paramètres &amp; sorties</h1>
              <p className="text-xs opacity-60">Configuration des affichages secondaires.</p>
            </div>
          </div>
          <ThemeToggle
            theme={state.theme}
            onChange={(t) => push({ ...state, theme: t })}
          />
        </header>

        <div className="flex justify-center">
          <Tabs tabs={TABS} active={active} onChange={setActive} />
        </div>

        {active === "qr"     && <QrTab />}
        {active === "banner" && <BannerTab state={state} push={push} />}
        {active === "canvas" && <CanvasTab state={state} push={push} />}
        {active === "table"  && <TableTab state={state} push={push} />}
      </div>
    </div>
  );
}
