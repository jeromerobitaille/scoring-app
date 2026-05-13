import React, { useEffect } from "react";
import useSyncedState from "../state/useSyncedState";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import TextInput from "../components/ui/TextInput";
import { bus } from "../sync/SyncBus";
import { BackspaceIcon } from "@heroicons/react/24/outline";
import ShareConnection from "../components/ShareConnection";

export default function SettingsView() {
  const [state, push] = useSyncedState();

  const setNameScale  = (v) => push({ ...state, bannerNameScale: Math.min(2, Math.max(0.6, Number(v) || 1)) });
  const setScoreScale = (v) => push({ ...state, bannerScoreScale: Math.min(2, Math.max(0.6, Number(v) || 1)) });

  useEffect(() => {
    document.body.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

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
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Paramètres & sorties</h1>
            <p className="text-sm opacity-70">Définissez la résolution du bandeau et ouvrez les sorties d’affichage.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={goToScoring}>
              <BackspaceIcon className="w-5 h-5 inline-block mr-1 -mt-0.5" />
              Retour au scoring</Button>
          </div>
        </header>

        <ShareConnection />

        <Card>
          <h2 className="text-lg font-semibold mb-3">Résolution bandeau LED</h2>
          <div className="grid md:grid-cols-6 gap-4 items-end">
            <div>
              <Label>Largeur (px)</Label>
              <TextInput
                type="number"
                value={state.bannerWidth}
                onChange={(e) => push({ ...state, bannerWidth: Math.max(320, Number(e.target.value) || 0) })}
              />
            </div>
            <div>
              <Label>Hauteur (px)</Label>
              <TextInput
                type="number"
                value={state.bannerHeight}
                onChange={(e) => push({ ...state, bannerHeight: Math.max(64, Number(e.target.value) || 0) })}
              />
            </div>
            <div className="md:col-span-2 text-sm opacity-70">
              Astuce : vous pouvez ouvrir avec `?banner=1&w=2592&h=216`.
            </div>
            <div className="md:col-span-2 text-right">
              <Button onClick={openBanner}>Ouvrir bandeau {state.bannerWidth}×{state.bannerHeight}</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Sortie plein écran</h2>
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-70">
              Ouvrez l’affichage plein écran (2ᵉ écran / projecteur).
            </div>
            <Button onClick={openDisplay}>Ouvrir le plein écran</Button>
          </div>
        </Card>

        <Card>
        <h2 className="text-lg font-semibold mb-4">Bandeau LED — Tailles de police</h2>

        <div className="grid md:grid-cols-2 gap-6 items-end">
          <div className="w-full">
            <Label className="block mb-2">Taille du nom (×)</Label>
            <input
              type="range"
              min="0.6" max="2" step="0.05"
              value={state.bannerNameScale ?? 1}
              onChange={(e) => setNameScale(e.target.value)}
              className="w-full"
            />
            <div className="mt-2 text-sm opacity-70">Facteur: {Number(state.bannerNameScale ?? 1).toFixed(2)}×</div>
          </div>

          <div className="w-full">
            <Label className="block mb-2">Taille du score (×)</Label>
            <input
              type="range"
              min="0.6" max="2" step="0.05"
              value={state.bannerScoreScale ?? 1}
              onChange={(e) => setScoreScale(e.target.value)}
              className="w-full"
            />
            <div className="mt-2 text-sm opacity-70">Facteur: {Number(state.bannerScoreScale ?? 1).toFixed(2)}×</div>
          </div>
        </div>

      </Card>

        {/* <Card>
          <h2 className="text-lg font-semibold mb-3">Apparence</h2>
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>Thème</Label>
              <select
                className="w-full rounded-2xl border px-4 py-3 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                value={state.theme}
                onChange={(e) => push({ ...state, theme: e.target.value })}
              >
                <option value="dark">Sombre</option>
                <option value="light">Clair</option>
              </select>
            </div>
          </div>
        </Card> */}
      </div>
    </div>
  );
}
