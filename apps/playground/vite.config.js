import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
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
    },
    build: {
        outDir: "dist",
        sourcemap: true,
    },
});
//# sourceMappingURL=vite.config.js.map