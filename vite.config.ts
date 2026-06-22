import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base: "./"` makes all asset URLs relative, so the build works both at the
// dev-server root and when served from the GitHub Pages sub-path
// (https://<user>.github.io/Actual-AI-Timeline/). Deep-linking uses a query
// param, not a path route, so no SPA 404 fallback is needed.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // Honour a PORT assigned by the environment (e.g. the preview harness) so the
  // dev server binds where it's expected instead of auto-incrementing.
  server: process.env.PORT ? { port: Number(process.env.PORT) } : undefined,
});
