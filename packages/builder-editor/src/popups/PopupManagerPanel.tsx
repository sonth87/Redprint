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
import { BookMarked, CloudUpload, Copy, Eye, EyeOff, Layers, LayoutTemplate, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";

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

// ── My Popups Tab ─────────────────────────────────────────────────────────

function MyPopupsTab({
  document,
  activePopupId,
  backendUrl,
  onCreateBlank,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onUpdatePopup,
  onCreateFromTemplate,
  onSaveToLibrary,
}: Pick<
  PopupManagerPanelProps,
  | "document"
  | "activePopupId"
  | "backendUrl"
  | "onCreateBlank"
  | "onEdit"
  | "onDuplicate"
  | "onDelete"
  | "onToggleEnabled"
  | "onUpdatePopup"
  | "onCreateFromTemplate"
  | "onSaveToLibrary"
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
    } catch (e) {
      setLibraryError("Could not load library");
    } finally {
      setLibraryLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleSaveToLibrary = async (popup: PopupDefinition) => {
    if (!onSaveToLibrary) return;
    setSavingId(popup.id);
    try {
      await onSaveToLibrary(popup.id);
      // Reload library to show newly saved entry
      await loadLibrary();
    } catch {
      // silently fail
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
    <div className="flex h-full min-h-0 flex-col gap-0">
      {/* In-document popups */}
      <div className="border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            In this document
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal">{popups.length}</span>
          </div>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={onCreateBlank}>
            <Plus className="h-3.5 w-3.5" />
            Blank
          </Button>
        </div>

        {popups.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            No popups yet. Create one below or use a template.
          </p>
        ) : (
          <div className="space-y-1.5">
            {popups.map((popup) => (
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
                      title={popup.enabled ? "Disable" : "Enable"}
                      onClick={() => onToggleEnabled(popup.id, !popup.enabled)}
                    >
                      {popup.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      title="Duplicate"
                      onClick={() => onDuplicate(popup.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {backendUrl && (
                      <button
                        className="rounded p-0.5 text-muted-foreground hover:text-primary"
                        title="Save to library"
                        disabled={savingId === popup.id}
                        onClick={() => handleSaveToLibrary(popup)}
                      >
                        {savingId === popup.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <CloudUpload className="h-3.5 w-3.5" />
                        }
                      </button>
                    )}
                    <button
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      title="Delete"
                      onClick={() => onDelete(popup.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved library */}
      {backendUrl && (
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <BookMarked className="h-3.5 w-3.5" />
              My library
              {library.length > 0 && (
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal">{library.length}</span>
              )}
            </div>
            <button
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              title="Refresh"
              onClick={loadLibrary}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", libraryLoading && "animate-spin")} />
            </button>
          </div>

          {libraryLoading && library.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Loading...
            </div>
          ) : libraryError ? (
            <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-center text-xs text-destructive">
              {libraryError}
            </p>
          ) : library.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              Save a popup from the document to build your library.
            </p>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-1.5">
                {library.map((entry) => (
                  <div key={entry.id} className="group rounded-md border bg-background px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => onCreateFromTemplate(entry)}
                        title="Insert into document"
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
                        title="Delete from library"
                        onClick={() => handleDeleteFromLibrary(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
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
    let list = allTemplates;
    if (category !== "all") list = list.filter((t) => (t.category ?? "Other") === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [allTemplates, category, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Filter bar */}
      <div className="border-b p-3 space-y-2">
        <Input
          className="h-8 text-xs"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
              category === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <ScrollArea className="min-h-0 flex-1">
        {loading && allTemplates.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Loading templates...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">No templates found.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => onCreateFromTemplate(template)}
                onPreview={() => setPreviewTemplate(template)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Preview modal */}
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
    <div className="group flex flex-col overflow-hidden rounded-md border bg-background transition-colors hover:border-primary/50">
      {/* Thumbnail / placeholder */}
      <button
        className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-muted"
        onClick={onPreview}
        title="Preview"
      >
        {template.thumbnail ? (
          <img src={template.thumbnail} alt={template.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <LayoutTemplate className="h-6 w-6" />
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", KIND_BADGE_COLOR[(template.popup as PopupDefinition).kind])}>
              {(template.popup as PopupDefinition).kind}
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-foreground">Preview</span>
        </div>
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2">
        <div className="truncate text-xs font-semibold">{template.name}</div>
        {template.description && (
          <div className="line-clamp-2 text-[10px] text-muted-foreground">{template.description}</div>
        )}
        {template.tags && template.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-0.5 pt-1">
            {template.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
        <Button size="sm" className="mt-1.5 h-6 w-full text-[11px]" onClick={onUse}>
          Use template
        </Button>
      </div>
    </div>
  );
}

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
            <div className="text-xs text-muted-foreground">{template.category}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thumbnail */}
        <div className="flex h-40 items-center justify-center bg-muted">
          {template.thumbnail ? (
            <img src={template.thumbnail} alt={template.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
              <LayoutTemplate className="h-10 w-10" />
              <span className="text-xs">No preview available</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 px-4 py-3">
          {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
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
            Use this template
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
      <Tabs defaultValue="my-popups" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-2 mb-0 grid w-auto grid-cols-2 rounded-md">
          <TabsTrigger value="my-popups" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            My Popups
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-popups" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <MyPopupsTab
            document={document}
            activePopupId={activePopupId}
            backendUrl={backendUrl}
            onCreateBlank={onCreateBlank}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onToggleEnabled={onToggleEnabled}
            onUpdatePopup={onUpdatePopup}
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
