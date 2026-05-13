import React from "react";

export default function Label({ htmlFor, className = "", children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-zinc-700 dark:text-zinc-200 ${className}`.trim()}
    >
      {children}
    </label>
  );
}
