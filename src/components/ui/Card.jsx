import React from "react";

export default function Card({ children, className = "" }) {
  return (
    <div className={"rounded-3xl border p-5 shadow-sm bg-white/70 dark:bg-zinc-900/70 backdrop-blur " +
      "border-zinc-200 dark:border-zinc-800 " + className}>
      {children}
    </div>
  );
}
