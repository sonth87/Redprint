import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@ui-builder/ui";
import type {
  BuilderDocument,
  PopupAutoTrigger,
  PopupDefinition,
  PopupKind,
  PopupPlacement,
  PopupTemplate,
} from "@ui-builder/builder-core";
import { popupApiClient, type SavedPopupEntry } from "./popupApiClient";
import {
  BookMarked,
  CloudUpload,
  Copy,
  Eye,
  EyeOff,
  LayoutTemplate,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

export interface PopupManagerPanelProps {
  document: BuilderDocument;
  activePopupId: string | null;
  /** Registry templates passed from BuilderEditor (in-memory, from PopupTemplateRegistry) */
  registryTemplates: PopupTemplate[];
  backendUrl?: string;
  onCreateFromTemplate: (template: PopupTemplate) => void;
  onCreateBlank: () => void;
  onEdit: (popupId: string | null) => void;
  onDuplicate: (popupId: string) => void;
  onDelete: (popupId: string) => void;
  onToggleEnabled: (popupId: string, enabled: boolean) => void;
  onUpdatePopup: (popupId: string, popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>) => void;
  /** Called when user wants to save the active popup to the server library */
  onSaveToLibrary?: (popupId: string) => Promise<void>;
}

const KIND_OPTIONS: PopupKind[] = ["modal", "drawer", "bottomSheet", "bar", "fullscreen"];
const PLACEMENT_OPTIONS: PopupPlacement[] = ["center", "top", "bottom", "left", "right"];

const KIND_BADGE_COLOR: Record<PopupKind, string> = {
  modal: "bg-blue-500/10 text-blue-600",
  drawer: "bg-violet-500/10 text-violet-600",
  bottomSheet: "bg-cyan-500/10 text-cyan-600",
  bar: "bg-amber-500/10 text-amber-600",
  fullscreen: "bg-rose-500/10 text-rose-600",
};

// ── In-page Popups Tab ────────────────────────────────────────────────────

function PagePopupsTab({
  document,
  activePopupId,
  onCreateBlank,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
}: Pick<
  PopupManagerPanelProps,
  "document" | "activePopupId" | "onCreateBlank" | "onEdit" | "onDuplicate" | "onDelete" | "onToggleEnabled"
>) {
  const popups = useMemo(
    () => Object.values(document.popups ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [document.popups],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          <span>Trang này</span>
          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal">{popups.length}</span>
        </div>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={onCreateBlank}>
          <Plus className="h-3.5 w-3.5" />
          Tạo mới
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-1.5">
          {popups.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Chưa có popup nào. Tạo mới hoặc dùng template.
            </p>
          ) : (
            popups.map((popup) => (
              <div
                key={popup.id}
                className={cn(
                  "group rounded-md border bg-background/80 px-2.5 py-2 transition-colors",
                  popup.id === activePopupId && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center gap-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(popup.id)}>
                    <div className="truncate text-xs font-semibold">{popup.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", KIND_BADGE_COLOR[popup.kind])}>
                        {popup.kind}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{popup.autoTrigger.type}</span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      title={popup.enabled ? "Tắt" : "Bật"}
                      onClick={() => onToggleEnabled(popup.id, !popup.enabled)}
                    >
                      {popup.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      title="Nhân bản"
                      onClick={() => onDuplicate(popup.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      title="Xóa"
                      onClick={() => onDelete(popup.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── My Library Tab ────────────────────────────────────────────────────────

function MyLibraryTab({
  document,
  activePopupId,
  backendUrl,
  onCreateFromTemplate,
  onSaveToLibrary,
}: Pick<
  PopupManagerPanelProps,
  "document" | "activePopupId" | "backendUrl" | "onCreateFromTemplate" | "onSaveToLibrary"
>) {
  const [library, setLibrary] = useState<SavedPopupEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const popups = useMemo(
    () => Object.values(document.popups ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [document.popups],
  );

  const loadLibrary = useCallback(async () => {
    if (!backendUrl) return;
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const entries = await popupApiClient.listLibrary(backendUrl);
      setLibrary(entries);
    } catch {
      setLibraryError("Không tải được thư viện");
    } finally {
      setLibraryLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const handleSaveToLibrary = async (popup: PopupDefinition) => {
    if (!onSaveToLibrary) return;
    setSavingId(popup.id);
    try {
      await onSaveToLibrary(popup.id);
      await loadLibrary();
    } catch {
      // ignore
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteFromLibrary = async (id: string) => {
    if (!backendUrl) return;
    try {
      await popupApiClient.deleteFromLibrary(backendUrl, id);
      setLibrary((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Save from document section */}
      {onSaveToLibrary && popups.length > 0 && (
        <div className="border-b px-3 py-2 flex-shrink-0">
          <p className="text-[11px] text-muted-foreground mb-1.5">Lưu popup từ trang vào thư viện:</p>
          <div className="space-y-1">
            {popups.map((popup) => (
              <div key={popup.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs">{popup.name}</span>
                <button
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
                  title="Lưu vào thư viện"
                  disabled={savingId === popup.id}
                  onClick={() => handleSaveToLibrary(popup)}
                >
                  {savingId === popup.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CloudUpload className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library list */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <BookMarked className="h-3.5 w-3.5" />
          <span>Thư viện của tôi</span>
          {library.length > 0 && (
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal">{library.length}</span>
          )}
        </div>
        <button
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          title="Tải lại"
          onClick={loadLibrary}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", libraryLoading && "animate-spin")} />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3">
          {libraryLoading && library.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Đang tải...
            </div>
          ) : libraryError ? (
            <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-center text-xs text-destructive">
              {libraryError}
            </p>
          ) : library.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              Chưa có popup nào trong thư viện.
            </p>
          ) : (
            <div className="space-y-1.5">
              {library.map((entry) => (
                <div key={entry.id} className="group rounded-md border bg-background px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onCreateFromTemplate(entry)}
                      title="Chèn vào trang"
                    >
                      <div className="truncate text-xs font-semibold">{entry.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", KIND_BADGE_COLOR[(entry.popup as PopupDefinition).kind])}>
                          {(entry.popup as PopupDefinition).kind}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(entry.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                    <button
                      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      title="Xóa khỏi thư viện"
                      onClick={() => handleDeleteFromLibrary(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────

function TemplatesTab({
  registryTemplates,
  backendUrl,
  onCreateFromTemplate,
}: Pick<PopupManagerPanelProps, "registryTemplates" | "backendUrl" | "onCreateFromTemplate">) {
  const [serverTemplates, setServerTemplates] = useState<PopupTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<PopupTemplate | null>(null);

  useEffect(() => {
    if (!backendUrl) return;
    setLoading(true);
    popupApiClient
      .listTemplates(backendUrl)
      .then(setServerTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backendUrl]);

  const allTemplates = useMemo(() => {
    const byId = new Map<string, PopupTemplate>();
    serverTemplates.forEach((t) => byId.set(t.id, t));
    registryTemplates.forEach((t) => byId.set(t.id, t));
    return Array.from(byId.values());
  }, [serverTemplates, registryTemplates]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allTemplates.forEach((t) => set.add(t.category ?? "Other"));
    return Array.from(set).sort();
  }, [allTemplates]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return allTemplates;
    return allTemplates.filter((t) => (t.category ?? "Other") === activeCategory);
  }, [allTemplates, activeCategory]);

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left: category nav ── */}
      <div className="flex flex-col w-[110px] flex-shrink-0 border-r bg-muted/20 overflow-y-auto py-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "text-left px-3 py-2 text-xs transition-colors",
            activeCategory === "all"
              ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
          )}
        >
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "text-left px-3 py-2 text-xs transition-colors",
              activeCategory === cat
                ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Right: template list ── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {loading && allTemplates.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Không có template.</div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-2">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => onCreateFromTemplate(template)}
                  onPreview={() => setPreviewTemplate(template)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Preview overlay */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onUse={() => {
            onCreateFromTemplate(previewTemplate);
            setPreviewTemplate(null);
          }}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

// ── Template Card — horizontal layout with thumbnail ─────────────────────

function TemplateCard({
  template,
  onUse,
  onPreview,
}: {
  template: PopupTemplate;
  onUse: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="group flex overflow-hidden rounded-md border bg-background transition-colors hover:border-primary/50">
      {/* Thumbnail — left side */}
      <button
        className="relative flex h-20 w-[90px] flex-shrink-0 items-center justify-center overflow-hidden bg-muted"
        onClick={onPreview}
        title="Xem trước"
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
            <LayoutTemplate className="h-7 w-7" />
            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", KIND_BADGE_COLOR[(template.popup as PopupDefinition).kind])}>
              {(template.popup as PopupDefinition).kind}
            </span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-foreground">Xem</span>
        </div>
      </button>

      {/* Info — right side */}
      <div className="flex flex-1 min-w-0 flex-col justify-between p-2 gap-1">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{template.name}</div>
          {template.description && (
            <div className="line-clamp-2 text-[10px] text-muted-foreground leading-tight mt-0.5">
              {template.description}
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-full text-[10px] px-2"
          onClick={onUse}
        >
          Dùng template
        </Button>
      </div>
    </div>
  );
}

// ── Template Preview Modal ────────────────────────────────────────────────

function TemplatePreviewModal({
  template,
  onUse,
  onClose,
}: {
  template: PopupTemplate;
  onUse: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-lg border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{template.name}</div>
            {template.category && (
              <div className="text-xs text-muted-foreground">{template.category}</div>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thumbnail — large */}
        <div className="flex h-48 items-center justify-center bg-muted overflow-hidden">
          {template.thumbnail ? (
            <img
              src={template.thumbnail}
              alt={template.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
              <LayoutTemplate className="h-12 w-12" />
              <span className="text-xs">Chưa có ảnh xem trước</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 px-4 py-3">
          {template.description && (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          )}
          <div className="flex flex-wrap gap-1">
            <span className={cn("rounded px-2 py-0.5 text-[11px] font-medium", KIND_BADGE_COLOR[(template.popup as PopupDefinition).kind])}>
              {(template.popup as PopupDefinition).kind}
            </span>
            {template.tags?.map((tag) => (
              <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="border-t px-4 py-3">
          <Button className="w-full" onClick={onUse}>
            Dùng template này
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────

export function PopupManagerPanel({
  document,
  activePopupId,
  registryTemplates,
  backendUrl,
  onCreateFromTemplate,
  onCreateBlank,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onUpdatePopup,
  onSaveToLibrary,
}: PopupManagerPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <Tabs defaultValue="page-popups" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 mb-0 grid w-auto grid-cols-3 rounded-md">
          <TabsTrigger value="page-popups" className="gap-1 text-[11px] px-1">
            <Layers className="h-3 w-3" />
            Danh sách
          </TabsTrigger>
          <TabsTrigger value="my-library" className="gap-1 text-[11px] px-1">
            <BookMarked className="h-3 w-3" />
            Popup của tôi
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1 text-[11px] px-1">
            <LayoutTemplate className="h-3 w-3" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="page-popups" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <PagePopupsTab
            document={document}
            activePopupId={activePopupId}
            onCreateBlank={onCreateBlank}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onToggleEnabled={onToggleEnabled}
          />
        </TabsContent>

        <TabsContent value="my-library" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <MyLibraryTab
            document={document}
            activePopupId={activePopupId}
            backendUrl={backendUrl}
            onCreateFromTemplate={onCreateFromTemplate}
            onSaveToLibrary={onSaveToLibrary}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <TemplatesTab
            registryTemplates={registryTemplates}
            backendUrl={backendUrl}
            onCreateFromTemplate={onCreateFromTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── PopupSettings (used by older inline edit path, kept for compat) ────────

function TriggerSettings({
  popup,
  onChange,
}: {
  popup: PopupDefinition;
  onChange: (popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>) => void;
}) {
  const trigger = popup.autoTrigger;
  const setTrigger = (autoTrigger: PopupAutoTrigger) => onChange({ autoTrigger });
  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-muted-foreground">Auto trigger</Label>
      <Select
        value={trigger.type}
        onValueChange={(type) => {
          if (type === "pageLoad") setTrigger({ type, delayMs: 1000 });
          else if (type === "scrollDepth") setTrigger({ type, percent: 50 });
          else if (type === "sectionVisible") setTrigger({ type, targetNodeId: "", threshold: 0.25 });
          else setTrigger({ type: "manual" });
        }}
      >
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">manual</SelectItem>
          <SelectItem value="pageLoad">page load delay</SelectItem>
          <SelectItem value="scrollDepth">scroll depth</SelectItem>
          <SelectItem value="sectionVisible">section visible</SelectItem>
        </SelectContent>
      </Select>
      {trigger.type === "pageLoad" && (
        <Input className="h-8 text-xs" type="number" value={trigger.delayMs ?? 0} onChange={(e) => setTrigger({ type: "pageLoad", delayMs: Number(e.target.value) })} />
      )}
      {trigger.type === "scrollDepth" && (
        <Input className="h-8 text-xs" type="number" value={trigger.percent} onChange={(e) => setTrigger({ type: "scrollDepth", percent: Number(e.target.value) })} />
      )}
      {trigger.type === "sectionVisible" && (
        <Input className="h-8 font-mono text-xs" value={trigger.targetNodeId} onChange={(e) => setTrigger({ ...trigger, targetNodeId: e.target.value })} placeholder="section node id" />
      )}
    </div>
  );
}

function BooleanSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
