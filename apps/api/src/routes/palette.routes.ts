import { Router } from "express";
import { PaletteService } from "../services/palette.service.js";

const router = Router();

router.get("/catalog", async (_req, res) => {
  try {
    const catalog = await PaletteService.getCatalog();
    res.json(catalog);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/metadata", async (_req, res) => {
  try {
    const metadata = await PaletteService.getMetadata();
    res.json(metadata);
  } catch (error) {
    console.error("Error fetching metadata:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/groups/:id/items", async (req, res) => {
  try {
    const groupItems = await PaletteService.getGroupItems(req.params.id);
    if (!groupItems) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.json(groupItems);
  } catch (error) {
    console.error("Error fetching group items:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/items/:id", async (req, res) => {
  try {
    const item = await PaletteService.getItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export const paletteRouter: Router = router;
