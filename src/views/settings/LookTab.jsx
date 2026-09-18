import React, { useEffect, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Label from "../../components/ui/Label";
import LeaderboardScreen from "../../components/outputs/LeaderboardScreen";
import BannerView from "../../components/BannerView";
import { FONTS, PRESETS, applyPreset, normalizeLook } from "../../state/look";

// Données d'exemple pour les aperçus (ligne de coupure visible au 4e rang).
const SAMPLE_ROSTER = [
  { id: "p1", name: "Jayden Roy", hometown: "Mascouche, QC", animal: "Tickle My Fancy", contractor: "Championship Pro" },
  { id: "p2", name: "Keenan Hayes", hometown: "Hayden, CO" },
  { id: "p3", name: "Jess Pope", hometown: "Waverly, KS" },
  { id: "p4", name: "R.C. Landingham", hometown: "Hat Creek, CA" },
  { id: "p5", name: "Leighton Berry", hometown: "Weatherford, TX" },
  { id: "p6", name: "Wacey Schalla", hometown: "Arapaho, OK" },
];
const SAMPLE_ENTRIES = [
  { id: "e2", competitorId: "p2", name: "Keenan Hayes", parsed: 86.5 },
  { id: "e3", competitorId: "p3", name: "Jess Pope", parsed: 85.5 },
  { id: "e4", competitorId: "p4", name: "R.C. Landingham", parsed: 84.25 },
  { id: "e5", competitorId: "p5", name: "Leighton Berry", parsed: 84 },
  { id: "e6", competitorId: "p6", name: "Wacey Schalla", parsed: 83 },
];
const SAMPLE_TIMER = { seconds: 6.42, state: "running", runId: 1, session: "preview" };

const COLOR_FIELDS = [
  ["bg1", "Fond (haut)"],
  ["bg2", "Fond (bas)"],
  ["card", "Cartes"],
  ["cardBorder", "Bordure des cartes"],
  ["accent", "Accent (or, 1er rang)"],
  ["accentText", "Texte sur accent"],
  ["text", "Texte"],
  ["muted", "Texte secondaire"],
  ["cutLine", "Ligne de coupure"],
  ["timerTarget", "Chrono : cible atteinte"],
];

const INPUT =
  "w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";

/** Aperçu à l'échelle : rend l'enfant à sa taille réelle puis le réduit. */
function Scaled({ width, height, maxWidth, children }) {
  const ref = useRef(null);
  const [available, setAvailable] = useState(maxWidth);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, available / width);
  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div style={{ width: width * scale, height: height * scale, position: "relative", overflow: "hidden", borderRadius: 8 }}>
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ColorField({ id, label, value, onChange }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-2 py-1.5 cursor-pointer">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-md border-0 bg-transparent cursor-pointer"
      />
      <span className="text-xs flex-1 min-w-0 truncate">{label}</span>
      <span className="text-[10px] font-mono opacity-50">{value}</span>
    </label>
  );
}

export default function LookTab({ state, push }) {
  const look = state.look;
  const set = (patch) => push({ ...state, look: normalizeLook({ ...look, ...patch, preset: "custom" }) });
  const setColor = (key, value) => set({ colors: { ...look.colors, [key]: value } });
  const setFont = (key, value) => set({ fonts: { ...look.fonts, [key]: value } });
  const setOption = (patch) => push({ ...state, look: normalizeLook({ ...look, ...patch }) });

  const banner = state.banners?.[0] ?? { width: 2592, height: 216, pageSize: 3, nameScale: 1, scoreScale: 1, showLogo: true };
  const sampleMode = state.scoreMode ?? "higher";

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Apparence des sorties</h2>
        <p className="text-sm opacity-70">
          Couleurs, polices et options du tableau plein écran, des bandeaux LED et du
          canevas. Les aperçus utilisent des données d'exemple et se mettent à jour en direct.
        </p>
      </div>

      {/* Préréglages */}
      <div className="grid sm:grid-cols-3 gap-2">
        {Object.entries(PRESETS).map(([key, p]) => {
          const active = look.preset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => push({ ...state, look: applyPreset(look, key) })}
              className={
                "text-left rounded-2xl border p-3 transition cursor-pointer " +
                (active
                  ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/20 dark:ring-white/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40")
              }
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex overflow-hidden rounded-md border border-black/20">
                  {[p.colors.bg1, p.colors.card, p.colors.accent, p.colors.text].map((c) => (
                    <span key={c} className="w-4 h-4" style={{ background: c }} />
                  ))}
                </span>
                <span className="font-semibold text-sm">{p.label}</span>
                {active && <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">Actif</span>}
              </div>
              <div className="text-xs opacity-60">{p.description}</div>
            </button>
          );
        })}
      </div>
      {look.preset === "custom" && (
        <p className="mt-2 text-xs opacity-60">Réglages personnalisés — cliquez un préréglage pour repartir de sa palette.</p>
      )}

      <div className="mt-6 grid lg:grid-cols-[minmax(0,380px)_1fr] gap-6">
        {/* Réglages */}
        <div className="space-y-5">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Couleurs</div>
            <div className="grid grid-cols-2 gap-1.5">
              {COLOR_FIELDS.map(([key, label]) => (
                <ColorField key={key} id={`look-${key}`} label={label} value={look.colors[key]} onChange={(v) => setColor(key, v)} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="look-font-display">Police des noms et titres</Label>
              <select id="look-font-display" className={`${INPUT} mt-1`} value={look.fonts.display} onChange={(e) => setFont("display", e.target.value)}>
                {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="look-font-numbers">Police des temps et pointages</Label>
              <select id="look-font-numbers" className={`${INPUT} mt-1`} value={look.fonts.numbers} onChange={(e) => setFont("numbers", e.target.value)}>
                {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="look-radius">Arrondi des cartes — {look.radius} px</Label>
            <input id="look-radius" type="range" min="0" max="40" step="1" value={look.radius} onChange={(e) => set({ radius: Number(e.target.value) })} className="w-full mt-1" />
          </div>

          <div>
            <Label htmlFor="look-title">Titre au-dessus de la discipline</Label>
            <input
              id="look-title"
              className={`${INPUT} mt-1`}
              placeholder="Ex. Festival Western de St-Tite"
              defaultValue={look.headerTitle}
              key={look.headerTitle}
              onBlur={(e) => setOption({ headerTitle: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            />
          </div>

          <div>
            <Label htmlFor="look-cut">Ligne de coupure — {look.cutLine ? `après le ${look.cutLine}ᵉ rang` : "aucune"}</Label>
            <input id="look-cut" type="range" min="0" max="15" step="1" value={look.cutLine} onChange={(e) => setOption({ cutLine: Number(e.target.value) })} className="w-full mt-1" />
            <p className="text-[11px] opacity-60 mt-1">Trait rouge sous le dernier qualifié (finale, prime, etc.).</p>
          </div>

          <div className="space-y-2">
            {[
              ["showHometown", "Afficher la ville d'origine"],
              ["showAnimal", "Afficher l'animal et l'entrepreneur (bloc « sur le parcours »)"],
              ["showUnofficial", "Mention « Non officiel » au bas du tableau"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 select-none cursor-pointer">
                <input type="checkbox" checked={!!look[key]} onChange={(e) => setOption({ [key]: e.target.checked })} className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Aperçus */}
        <div className="space-y-4 min-w-0">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Tableau plein écran (1920 × 1080)</div>
            <Scaled width={1920} height={1080} maxWidth={720}>
              <LeaderboardScreen
                look={look}
                entries={SAMPLE_ENTRIES}
                roster={SAMPLE_ROSTER}
                scoreMode={sampleMode}
                eventName={state.eventName || "Monte de taureaux"}
                rodeoName={state.rodeoName}
                current={SAMPLE_ROSTER[0]}
                timerFrame={SAMPLE_TIMER}
                timerTarget={8}
                width={1920}
                height={1080}
                pageSize={Number(state.displayPageSize) || 5}
                rotationMs={0}
                showLogo={state.showDisplayLogo !== false}
                showHero={state.displayShowHero !== false}
              />
            </Scaled>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60 mb-2">Bandeau principal ({banner.width} × {banner.height})</div>
            <Scaled width={banner.width} height={banner.height} maxWidth={720}>
              <div style={{ position: "relative", width: banner.width, height: banner.height }}>
                <BannerView
                  banner={banner}
                  entries={SAMPLE_ENTRIES}
                  roster={SAMPLE_ROSTER}
                  scoreMode={sampleMode}
                  eventName={state.eventName}
                  width={banner.width}
                  height={banner.height}
                  look={look}
                  contextKey="preview"
                />
              </div>
            </Scaled>
          </div>
        </div>
      </div>
    </Card>
  );
}
