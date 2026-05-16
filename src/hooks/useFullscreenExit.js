import { useEffect } from "react";

/**
 * Listens globally for Escape and Cmd/Ctrl+F. When fired, closes the current
 * Electron window (via the preload-exposed window.fwst.closeWindow).
 *
 * Designed for the secondary fullscreen outputs (banner / canvas / tableau)
 * so an operator can dismiss a kiosk window from the keyboard without
 * touching the mouse. In a regular browser (or dev mode without Electron),
 * the hook is a no-op.
 */
export default function useFullscreenExit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.fwst?.closeWindow) return;

    const handler = (e) => {
      const isCtrlF = (e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F");
      const isEscape = e.key === "Escape";
      if (!isCtrlF && !isEscape) return;
      e.preventDefault();
      e.stopPropagation();
      try { window.fwst.closeWindow(); } catch {}
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);
}
