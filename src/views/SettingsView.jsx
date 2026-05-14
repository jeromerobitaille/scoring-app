import React, { useEffect, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import Tabs from "../components/ui/Tabs";
import { bus } from "../sync/SyncBus";
import {
  ArrowLeftIcon,
  ComputerDesktopIcon,
  TvIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import ShareConnection from "../components/ShareConnection";

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

function BannerTab({ state, push }) {
  const setBannerWidth  = (v) => push({ ...state, bannerWidth:  Math.max(320, Number(v) || 0) });
  const setBannerHeight = (v) => push({ ...state, bannerHeight: Math.max(64,  Number(v) || 0) });
  const setNameScale    = (v) => push({ ...state, bannerNameScale:  Math.min(2, Math.max(0.6, Number(v) || 1)) });
  const setScoreScale   = (v) => push({ ...state, bannerScoreScale: Math.min(2, Math.max(0.6, Number(v) || 1)) });

  function openBanner() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("banner", "1");
    url.searchParams.set("w", String(state.bannerWidth));
    url.searchParams.set("h", String(state.bannerHeight));
    const w = window.open(
      url.toString(),
      "rodeo-banner",
      `noopener,noreferrer,width=${state.bannerWidth},height=${state.bannerHeight}`
    );
    bus?.post({ type: "sync:update", payload: state });
    w?.focus();
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Bandeau LED</h2>
          <p className="text-sm opacity-70">
            Résolution exacte du bandeau (px) et échelle des polices.
          </p>
        </div>
        <Button onClick={openBanner}>
          <TvIcon className="w-5 h-5 inline-block mr-1.5 -mt-0.5" />
          Ouvrir le bandeau
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bw">Largeur (px)</Label>
              <TextInput
                id="bw"
                type="number"
                value={state.bannerWidth}
                onChange={(e) => setBannerWidth(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="bh">Hauteur (px)</Label>
              <TextInput
                id="bh"
                type="number"
                value={state.bannerHeight}
                onChange={(e) => setBannerHeight(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nameScale">
              Taille du nom — {Number(state.bannerNameScale ?? 1).toFixed(2)}×
            </Label>
            <input
              id="nameScale"
              type="range"
              min="0.6" max="2" step="0.05"
              value={state.bannerNameScale ?? 1}
              onChange={(e) => setNameScale(e.target.value)}
              className="w-full mt-1"
            />
          </div>

          <div>
            <Label htmlFor="scoreScale">
              Taille du score — {Number(state.bannerScoreScale ?? 1).toFixed(2)}×
            </Label>
            <input
              id="scoreScale"
              type="range"
              min="0.6" max="2" step="0.05"
              value={state.bannerScoreScale ?? 1}
              onChange={(e) => setScoreScale(e.target.value)}
              className="w-full mt-1"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
          <div className="text-xs opacity-60 mb-2">Aperçu des proportions</div>
          <BannerPreview width={state.bannerWidth} height={state.bannerHeight} />
          <div className="text-[11px] opacity-50 mt-3 text-center max-w-xs">
            Astuce : URL personnalisée <code>?banner=1&amp;w=2592&amp;h=216</code>
          </div>
        </div>
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

  function openDisplay() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("display", "1");
    const w = window.open(url.toString(), "rodeo-display", "noopener,noreferrer");
    bus?.post({ type: "sync:update", payload: state });
    w?.focus();
  }

  const rotationSec = Math.round((state.displayRotationMs ?? 5000) / 1000);
  const rotationOff = rotationSec === 0;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Tableau plein écran</h2>
          <p className="text-sm opacity-70">
            Affichage pour 2<sup>e</sup> écran ou projecteur. Pagination automatique
            quand il y a plus d'entrées qu'une page.
          </p>
        </div>
        <Button onClick={openDisplay}>
          <ComputerDesktopIcon className="w-5 h-5 inline-block mr-1.5 -mt-0.5" />
          Ouvrir l'affichage
        </Button>
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
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
          <div className="text-xs opacity-60 mb-2">Aperçu</div>
          <DisplayPreview
            pageSize={state.displayPageSize ?? 5}
            showPagination={state.displayShowPagination !== false}
          />
        </div>
      </div>
    </Card>
  );
}

const TABS = [
  { id: "qr",     label: "QR codes", icon: QrCodeIcon },
  { id: "banner", label: "Bandeau",  icon: TvIcon },
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
    window.location.href = url.toString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        <header className="flex items-center justify-between gap-4">
          <Button onClick={goToScoring}>
            <ArrowLeftIcon className="w-5 h-5 inline-block mr-1.5 -mt-0.5" />
            Retour au scoring
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Paramètres &amp; sorties</h1>
            <p className="text-xs opacity-70">Configuration des affichages secondaires.</p>
          </div>
        </header>

        <div className="flex justify-center">
          <Tabs tabs={TABS} active={active} onChange={setActive} />
        </div>

        {active === "qr"     && <QrTab />}
        {active === "banner" && <BannerTab state={state} push={push} />}
        {active === "table"  && <TableTab state={state} push={push} />}
      </div>
    </div>
  );
}
