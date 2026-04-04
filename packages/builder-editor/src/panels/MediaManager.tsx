/**
 * MediaManager — dialog for browsing, uploading, and selecting media assets.
 *
 * 3 tabs: Library (browse), Upload (drag-and-drop), URL (paste link).
 */
import React, { memo, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ScrollArea,
  Label,
  cn,
} from "@ui-builder/ui";
import {
  Search,
  Upload,
  Link2,
  ImageIcon,
  Film,
  FileText,
  Trash2,
  Check,
  FolderOpen,
} from "lucide-react";
import type { Asset, AssetType } from "@ui-builder/builder-core";

export interface MediaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onSelect: (asset: Asset) => void;
  onUpload?: (files: File[]) => void;
  onDelete?: (assetId: string) => void;
  onUrlAdd?: (url: string, type: AssetType) => void;
  acceptTypes?: AssetType[];
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  file: FileText,
};

function AssetCard({
  asset,
  selected,
  onSelect,
  onDelete,
}: {
  asset: Asset;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const Icon = TYPE_ICONS[asset.type] ?? FileText;

  return (
    <div
      className={cn(
        "group relative rounded-md border overflow-hidden cursor-pointer transition-all",
        selected
          ? "ring-2 ring-primary border-primary"
          : "border-border hover:border-foreground/20",
      )}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      {asset.type === "image" && asset.url ? (
        <div
          className="aspect-square bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${asset.url})` }}
        />
      ) : (
        <div className="aspect-square bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      {/* Delete button */}
      {onDelete && (
        <button
          className="absolute top-1 left-1 w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-2.5 w-2.5 text-destructive-foreground" />
        </button>
      )}

      {/* Name */}
      <div className="p-1.5">
        <p className="text-[10px] text-foreground/80 truncate">{asset.name ?? asset.id}</p>
        <p className="text-[9px] text-muted-foreground truncate">{asset.type}</p>
      </div>
    </div>
  );
}

export const MediaManager = memo(function MediaManager({
  open,
  onOpenChange,
  assets,
  onSelect,
  onUpload,
  onDelete,
  onUrlAdd,
  acceptTypes,
}: MediaManagerProps) {
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [isDragOver, setIsDragOver] = useState(false);

  const filtered = useMemo(() => {
    let list = assets;
    if (acceptTypes && acceptTypes.length > 0) {
      list = list.filter((a) => acceptTypes.includes(a.type));
    }
    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          (a.name ?? "").toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [assets, search, typeFilter, acceptTypes]);

  const handleConfirm = useCallback(() => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onOpenChange(false);
    }
  }, [selectedAsset, onSelect, onOpenChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!onUpload) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onUpload(files);
    },
    [onUpload],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onUpload || !e.target.files) return;
      onUpload(Array.from(e.target.files));
      e.target.value = "";
    },
    [onUpload],
  );

  const handleUrlSubmit = useCallback(() => {
    if (!onUrlAdd || !urlInput.trim()) return;
    // Infer type from URL
    const ext = urlInput.split(".").pop()?.toLowerCase() ?? "";
    let type: AssetType = "image";
    if (["mp4", "webm", "ogg", "mov"].includes(ext)) type = "video";
    else if (["woff", "woff2", "ttf", "otf"].includes(ext)) type = "font";
    onUrlAdd(urlInput.trim(), type);
    setUrlInput("");
  }, [urlInput, onUrlAdd]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Media Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="library" className="text-xs gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs gap-1">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs gap-1">
              <Link2 className="h-3.5 w-3.5" />
              URL
            </TabsTrigger>
          </TabsList>

          {/* Library tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 mt-2">
            {/* Filters */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search assets…"
                  className="pl-8 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                {(["all", "image", "video", "font", "file"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs px-2"
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === "all" ? "All" : t}
                  </Button>
                ))}
              </div>
            </div>

            {/* Asset grid */}
            <ScrollArea className="flex-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-xs">No assets found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pb-2">
                  {filtered.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      selected={selectedAsset?.id === asset.id}
                      onSelect={() => setSelectedAsset(asset)}
                      onDelete={onDelete ? () => onDelete(asset.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Upload tab */}
          <TabsContent value="upload" className="flex-1 mt-2">
            <div
              className={cn(
                "flex flex-col items-center justify-center h-full min-h-[200px] rounded-lg border-2 border-dashed transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Drag & drop files here
              </p>
              <p className="text-xs text-muted-foreground/60 mb-3">
                or click to browse
              </p>
              <label>
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <span>Choose Files</span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,video/*,.woff,.woff2,.ttf,.otf"
                  onChange={handleFileInput}
                />
              </label>
            </div>
          </TabsContent>

          {/* URL tab */}
          <TabsContent value="url" className="flex-1 mt-2">
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Asset URL</Label>
                <div className="flex gap-2">
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUrlSubmit();
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a URL to an image, video, or font file. The type will be detected automatically.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedAsset}
          >
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
