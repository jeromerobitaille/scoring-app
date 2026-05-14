import React from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function ThemeToggle({ theme, onChange }) {
  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";
  const label = isDark ? "Passer en mode clair" : "Passer en mode sombre";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={label}
      title={label}
      className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 cursor-pointer"
    >
      {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
