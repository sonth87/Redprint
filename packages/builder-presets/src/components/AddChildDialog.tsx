import React, { useState } from "react";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import type { PaletteItem } from "../types/palette.types";
import { MiniRender, MINI_THUMB_W, MINI_THUMB_H } from "./ui/MiniRender";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  ScrollArea,
} from "@ui-builder/ui";
import { ArrowLeft } from "lucide-react";

export interface AddChildDialogProps {
  open: boolean;
  registry: ComponentRegistry;
  existingPresets: PaletteItem[];
  targetLabel?: string;
  insertMode?: "inside" | "before" | "after";
  allowedComponentTypes?: string[];
  onConfirm: (
    componentType: string,
    props: Record<string, unknown>,
    style: Record<string, unknown>,
  ) => void;
  onClose: () => void;
}

export function AddChildDialog({
  open,
  registry,
  existingPresets,
  targetLabel,
  insertMode = "inside",
  allowedComponentTypes,
  onConfirm,
  onClose,
}: AddChildDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const allDefinitions = registry
    .listComponents()
    .filter((def) =>
      !allowedComponentTypes || allowedComponentTypes.includes(def.type),
    )
    .sort((a, b) => a.type.localeCompare(b.type));

  const handleSelectType = (type: string) => {
    setSelectedType(type);
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  const handleConfirm = (
    componentType: string,
    props: Record<string, unknown>,
    style: Record<string, unknown>,
  ) => {
    setSelectedType(null);
    onConfirm(componentType, props, style);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            {selectedType && (
              <button
                onClick={handleBack}
                className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <DialogTitle className="text-sm font-semibold">
              {selectedType
                ? `Add ${selectedType} — choose starting point`
                : "Insert component — choose type"}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {buildInsertHint(insertMode, targetLabel)}
          </p>
          {allowedComponentTypes && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Allowed here: {allowedComponentTypes.join(", ")}
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          {!selectedType ? (
            <TypeGrid
              definitions={allDefinitions}
              onSelect={handleSelectType}
            />
          ) : (
            <PresetPicker
              componentType={selectedType}
              registry={registry}
              existingPresets={existingPresets.filter(
                (p) => p.componentType === selectedType,
              )}
              onConfirm={handleConfirm}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function buildInsertHint(
  insertMode: "inside" | "before" | "after",
  targetLabel?: string,
): string {
  const target = targetLabel ? `"${targetLabel}"` : "selected node";

  if (insertMode === "before") {
    return `New component will be inserted before ${target}.`;
  }
  if (insertMode === "after") {
    return `New component will be inserted after ${target}.`;
  }
  return `New component will be inserted inside ${target}.`;
}

// ─── Step 1: type grid ────────────────────────────────────────────────────────

function TypeGrid({
  definitions,
  onSelect,
}: {
  definitions: ReturnType<ComponentRegistry["listComponents"]>;
  onSelect: (type: string) => void;
}) {
  if (definitions.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No compatible components for this insertion target.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {definitions.map((def) => (
        <button
          key={def.type}
          onClick={() => onSelect(def.type)}
          className="flex flex-col items-start gap-1 p-3 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium truncate">{def.name ?? def.type}</span>
            {def.category && (
              <Badge variant="outline" className="text-[9px] px-1 h-4 font-normal shrink-0 ml-1">
                {def.category}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{def.type}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Step 2: preset picker ────────────────────────────────────────────────────

function PresetPicker({
  componentType,
  registry,
  existingPresets,
  onConfirm,
}: {
  componentType: string;
  registry: ComponentRegistry;
  existingPresets: PaletteItem[];
  onConfirm: (
    componentType: string,
    props: Record<string, unknown>,
    style: Record<string, unknown>,
  ) => void;
}) {
  const definition = registry.getComponent(componentType);
  const defaultProps = definition?.defaultProps ?? {};
  const defaultStyle = (definition?.defaultStyle ?? {}) as Record<string, unknown>;

  const blankItem: PaletteItem = {
    id: "__blank__",
    componentType,
    name: "Blank",
    props: defaultProps,
    style: defaultStyle,
  };

  const allItems = [blankItem, ...existingPresets];

  return (
    <div className="p-4 flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Select a starting point for the new <span className="font-medium text-foreground">{componentType}</span>:
      </p>
      <div className="grid grid-cols-3 gap-3">
        {allItems.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() =>
              onConfirm(
                componentType,
                item.props,
                (item.style ?? {}) as Record<string, unknown>,
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onConfirm(
                  componentType,
                  item.props,
                  (item.style ?? {}) as Record<string, unknown>,
                );
              }
            }}
            className="flex flex-col items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/50 transition-colors group cursor-pointer"
          >
            <div
              className="rounded border overflow-hidden flex items-center justify-center bg-white group-hover:border-primary/40 transition-colors pointer-events-none"
              style={{ width: MINI_THUMB_W, height: MINI_THUMB_H }}
            >
              <MiniRender item={item} registry={registry} />
            </div>
            <span className="text-[11px] font-medium truncate w-full text-center">
              {item.name}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2 border-t">
        <Button
          size="sm"
          variant="default"
          onClick={() =>
            onConfirm(componentType, defaultProps, defaultStyle)
          }
        >
          Add blank {componentType}
        </Button>
      </div>
    </div>
  );
}
