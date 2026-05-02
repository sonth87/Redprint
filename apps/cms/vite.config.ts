import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui-builder/builder-components": path.resolve(__dirname, "../../packages/builder-components/src/index.ts"),
      "@ui-builder/builder-core": path.resolve(__dirname, "../../packages/builder-core/src/index.ts"),
      "@ui-builder/builder-editor": path.resolve(__dirname, "../../packages/builder-editor/src/index.ts"),
      "@ui-builder/builder-react": path.resolve(__dirname, "../../packages/builder-react/src/index.ts"),
      "@ui-builder/builder-presets": path.resolve(__dirname, "../../packages/builder-presets/src/index.ts"),
      "@ui-builder/builder-renderer": path.resolve(__dirname, "../../packages/builder-renderer/src/index.ts"),
      "@ui-builder/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@palette": path.resolve(__dirname, "../api/src/data/palette"),
    },
  },
  server: {
    port: 3003,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
