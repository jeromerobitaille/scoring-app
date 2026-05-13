import React, { useEffect } from "react";
import useSyncedState from "../state/useSyncedState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import { bus } from "../sync/SyncBus";
import { ArrowLeftIcon, ComputerDesktopIcon, TvIcon } from "@heroicons/react/24/outline";
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

export default function SettingsView() {
  const [state, push] = useSyncedState();

  useEffect(() => {
    document.title = "FWST Scoring — Paramètres";
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  const setBannerWidth  = (v) => push({ ...state, bannerWidth:  Math.max(320, Number(v) || 0) });
  const setBannerHeight = (v) => push({ ...state, bannerHeight: Math.max(64,  Number(v) || 0) });
  const setNameScale    = (v) => push({ ...state, bannerNameScale:  Math.min(2, Math.max(0.6, Number(v) || 1)) });
  const setScoreScale   = (v) => push({ ...state, bannerScoreScale: Math.min(2, Math.max(0.6, Number(v) || 1)) });

  function openDisplay() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.set("display", "1");
    const w = window.open(url.toString(), "rodeo-display", "noopener,noreferrer");
    bus?.post({ type: "sync:update", payload: state });
    w?.focus();
  }

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
          <Button
            onClick={goToScoring}
            className="!bg-zinc-900 !text-white dark:!bg-white dark:!text-zinc-900"
          >
            <ArrowLeftIcon className="w-5 h-5 inline-block mr-1.5 -mt-0.5" />
            Retour au scoring
          </Button>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Paramètres &amp; sorties</h1>
            <p className="text-xs opacity-70">Configuration des affichages secondaires.</p>
          </div>
        </header>

        <ShareConnection />

        {/* Bandeau LED — tout regroupé */}
        <Card>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Bandeau LED</h2>
              <p className="text-sm opacity-70">
                Configurez la résolution exacte de votre bandeau (en pixels) et l'échelle des polices.
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
                <Label htmlFor="nameScale">Taille du nom — {Number(state.bannerNameScale ?? 1).toFixed(2)}×</Label>
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
                <Label htmlFor="scoreScale">Taille du score — {Number(state.bannerScoreScale ?? 1).toFixed(2)}×</Label>
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
                Astuce : URL personnalisée avec <code>?banner=1&amp;w=2592&amp;h=216</code>
              </div>
            </div>
          </div>
        </Card>

        {/* Sortie plein écran */}
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Sortie plein écran</h2>
              <p className="text-sm opacity-70">
                Affichage classique pour 2<sup>e</sup> écran ou projecteur (pagination automatique).
              </p>
            </div>
            <Button onClick={openDisplay}>
              <ComputerDesktopIcon className="w-5 h-5 inline-block mr-1.5 -mt-0.5" />
              Ouvrir l'affichage
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
