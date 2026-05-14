import React from "react";

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="inline-flex p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur"
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer " +
              (isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100")
            }
          >
            {t.icon ? <t.icon className="w-4 h-4" /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
