/**
 * GalleryMediaManager — dialog for managing images in a GalleryPro node.
 *
 * Features:
 * - Thumbnail grid with numbered badges
 * - Click item → right detail panel (Replace Image, Title, Description, Link)
 * - HTML5 drag-to-reorder (consistent with canvas drag patterns)
 * - Add Media → opens existing MediaManager (asset browser)
 * - Per-item context menu: Edit / Replace / Remove
 * - All mutations dispatch immediately (undo/redo via UPDATE_PROPS)
 */
import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  ScrollArea,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  cn,
} from "@ui-builder/ui";
import { Plus, MoreHorizontal, Pencil, ImageIcon, Trash2, Link, GripVertical } from "lucide-react";
import type { Asset } from "@ui-builder/builder-core";
import type { GalleryItem } from "@ui-builder/shared";
import { shortId } from "@ui-builder/shared";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GalleryMediaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: GalleryItem[];
  onItemsChange: (items: GalleryItem[]) => void;
  /** Opens the existing MediaManager asset browser for picking an image */
  onOpenMediaManager: (onSelect: (asset: Asset) => void) => void;
}

// ── GalleryItemThumbnail ──────────────────────────────────────────────────────

interface ThumbnailProps {
  item: GalleryItem;
  index: number;
  selected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function GalleryItemThumbnail({
  item, index, selected, isDragOver,
  onSelect, onReplace, onRemove,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: ThumbnailProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "relative aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all select-none group",
        selected ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30",
        isDragOver && "border-primary border-l-4 opacity-70",
      )}
    >
      {item.src ? (
        <img src={item.src} alt={item.alt ?? ""} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      {/* Number badge */}
      <div className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
        {index + 1}
      </div>

      {/* Center drag-move icon — visible on hover, signals draggability */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Context menu — visible on hover */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReplace(); }}>
              <ImageIcon className="h-3.5 w-3.5 mr-2" /> Replace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GalleryMediaManager({
  open, onOpenChange, items, onItemsChange, onOpenMediaManager,
}: GalleryMediaManagerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Local copy — mutations applied immediately and synced up via onItemsChange
  const [localItems, setLocalItems] = useState<GalleryItem[]>(items);

  // Sync from parent (e.g. undo/redo changes items from outside)
  React.useEffect(() => { setLocalItems(items); }, [items]);
  React.useEffect(() => { if (!open) setSelectedIndex(null); }, [open]);

  const dragIndexRef = useRef<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const applyItems = useCallback((next: GalleryItem[]) => {
    setLocalItems(next);
    onItemsChange(next);
  }, [onItemsChange]);

  const updateItem = useCallback((index: number, patch: Partial<GalleryItem>) => {
    const next = localItems.map((item, i) => i === index ? { ...item, ...patch } : item);
    applyItems(next);
  }, [localItems, applyItems]);

  const removeItem = useCallback((index: number) => {
    const next = localItems.filter((_, i) => i !== index);
    applyItems(next);
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }, [localItems, applyItems]);

  // ── Add Media ─────────────────────────────────────────────────────────────

  const handleAddMedia = useCallback(() => {
    onOpenMediaManager((asset) => {
      const newItem: GalleryItem = {
        id: shortId("gi-"),
        src: asset.url,
        alt: asset.name ?? "",
        title: "",
        description: "",
        link: "",
      };
      const next = [...localItems, newItem];
      applyItems(next);
      setSelectedIndex(next.length - 1);
    });
  }, [onOpenMediaManager, localItems, applyItems]);

  // ── Replace selected image ────────────────────────────────────────────────

  const handleReplace = useCallback((index: number) => {
    onOpenMediaManager((asset) => {
      updateItem(index, { src: asset.url, alt: asset.name ?? "" });
    });
  }, [onOpenMediaManager, updateItem]);

  // ── Drag-to-reorder ───────────────────────────────────────────────────────

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => setDropTargetIndex(null);

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDropTargetIndex(null);
      return;
    }
    const next = [...localItems];
    const [dragged] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, dragged!);
    applyItems(next);
    setSelectedIndex(dropIndex);
    dragIndexRef.current = null;
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDropTargetIndex(null);
  };

  // ── Selected item detail ──────────────────────────────────────────────────

  const selectedItem = selectedIndex !== null ? localItems[selectedIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Manage Gallery</DialogTitle>
            <span className="text-xs text-muted-foreground">{localItems.length} image{localItems.length !== 1 ? "s" : ""}</span>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── Left: thumbnail grid ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleAddMedia}>
                <Plus className="h-3.5 w-3.5" /> Add Media
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">Drag to reorder</span>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-4 gap-2 p-3">
                {localItems.map((item, i) => (
                  <GalleryItemThumbnail
                    key={item.id ?? i}
                    item={item}
                    index={i}
                    selected={selectedIndex === i}
                    isDragOver={dropTargetIndex === i}
                    onSelect={() => setSelectedIndex(i)}
                    onReplace={() => handleReplace(i)}
                    onRemove={() => removeItem(i)}
                    onDragStart={handleDragStart(i)}
                    onDragOver={handleDragOver(i)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(i)}
                    onDragEnd={handleDragEnd}
                  />
                ))}

                {/* Empty state */}
                {localItems.length === 0 && (
                  <div className="col-span-4 flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
                    <ImageIcon className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No images yet</p>
                    <Button size="sm" variant="outline" onClick={handleAddMedia}>Add your first image</Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ── Right: detail panel ────────────────────────────────────────── */}
          {selectedItem && selectedIndex !== null ? (
            <div className="w-56 shrink-0 flex flex-col overflow-hidden">
              {/* Image preview */}
              <div className="aspect-video bg-muted overflow-hidden border-b">
                {selectedItem.src ? (
                  <img src={selectedItem.src} alt={selectedItem.alt ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 flex flex-col gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs gap-1.5"
                    onClick={() => handleReplace(selectedIndex)}
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> Replace Image
                  </Button>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Title</Label>
                    <Input
                      className="h-7 text-xs"
                      placeholder="Image title"
                      value={selectedItem.title ?? ""}
                      onChange={(e) => updateItem(selectedIndex, { title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Description</Label>
                    <Textarea
                      className="text-xs resize-none"
                      placeholder="Image description"
                      rows={3}
                      value={selectedItem.description ?? ""}
                      onChange={(e) => updateItem(selectedIndex, { description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Link className="h-3 w-3" /> Link URL
                    </Label>
                    <Input
                      className="h-7 text-xs"
                      placeholder="https://..."
                      value={selectedItem.link ?? ""}
                      onChange={(e) => updateItem(selectedIndex, { link: e.target.value })}
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 mt-1"
                    onClick={() => removeItem(selectedIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Image
                  </Button>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="w-56 shrink-0 flex items-center justify-center text-center p-4 text-muted-foreground">
              <div>
                <ImageIcon className="h-8 w-8 opacity-25 mx-auto mb-2" />
                <p className="text-xs">Select an image to edit</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t">
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
