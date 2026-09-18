import React from "react";
import { THEME_COLORS } from "../../../state/outputs";

export const INPUT =
  "w-full min-w-0 rounded-xl border px-3 py-2 text-sm outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";
export const SMALL =
  "w-full min-w-0 rounded-lg border px-2 py-1 text-xs outline-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700";
export const BTN =
  "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";
export const BTN_DANGER =
  "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer";

export function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-[11px] opacity-60 mb-0.5 truncate">{label}</span>
      {children}
    </label>
  );
}

export function NumberField({ label, value, onChange, min, max, step = 1, className = "" }) {
  return (
    <Field label={label} className={className}>
      <input
        type="number"
        className={SMALL}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <Field label={label} className={className}>
      <select className={SMALL} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({ label, checked, onChange, className = "" }) {
  return (
    <label className={`flex items-center gap-1.5 select-none cursor-pointer text-xs ${className}`}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="w-3.5 h-3.5" />
      <span>{label}</span>
    </label>
  );
}

export function Slider({ label, value, onChange, min, max, step, format = (v) => v }) {
  return (
    <Field label={`${label} — ${format(value)}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </Field>
  );
}

/**
 * Couleur : une clé du thème (suit l'onglet Apparence) ou un hexa libre.
 * `allowNone` ajoute « Aucune » (valeur null).
 */
export function ColorSelect({ label, value, onChange, allowNone = false, className = "" }) {
  const isTheme = THEME_COLORS.some(([k]) => k === value);
  const mode = value == null ? "none" : isTheme ? value : "custom";
  return (
    <Field label={label} className={className}>
      <div className="flex gap-1">
        <select
          className={SMALL}
          value={mode}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "none" ? null : v === "custom" ? "#ffffff" : v);
          }}
        >
          {allowNone && <option value="none">Aucune</option>}
          {THEME_COLORS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          <option value="custom">Personnalisée…</option>
        </select>
        {mode === "custom" && (
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-7 flex-shrink-0 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent cursor-pointer" aria-label="Couleur" />
        )}
      </div>
    </Field>
  );
}

export function Section({ title, children, right }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide opacity-60">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
