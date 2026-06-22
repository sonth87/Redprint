/**
 * Popup routes — library (user-saved) + service templates.
 *
 * Library storage: apps/api/src/data/popup-library.json
 * Templates (read-only): apps/api/src/data/popup-templates.json
 */
import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const LIBRARY_FILE = path.join(DATA_DIR, "popup-library.json");
const TEMPLATES_FILE = path.join(DATA_DIR, "popup-templates.json");

// ── Types ─────────────────────────────────────────────────────────────────

export interface SavedPopup {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  thumbnail?: string | null;
  popup: unknown;  // PopupDefinition shape (minus id/rootNodeId/metadata)
  root: unknown;   // PopupNodeTemplate
  savedAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function readLibrary(): Record<string, SavedPopup> {
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeLibrary(data: Record<string, SavedPopup>): void {
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(data, null, 2));
}

function readTemplates(): unknown[] {
  try {
    return JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

// ── Router ────────────────────────────────────────────────────────────────

const router: Router = Router();

// ── Popup Library ─────────────────────────────────────────────────────────

/** GET /api/popups — list all saved popups in library */
router.get("/", (_req: Request, res: Response) => {
  const library = readLibrary();
  res.json({ popups: Object.values(library).sort((a, b) => b.savedAt.localeCompare(a.savedAt)) });
});

/** POST /api/popups — save a popup to library */
router.post("/", (req: Request, res: Response) => {
  const { name, description, category, tags, thumbnail, popup, root } = req.body ?? {};

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!popup || !root) {
    res.status(400).json({ error: "popup and root are required" });
    return;
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  const entry: SavedPopup = {
    id,
    name: String(name),
    description: description ? String(description) : undefined,
    category: category ? String(category) : undefined,
    tags: Array.isArray(tags) ? tags.map(String) : undefined,
    thumbnail: thumbnail ? String(thumbnail) : null,
    popup,
    root,
    savedAt: now,
    updatedAt: now,
  };

  const library = readLibrary();
  library[id] = entry;
  writeLibrary(library);

  res.status(201).json({ popup: entry });
});

/** PATCH /api/popups/:id — update metadata (name, description, thumbnail, etc.) */
router.patch("/:id", (req: Request, res: Response) => {
  const library = readLibrary();
  const id = String(req.params.id);
  const entry = library[id];

  if (!entry) {
    res.status(404).json({ error: "Popup not found" });
    return;
  }

  const { name, description, category, tags, thumbnail } = req.body ?? {};
  const updated: SavedPopup = {
    ...entry,
    ...(name !== undefined && { name: String(name) }),
    ...(description !== undefined && { description: String(description) }),
    ...(category !== undefined && { category: String(category) }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags.map(String) : entry.tags }),
    ...(thumbnail !== undefined && { thumbnail: thumbnail ? String(thumbnail) : null }),
    updatedAt: new Date().toISOString(),
  };

  library[id] = updated;
  writeLibrary(library);
  res.json({ popup: updated });
});

/** DELETE /api/popups/:id — remove a saved popup */
router.delete("/:id", (req: Request, res: Response) => {
  const library = readLibrary();
  const id = String(req.params.id);

  if (!library[id]) {
    res.status(404).json({ error: "Popup not found" });
    return;
  }

  delete library[id];
  writeLibrary(library);
  res.json({ success: true });
});

// ── Service Templates ─────────────────────────────────────────────────────

/** GET /api/popups/templates — list all service templates */
router.get("/templates", (_req: Request, res: Response) => {
  res.json({ templates: readTemplates() });
});

export { router as popupRouter };
