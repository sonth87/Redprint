import React, { useState } from "react";
import type { ComponentDefinition, StyleConfig } from "@ui-builder/builder-core";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import type { PaletteItem } from "@/types/palette.types";
import { ScrollArea, Badge } from "@ui-builder/ui";
import { Check, Copy } from "lucide-react";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { buildPreviewDocument } from "@/lib/buildPreviewDocument";
import { registry } from "@/lib/registry";

interface ComponentInfoPanelProps {
  item: PaletteItem;
  definition: ComponentDefinition | null;
  registryInstance: ComponentRegistry;
}

export function ComponentInfoPanel({ item, definition }: ComponentInfoPanelProps) {
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
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-4">

        {/* Identity */}
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Identity
          </p>
          <div className="space-y-1.5">
            <Row label="Name" value={item.name} />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground w-20 shrink-0">ID</span>
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-mono text-foreground truncate flex-1">
                  {item.id}
                </span>
                <button
                  onClick={copyId}
                  className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
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
        </section>

        {/* Preview / Thumbnail */}
        <section className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </p>
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
                  registry={registry}
                  config={{ breakpoint: "desktop", variables: {}, attachNodeIds: false }}
                />
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center text-[10px] text-muted-foreground">
                No preview
              </div>
            )}
          </div>
        </section>

        {/* Default content */}
        {hasDefaultContent && (
          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Default Content
            </p>
            <div className="space-y-1">
              {Object.entries(definition!.defaultProps ?? {}).map(([key, val]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono w-20 shrink-0 truncate">
                    {key}
                  </span>
                  <span className="text-[10px] text-foreground break-all">
                    {typeof val === "string"
                      ? val
                      : JSON.stringify(val)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
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
