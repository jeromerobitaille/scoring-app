import React from "react";

export default function TextInput(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-2xl border px-4 py-3 outline-none shadow-sm " +
        "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
      }
    />
  );
}
