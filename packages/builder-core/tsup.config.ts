import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // No React, no DOM — pure Node/ESM environment
  target: "es2022",
  platform: "neutral",
  treeshake: true,
  splitting: false,
});
