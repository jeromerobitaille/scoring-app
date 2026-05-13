export type ScoreMode = "higher" | "lower";

export interface Entry {
  id: string;
  name: string;
  raw: string;
  parsed: number | null;
  timeHint?: boolean;
}

export interface AppState {
  eventName: string;
  scoreMode: ScoreMode;
  entries: Entry[];
  theme: "dark" | "light";
  bannerWidth: number;
  bannerHeight: number;
}
