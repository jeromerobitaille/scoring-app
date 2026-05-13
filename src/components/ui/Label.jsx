import React from "react";

export default function Label({ children }) {
  return <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{children}</label>;
}
