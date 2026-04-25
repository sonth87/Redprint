/**
 * MediaManager — dialog for browsing, uploading, and selecting media assets.
 *
 * 3 tabs: Library (browse), Upload (drag-and-drop), URL (paste link).
 *
 * Upload flow:
 *  - Per-file progress items shown while uploading (pending → uploading → done/error)
 *  - After all done, auto-switches to Library tab so user sees the new assets
 *  - Toast feedback is handled by BuilderEditor (which receives Asset[] back from onUpload)
 */
import React, { memo, useState, useCallback, useMemo, useRef } from "react";
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
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { Asset, AssetType } from "@ui-builder/builder-core";

export interface MediaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onSelect: (asset: Asset) => void;
  /** Returns the newly uploaded Asset[] so the dialog can show them immediately */
  onUpload?: (files: File[]) => Promise<Asset[]>;
  onDelete?: (assetId: string) => void;
  onUrlAdd?: (url: string, type: AssetType) => void;
  acceptTypes?: AssetType[];
}

// ── Upload queue item ─────────────────────────────────────────────────────

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  previewUrl?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  file: FileText,
};

// ── Asset card ────────────────────────────────────────────────────────────

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

      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

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

      <div className="p-1.5">
        <p className="text-[10px] text-foreground/80 truncate">{asset.name ?? asset.id}</p>
        <p className="text-[9px] text-muted-foreground truncate">{asset.type}</p>
      </div>
    </div>
  );
}

// ── Upload progress row ───────────────────────────────────────────────────

function UploadRow({ item }: { item: UploadItem }) {
  const sizeLabel =
    item.size < 1024 * 1024
      ? `${(item.size / 1024).toFixed(0)} KB`
      : `${(item.size / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50">
      {/* Thumbnail / icon */}
      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-muted border border-border">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{sizeLabel}</p>
        {/* Progress bar */}
        {item.status === "uploading" && (
          <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[upload-progress_1.2s_ease-in-out_infinite]" style={{ width: "60%" }} />
          </div>
        )}
      </div>

      {/* Status icon */}
      <div className="shrink-0">
        {item.status === "pending" && (
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
        )}
        {item.status === "uploading" && (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        )}
        {item.status === "done" && (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        {item.status === "error" && (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState("library");
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processFiles = useCallback(
    async (files: File[]) => {
      if (!onUpload || files.length === 0) return;

      // Build queue items with image previews
      const items: UploadItem[] = await Promise.all(
        files.map(async (f) => {
          let previewUrl: string | undefined;
          if (f.type.startsWith("image/")) {
            previewUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(f);
            });
          }
          return {
            id: `${f.name}-${f.size}-${Date.now()}`,
            name: f.name,
            size: f.size,
            status: "pending" as UploadStatus,
            previewUrl,
          };
        }),
      );

      setUploadQueue(items);
      setActiveTab("upload");

      // Upload sequentially so progress is visible per file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const itemId = items[i]!.id;

        setUploadQueue((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, status: "uploading" } : it)),
        );

        try {
          await onUpload([file]);
          setUploadQueue((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, status: "done" } : it)),
          );
        } catch {
          setUploadQueue((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, status: "error" } : it)),
          );
        }
      }

      // After all done, switch to Library so user sees the new assets
      setTimeout(() => {
        setActiveTab("library");
        setUploadQueue([]);
      }, 900);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    },
    [processFiles],
  );

  const handleUrlSubmit = useCallback(() => {
    if (!onUrlAdd || !urlInput.trim()) return;
    const ext = urlInput.split(".").pop()?.toLowerCase() ?? "";
    let type: AssetType = "image";
    if (["mp4", "webm", "ogg", "mov"].includes(ext)) type = "video";
    else if (["woff", "woff2", "ttf", "otf"].includes(ext)) type = "font";
    onUrlAdd(urlInput.trim(), type);
    setUrlInput("");
  }, [urlInput, onUrlAdd]);

  const isUploading = uploadQueue.some((it) => it.status === "uploading" || it.status === "pending");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Media Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="library" className="text-xs gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Library
              {assets.length > 0 && (
                <span className="ml-1 text-[9px] bg-muted-foreground/20 rounded-full px-1.5 py-0.5 font-medium">
                  {assets.length}
                </span>
              )}
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
                {(["all", "image", "video"] as const).map((t) => (
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

            <ScrollArea className="flex-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-xs">No assets found.</p>
                  {onUpload && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Upload files
                    </Button>
                  )}
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
          <TabsContent value="upload" className="flex-1 flex flex-col mt-2 min-h-0">
            {uploadQueue.length > 0 ? (
              /* Progress list */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {isUploading
                      ? "Uploading…"
                      : `${uploadQueue.filter((i) => i.status === "done").length} / ${uploadQueue.length} uploaded`}
                  </p>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setUploadQueue([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-1.5 pr-1">
                    {uploadQueue.map((item) => (
                      <UploadRow key={item.id} item={item} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              /* Drop zone */
              <div
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-h-[200px] rounded-lg border-2 border-dashed transition-colors",
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
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,video/*,.woff,.woff2,.ttf,.otf"
                  onChange={handleFileInput}
                />
              </div>
            )}
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
                Paste a URL to an image, video, or font file. The type will be
                detected automatically.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={!selectedAsset}>
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
