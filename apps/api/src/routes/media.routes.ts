/**
 * Media routes — upload, list, delete assets.
 * Files stored in apps/api/uploads/
 * Metadata persisted in apps/api/uploads/metadata.json
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const METADATA_FILE = path.join(UPLOADS_DIR, "metadata.json");

// ── Ensure uploads dir exists ─────────────────────────────────────────────
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify({}));
}

// ── Metadata helpers ──────────────────────────────────────────────────────
type AssetMeta = {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "font" | "file";
  mimeType: string;
  size: number;
  uploadedAt: string;
  filename: string;
};

function readMeta(): Record<string, AssetMeta> {
  try {
    return JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeMeta(data: Record<string, AssetMeta>) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
}

function inferType(mimeType: string): AssetMeta["type"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("font") || mimeType.includes("woff")) return "font";
  return "file";
}

// ── Multer storage ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, "_")
      .slice(0, 40);
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|gif|webp|svg|avif|mp4|webm|mov|woff2?|ttf|otf)$/i;
    cb(null, allowed.test(file.originalname));
  },
});

// ── Router ────────────────────────────────────────────────────────────────
const router: import("express").Router = Router();

/** POST /api/media/upload — upload one or more files */
router.post("/upload", upload.array("files", 20), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    res.status(400).json({ error: "No files uploaded" });
    return;
  }

  const apiBase = `${req.protocol}://${req.get("host")}`;
  const meta = readMeta();
  const assets: AssetMeta[] = [];

  for (const file of files) {
    const id = uuidv4();
    const asset: AssetMeta = {
      id,
      name: file.originalname,
      filename: file.filename,
      url: `${apiBase}/uploads/${file.filename}`,
      type: inferType(file.mimetype),
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    meta[id] = asset;
    assets.push(asset);
  }

  writeMeta(meta);
  res.json({ assets });
});

/** GET /api/media/list — list all uploaded assets */
router.get("/list", (_req: Request, res: Response) => {
  const meta = readMeta();
  res.json({ assets: Object.values(meta) });
});

/** DELETE /api/media/:id — delete an asset by id */
router.delete("/:id", (req: Request, res: Response) => {
  const meta = readMeta();
  const assetId = String(req.params.id);
  const asset = meta[assetId];
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, asset.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  delete meta[assetId];
  writeMeta(meta);
  res.json({ success: true });
});

export { router as mediaRouter };
