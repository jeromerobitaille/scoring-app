import React, { useEffect } from "react";
import ControlView from "./views/ControlView";
import DisplayView from "./views/DisplayView";
import BannerDisplay from "./views/BannerDisplay";
import SettingsView from "./views/SettingsView";   // <-- NEW
import { bus } from "./sync/SyncBus";
import { loadState } from "./state/storage";

export default function App() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isDisplay = params?.get("display") === "1";
  const isBanner  = params?.get("banner") === "1";
  const isSettings = params?.get("settings") === "1";  // <-- NEW

  useEffect(() => {
    const saved = loadState();
    if (saved) bus?.post({ type: "sync:update", payload: saved });
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", true);
  }, []);

  if (isSettings) return <SettingsView />;  // <-- NEW
  if (isBanner)   return <BannerDisplay />;
  if (isDisplay)  return <DisplayView />;
  return <ControlView />;
}

