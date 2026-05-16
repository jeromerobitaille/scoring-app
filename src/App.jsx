import React, { useEffect } from "react";
import ControlView from "./views/ControlView";
import DisplayView from "./views/DisplayView";
import BannerDisplay from "./views/BannerDisplay";
import CanvasView from "./views/CanvasView";
import SettingsView from "./views/SettingsView";
import { bus } from "./sync/SyncBus";
import { loadState } from "./state/storage";

export default function App() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isDisplay = params?.get("display") === "1";
  const isBanner  = params?.get("banner") === "1";
  const isCanvas  = params?.get("canvas") === "1";
  const isSettings = params?.get("settings") === "1";

  useEffect(() => {
    const saved = loadState();
    if (saved) bus?.post({ type: "sync:update", payload: saved });
    // Apply the saved theme on mount — dark by default if no preference saved.
    document.body.classList.toggle("dark", saved?.theme !== "light");
  }, []);

  if (isSettings) return <SettingsView />;
  if (isCanvas)   return <CanvasView />;
  if (isBanner)   return <BannerDisplay />;
  if (isDisplay)  return <DisplayView />;
  return <ControlView />;
}
