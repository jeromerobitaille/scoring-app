import React, { useEffect } from "react";
import ControlView from "./views/ControlView";
import OutputView from "./views/OutputView";
import EditorView from "./views/EditorView";
import SettingsView from "./views/SettingsView";
import { bus } from "./sync/SyncBus";
import { loadState } from "./state/storage";

export default function App() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  // Sorties : ?output=<id>, ou anciennes adresses (?display=1, ?banner=1, ?canvas=1).
  const isOutput =
    (!!params?.get("output") && params?.get("editor") !== "1") ||
    params?.get("display") === "1" ||
    params?.get("banner") === "1" ||
    params?.get("canvas") === "1";
  const isSettings = params?.get("settings") === "1";
  const isEditor = params?.get("editor") === "1";

  useEffect(() => {
    const saved = loadState();
    if (saved) bus?.post({ type: "sync:update", payload: saved });
    // Apply the saved theme on mount — dark by default if no preference saved.
    document.body.classList.toggle("dark", saved?.theme !== "light");
  }, []);

  if (isEditor) return <EditorView />;
  if (isSettings) return <SettingsView />;
  if (isOutput) return <OutputView />;
  return <ControlView />;
}
