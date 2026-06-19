import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base` is left at "/" for local dev. It will be set to the repo sub-path
// (e.g. "/Actual-AI-Timeline/") for GitHub Pages in the Stage 5 deploy work.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
