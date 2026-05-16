import React from "react";
import useSyncedState from "../state/useSyncedState";
import useFullscreenExit from "../hooks/useFullscreenExit";
import BannerView from "../components/BannerView";

const FALLBACK_BANNER = {
  width: 2592, height: 216,
  nameScale: 1, scoreScale: 1,
  pageSize: 3, showLogo: true,
};

export default function BannerDisplay() {
  useFullscreenExit();
  const [state] = useSyncedState();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  const bid = Math.min(1, Math.max(0, Number(params?.get("bid")) || 0));
  const banner = state.banners?.[bid] ?? state.banners?.[0] ?? FALLBACK_BANNER;

  const wParam = params?.get("w") ? Number(params.get("w")) : banner.width;
  const hParam = params?.get("h") ? Number(params.get("h")) : banner.height;

  const width = Math.max(320, wParam || 0);
  const height = Math.max(64, hParam || 0);

  return (
    <BannerView
      banner={banner}
      entries={state.entries}
      scoreMode={state.scoreMode}
      eventName={state.eventName}
      width={width}
      height={height}
    />
  );
}
