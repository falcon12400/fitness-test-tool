import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Use relative asset URLs so the built app works on GitHub Pages
  // and can also be opened from dist/index.html on local machines.
  base: "./",
  plugins: [react()],
});
