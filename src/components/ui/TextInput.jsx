import React from "react";

const BASE =
  "w-full rounded-2xl border px-4 py-3 outline-none shadow-sm " +
  "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100";

export default function TextInput({ className = "", ...props }) {
  return <input {...props} className={`${BASE} ${className}`.trim()} />;
}
