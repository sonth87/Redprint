/**
 * AI Backend Server — Entry point.
 */
import express from "express";
import cors from "cors";
import path from "path";
import { aiRouter } from "./routes/ai.routes.js";
import { paletteRouter } from "./routes/palette.routes.js";
import { mediaRouter, UPLOADS_DIR } from "./routes/media.routes.js";

const PORT = parseInt(process.env.PORT ?? "3002", 10);

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────

app.use(
  cors({
    // Allow playground (3000) and website (3001) in dev
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "2mb" }));

// ── Static: serve uploaded files ──────────────────────────────────────────
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Routes ────────────────────────────────────────────────────────────────

app.use("/api/ai", aiRouter);
app.use("/api/palette", paletteRouter);
app.use("/api/media", mediaRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    provider: process.env.LLM_PROVIDER ?? "openai",
    model: process.env.LLM_MODEL ?? "(default)",
    generationMode: process.env.AI_GENERATION_MODE ?? "sequential",
  });
});

// ── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AI Backend running on http://localhost:${PORT}`);
  console.log(`   Provider : ${process.env.LLM_PROVIDER ?? "openai"}`);
  console.log(`   Model    : ${process.env.LLM_MODEL ?? "(default)"}`);
  console.log(`   Mode     : ${process.env.AI_GENERATION_MODE ?? "sequential"}`);
  console.log(`   Batch    : ${process.env.AI_BATCH_SIZE ?? "3"}\n`);
});
