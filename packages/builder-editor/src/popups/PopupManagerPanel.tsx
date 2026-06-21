import React, { useMemo, useState } from "react";
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
  cn,
} from "@ui-builder/ui";
import type { BuilderDocument, PopupAutoTrigger, PopupDefinition, PopupKind, PopupPlacement, PopupTemplate } from "@ui-builder/builder-core";
import { DEFAULT_POPUP_TEMPLATES } from "./defaultPopupTemplates";
import { Copy, Eye, EyeOff, Layers, Plus, Save, Trash2, X } from "lucide-react";

export interface PopupManagerPanelProps {
  document: BuilderDocument;
  activePopupId: string | null;
  registryTemplates: PopupTemplate[];
  onCreateFromTemplate: (template: PopupTemplate) => void;
  onCreateBlank: () => void;
  onEdit: (popupId: string | null) => void;
  onDuplicate: (popupId: string) => void;
  onDelete: (popupId: string) => void;
  onToggleEnabled: (popupId: string, enabled: boolean) => void;
  onUpdatePopup: (popupId: string, popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>) => void;
  onSaveTemplate: (popupId: string) => void;
}

const KIND_OPTIONS: PopupKind[] = ["modal", "drawer", "bottomSheet", "bar", "fullscreen"];
const PLACEMENT_OPTIONS: PopupPlacement[] = ["center", "top", "bottom", "left", "right"];

export function PopupManagerPanel({
  document,
  activePopupId,
  registryTemplates,
  onCreateFromTemplate,
  onCreateBlank,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onUpdatePopup,
  onSaveTemplate,
}: PopupManagerPanelProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const popups = useMemo(
    () => Object.values(document.popups ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [document.popups],
  );
  const templates = useMemo(() => {
    const byId = new Map<string, PopupTemplate>();
    DEFAULT_POPUP_TEMPLATES.forEach((template) => byId.set(template.id, template));
    registryTemplates.forEach((template) => byId.set(template.id, template));
    let all = Array.from(byId.values());
    if (category !== "all") {
      all = all.filter((template) => (template.category ?? "Uncategorized") === category);
    }
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (template) =>
        template.name.toLowerCase().includes(q) ||
        template.description?.toLowerCase().includes(q) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [category, registryTemplates, search]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    DEFAULT_POPUP_TEMPLATES.forEach((template) => values.add(template.category ?? "Uncategorized"));
    registryTemplates.forEach((template) => values.add(template.category ?? "Uncategorized"));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [registryTemplates]);

  const activePopup = activePopupId ? document.popups?.[activePopupId] : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popups</p>
            <p className="truncate text-sm font-medium">{popups.length} popup{popups.length === 1 ? "" : "s"}</p>
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={onCreateBlank}>
            <Plus className="h-3.5 w-3.5" />
            Blank
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              Existing
            </div>
            {popups.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Create a popup from a template or start blank.
              </div>
            ) : (
              <div className="space-y-2">
                {popups.map((popup) => (
                  <div
                    key={popup.id}
                    className={cn(
                      "rounded-md border bg-background/80 p-2 transition-colors",
                      popup.id === activePopupId && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(popup.id)}>
                        <div className="truncate text-xs font-semibold">{popup.name}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {popup.kind} · {popup.placement} · {popup.autoTrigger.type}
                        </div>
                      </button>
                      <button
                        className="mt-0.5 text-muted-foreground hover:text-foreground"
                        title={popup.enabled ? "Disable" : "Enable"}
                        onClick={() => onToggleEnabled(popup.id, !popup.enabled)}
                      >
                        {popup.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button className="mt-0.5 text-muted-foreground hover:text-foreground" title="Duplicate" onClick={() => onDuplicate(popup.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button className="mt-0.5 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => onDelete(popup.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activePopup && (
            <div className="rounded-md border bg-primary/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{activePopup.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Editing shell · {activePopup.kind} · {activePopup.placement}
                  </p>
                </div>
                <button className="text-muted-foreground hover:text-foreground" title="Save as template" onClick={() => onSaveTemplate(activePopup.id)}>
                  <Save className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Templates</Label>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input className="h-8 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className="rounded-md border bg-background p-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => onCreateFromTemplate(template)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-xs font-semibold">{template.name}</div>
                    <div className="shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{template.popup.kind}</div>
                  </div>
                  {template.description && <div className="mt-0.5 text-[10px] text-muted-foreground">{template.description}</div>}
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span>{template.category ?? "Uncategorized"}</span>
                    <span>·</span>
                    <span>{template.popup.autoTrigger.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function PopupSettings({
  popup,
  onChange,
  onExit,
  onSaveTemplate,
}: {
  popup: PopupDefinition;
  onChange: (popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>) => void;
  onExit: () => void;
  onSaveTemplate: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{popup.name}</p>
          <p className="text-[10px] text-muted-foreground">Popup settings</p>
        </div>
        <div className="flex gap-1">
          <button className="text-muted-foreground hover:text-foreground" title="Save as template" onClick={onSaveTemplate}>
            <Save className="h-3.5 w-3.5" />
          </button>
          <button className="text-muted-foreground hover:text-foreground" title="Exit popup edit" onClick={onExit}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[10px] text-muted-foreground">Name</Label>
        <Input className="h-8 text-xs" value={popup.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Kind</Label>
          <Select value={popup.kind} onValueChange={(kind) => onChange({ kind: kind as PopupKind })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((kind) => <SelectItem key={kind} value={kind}>{kind}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Placement</Label>
          <Select value={popup.placement} onValueChange={(placement) => onChange({ placement: placement as PopupPlacement })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLACEMENT_OPTIONS.map((placement) => <SelectItem key={placement} value={placement}>{placement}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TriggerSettings popup={popup} onChange={onChange} />

      <div className="grid grid-cols-2 gap-2">
        <BooleanSetting label="Backdrop" value={popup.behavior.backdrop.enabled} onChange={(enabled) => onChange({ behavior: { ...popup.behavior, backdrop: { ...popup.behavior.backdrop, enabled } } })} />
        <BooleanSetting label="ESC close" value={popup.behavior.closeOnEscape} onChange={(closeOnEscape) => onChange({ behavior: { ...popup.behavior, closeOnEscape } })} />
        <BooleanSetting label="Backdrop close" value={popup.behavior.closeOnBackdropClick} onChange={(closeOnBackdropClick) => onChange({ behavior: { ...popup.behavior, closeOnBackdropClick } })} />
        <BooleanSetting label="Body lock" value={popup.behavior.lockBodyScroll} onChange={(lockBodyScroll) => onChange({ behavior: { ...popup.behavior, lockBodyScroll } })} />
      </div>
    </div>
  );
}

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
