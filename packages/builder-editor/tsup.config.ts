import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    external: ["react", "react-dom"],
    treeshake: true,
    splitting: false,
    // CSS bundle for editor styles
    injectStyle: false,
  },
]);
