import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../../components/ui/Card";
import Label from "../../components/ui/Label";
import OutputStage from "../../components/outputs/OutputStage";
import { FONTS, PRESETS, applyPreset, normalizeLook } from "../../state/look";
import { buildContext, outputStateOf } from "../../state/context";
import { computeRanking } from "../../utils/score";
import { SAMPLE_ENTRIES, SAMPLE_ROSTER, SAMPLE_TIMER } from "../../state/sample";

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

  // Aperçus : les deux premières sorties (tableau et bandeau), avec des
  // données d'exemple si la compétition est vide.
  const previews = state.outputs.slice(0, 2);
  const ctx = useMemo(() => {
    const base = buildContext({ ...state, look }, SAMPLE_TIMER);
    const ranked = base.ranked.length ? base.ranked : computeRanking(SAMPLE_ENTRIES[state.scoreMode] ?? SAMPLE_ENTRIES.higher, state.scoreMode);
    const byCompetitor = base.ranked.length ? base.byCompetitor : new Map(SAMPLE_ROSTER.map((p) => [p.id, p]));
    const current = base.current ?? SAMPLE_ROSTER[0];
    return { ...base, ranked, byCompetitor, current, timerTarget: 8, outputState: outputStateOf(ranked, null) };
  }, [state, look]);

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Apparence des sorties</h2>
        <p className="text-sm opacity-70">
          Couleurs, polices, arrondi et ligne de coupure, partagés par toutes les sorties
          composées dans l'Éditeur. Les aperçus utilisent des données d'exemple.
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
            <Label htmlFor="look-cut">Ligne de coupure — {look.cutLine ? `après le ${look.cutLine}ᵉ rang` : "aucune"}</Label>
            <input id="look-cut" type="range" min="0" max="15" step="1" value={look.cutLine} onChange={(e) => setOption({ cutLine: Number(e.target.value) })} className="w-full mt-1" />
            <p className="text-[11px] opacity-60 mt-1">Trait rouge sous le dernier qualifié (finale, prime, etc.).</p>
          </div>

          <p className="text-[11px] opacity-60">
            Titre, ville d'origine, animal, mention « Non officiel » : ce sont des éléments de chaque sortie, à modifier dans l'onglet Éditeur.
          </p>
        </div>

        {/* Aperçus */}
        <div className="space-y-4 min-w-0">
          {previews.map((o) => (
            <div key={o.id}>
              <div className="text-xs uppercase tracking-wide opacity-60 mb-2">{o.name} ({o.width} × {o.height})</div>
              <Scaled width={o.width} height={o.height} maxWidth={720}>
                <div style={{ position: "relative", width: o.width, height: o.height }}>
                  <OutputStage output={o} ctx={{ ...ctx, timerFrame: o.elements.some((e) => e.kind === "timer" && e.states.results) ? SAMPLE_TIMER : null }} />
                </div>
              </Scaled>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
