
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import localHubPlugin from "./plugins/localHub.js";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), localHubPlugin("/live-score")],
  server: {
    host: true,
    port: 5173,
  },
});
  