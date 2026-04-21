import React, { useState } from "react";
import type { ComponentDefinition, ComponentRegistry, StyleConfig } from "@ui-builder/builder-core";
import type { PaletteItem } from "../types/palette.types";
import { ScrollArea, Badge } from "@ui-builder/ui";
import { Check, Copy, Info } from "lucide-react";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { buildPreviewDocument } from "../lib/buildPreviewDocument";
import { CollapsibleSection } from "./ui/CollapsibleSection";

interface PresetInfoPanelProps {
  item: PaletteItem;
  definition: ComponentDefinition | null;
  registryInstance: ComponentRegistry;
}

export function PresetInfoPanel({ item, definition, registryInstance }: PresetInfoPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(item.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const doc = definition
    ? buildPreviewDocument(
        item.componentType,
        item.props,
        (item.style ?? {}) as Partial<StyleConfig>,
      )
    : null;

  const hasDefaultContent =
    definition &&
    Object.keys(definition.defaultProps ?? {}).length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header — mirrors PropSchemaEditor's node type header */}
      <div className="shrink-0 border-b px-3 py-1.5 flex items-center gap-2">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold truncate">{item.name}</p>
          <p className="text-muted-foreground font-mono text-[9px] truncate">{item.componentType}</p>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {/* Identity */}
        <CollapsibleSection title="Identity">
          <div className="space-y-1.5">
            <Row label="Name" value={item.name} />

            {/* ID with copy button */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0">ID</span>
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-mono text-foreground truncate flex-1">
                  {item.id}
                </span>
                <button
                  onClick={copyId}
                  className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy ID"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0">Type</span>
              <span className="text-[10px] font-mono text-foreground truncate">
                {item.componentType}
              </span>
            </div>

            {definition && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0">Category</span>
                <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-normal capitalize">
                  {definition.category}
                </Badge>
              </div>
            )}

            {item.tags && item.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0 mt-0.5">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 h-4 font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Preview */}
        <CollapsibleSection title="Preview" defaultOpen={true}>
          <div className="rounded border bg-white overflow-hidden">
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.name}
                className="w-full object-cover"
              />
            ) : doc ? (
              <div className="overflow-hidden">
                <RuntimeRenderer
                  document={doc}
                  registry={registryInstance}
                  config={{ breakpoint: "desktop", variables: {}, attachNodeIds: false }}
                />
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center text-[10px] text-muted-foreground">
                No preview
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Default content */}
        {hasDefaultContent && (
          <CollapsibleSection title="Default Content" defaultOpen={false}>
            <div className="space-y-1">
              {Object.entries(definition!.defaultProps ?? {}).map(([key, val]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono w-20 shrink-0 truncate">
                    {key}
                  </span>
                  <span className="text-[10px] text-foreground break-all">
                    {typeof val === "string" ? val : JSON.stringify(val)}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {definition && (
          <CollapsibleSection title="Capabilities" defaultOpen={false}>
            <div className="space-y-1.5">
              <CapRow label="Can have children" value={definition.capabilities.canContainChildren} />
              <CapRow label="Can resize" value={definition.capabilities.canResize} />
              <CapRow label="Can rotate" value={definition.capabilities.canRotate ?? false} />
              {definition.capabilities.acceptedChildTypes && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground w-28 shrink-0">Allowed children</span>
                  <div className="flex flex-wrap gap-1">
                    {definition.capabilities.acceptedChildTypes.map((c) => (
                      <Badge key={c} variant="outline" className="text-[9px] px-1.5 h-4 font-normal font-mono">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </ScrollArea>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-[10px] text-foreground truncate">{value}</span>
    </div>
  );
}

function CapRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground w-28 shrink-0">{label}</span>
      <Badge
        variant={value ? "default" : "outline"}
        className="text-[9px] px-1.5 h-4 font-normal"
      >
        {value ? "Yes" : "No"}
      </Badge>
    </div>
  );
}
