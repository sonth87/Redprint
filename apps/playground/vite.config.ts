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
      "@ui-builder/builder-react": path.resolve(__dirname, "../../packages/builder-react/src/index.ts"),
      "@ui-builder/builder-editor": path.resolve(__dirname, "../../packages/builder-editor/src/index.ts"),
      "@ui-builder/builder-renderer": path.resolve(__dirname, "../../packages/builder-renderer/src/index.ts"),
      "@ui-builder/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@ui-builder/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy Figma API calls to bypass CORS in development.
      // figmaApiClient.ts calls /figma-api/v1/... → forwarded to https://api.figma.com/v1/...
      "/figma-api": {
        target: "https://api.figma.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/figma-api/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
