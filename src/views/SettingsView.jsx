import React, { useEffect, useState } from "react";
import useSyncedState from "../state/useSyncedState";
import Card from "../components/ui/Card";
import Label from "../components/ui/Label";
import Tabs from "../components/ui/Tabs";
import {
  QrCodeIcon,
  Squares2X2Icon,
  ClockIcon,
  ArrowPathIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
  ArchiveBoxIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import ShareConnection from "../components/ShareConnection";
import ThemeToggle from "../components/ui/ThemeToggle";
import useLiveTimer, { TIMER_STATE_LABEL } from "../hooks/useLiveTimer";
import { formatScore } from "../utils/score";
import RodeosTab from "./settings/RodeosTab";
import DisciplinesTab from "./settings/DisciplinesTab";
import BackupTab from "./settings/BackupTab";
import LookTab from "./settings/LookTab";
import EditorTab from "./settings/editor/EditorTab";

function QrTab() {
  return <ShareConnection />;
}

const BAUD_RATES = [9600, 1200, 2400, 4800, 19200, 38400];

function TimerTab({ state, push }) {
  const api = typeof window !== "undefined" ? window.fwst?.timer : null;
  const { frame, status } = useLiveTimer({ enabled: !!api });
  const [config, setConfig] = useState(null);
  const [ports, setPorts] = useState([]);
  const [loadingPorts, setLoadingPorts] = useState(false);

  async function refreshPorts() {
    if (!api) return;
    setLoadingPorts(true);
    try { setPorts(await api.listPorts()); } catch { setPorts([]); }
    finally { setLoadingPorts(false); }
  }

  useEffect(() => {
    if (!api) return;
    api.getConfig().then((r) => setConfig(r.config)).catch(() => {});
    refreshPorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  async function update(patch) {
    const r = await api.setConfig(patch);
    setConfig(r.config);
  }

  const liveToggle = (
    <label className="flex items-center gap-2 select-none cursor-pointer">
      <input
        type="checkbox"
        checked={state.showLiveTimer !== false}
        onChange={(e) => push({ ...state, showLiveTimer: e.target.checked })}
        className="w-4 h-4"
      />
      <span className="text-sm">
        Afficher le chrono en direct sur les sorties (quand il est armé)
      </span>
    </label>
  );

  if (!api) {
    return (
      <Card>
        <h2 className="text-lg font-semibold mb-2">Chrono FarmTek</h2>
        <p className="text-sm opacity-70 mb-4">
          La lecture du chrono USB se fait uniquement dans l'application FWST Scoring
          installée sur l'ordinateur branché au chrono.
        </p>
        {liveToggle}
      </Card>
    );
  }

  const selected = config?.port ?? "auto";
  const knownPort = selected === "auto" || ports.some((p) => p.path === selected);
  const timerState = frame?.state ?? "unknown";

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Chrono FarmTek</h2>
        <p className="text-sm opacity-70">
          Lecture du port « display » du chrono par USB-série. En mode Temps, le temps
          s'affiche en direct et remplit automatiquement le champ Temps à l'arrivée.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={config?.enabled !== false}
              disabled={!config}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">Lire le chrono USB</span>
          </label>

          <div>
            <Label htmlFor="timerPort">Port</Label>
            <div className="flex gap-2 mt-1">
              <select
                id="timerPort"
                className="flex-1 min-w-0 rounded-xl border px-3 py-2 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                value={selected}
                disabled={!config || config.enabled === false}
                onChange={(e) => update({ port: e.target.value })}
              >
                <option value="auto">Automatique (premier adaptateur USB)</option>
                {!knownPort && <option value={selected}>{selected} (absent)</option>}
                {ports.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.path}{p.manufacturer ? ` — ${p.manufacturer}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={refreshPorts}
                title="Rafraîchir la liste"
                aria-label="Rafraîchir la liste des ports"
                className="p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loadingPorts ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="timerBaud">Vitesse</Label>
            <select
              id="timerBaud"
              className="w-full mt-1 rounded-xl border px-3 py-2 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
              value={config?.baudRate ?? 9600}
              disabled={!config || config.enabled === false}
              onChange={(e) => update({ baudRate: Number(e.target.value) })}
            >
              {BAUD_RATES.map((b) => (
                <option key={b} value={b}>{b} bauds{b === 9600 ? " (FarmTek)" : ""}</option>
              ))}
            </select>
          </div>

          {liveToggle}
        </div>

        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
          <div className="text-xs opacity-60">État</div>
          <div
            className={`font-mono tabular-nums font-black text-5xl ${status?.connected ? "" : "opacity-30"}`}
          >
            {status?.connected && frame ? formatScore(frame.seconds, "time") : "–.–––"}
          </div>
          <div className="text-sm">
            {status?.connected
              ? `${TIMER_STATE_LABEL[timerState]}${frame?.eye ? ` · cellule ${frame.eye}` : ""}`
              : config?.enabled === false
              ? "Désactivé"
              : "Non connecté"}
          </div>
          <div className="text-xs opacity-60 text-center break-all">
            {status?.connected ? status.port : status?.error || "Recherche du chrono…"}
          </div>
        </div>
      </div>
    </Card>
  );
}

const TABS = [
  { id: "rodeos",      label: "Rodéos",      icon: UserGroupIcon },
  { id: "disciplines", label: "Disciplines", icon: AdjustmentsHorizontalIcon },
  { id: "editor", label: "Éditeur", icon: Squares2X2Icon },
  { id: "look",   label: "Apparence", icon: PaintBrushIcon },
  { id: "qr",     label: "QR codes", icon: QrCodeIcon },
  { id: "timer",  label: "Chrono",   icon: ClockIcon },
  { id: "backup", label: "Sauvegarde", icon: ArchiveBoxIcon },
];

export default function SettingsView() {
  const [state, push] = useSyncedState();
  const [active, setActive] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    const legacy = { banner: "editor", canvas: "editor", table: "editor" };
    return TABS.some((t) => t.id === tab) ? tab : legacy[tab] ?? "rodeos";
  });

  useEffect(() => { document.title = "FWST Scoring — Paramètres"; }, []);
  useEffect(() => {
    document.body.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  function goToScoring() {
    const url = new URL(window.location.href);
    url.searchParams.delete("settings");
    url.searchParams.delete("tab");
    window.location.href = url.toString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="mx-auto max-w-6xl space-y-5">

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
              <p className="text-xs opacity-60">Rodéos, disciplines, chrono, affichages et sauvegarde.</p>
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

        {active === "rodeos"      && <RodeosTab state={state} push={push} />}
        {active === "disciplines" && <DisciplinesTab state={state} push={push} />}
        {active === "editor" && <EditorTab state={state} push={push} />}
        {active === "look"   && <LookTab state={state} push={push} />}
        {active === "qr"     && <QrTab />}
        {active === "timer"  && <TimerTab state={state} push={push} />}
        {active === "backup" && <BackupTab state={state} push={push} />}
      </div>
    </div>
  );
}
