import React from "react";

const BASE =
  "rounded-2xl px-4 py-3 shadow-sm font-medium transition active:translate-y-px " +
  "hover:shadow hover:cursor-pointer " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0 " +
  "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900";

export default function Button({ children, className = "", ...props }) {
  return (
    <button {...props} className={`${BASE} ${className}`.trim()}>
      {children}
    </button>
  );
}
