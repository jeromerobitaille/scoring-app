import React from "react";

export default function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "rounded-2xl px-4 py-3 shadow-sm font-medium hover:shadow transition active:translate-y-px hover:cursor-pointer " +
        "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 " +
        className
      }
    >
      {children}
    </button>
  );
}
