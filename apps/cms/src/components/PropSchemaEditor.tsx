import React, { useState } from "react";
import type { BuilderNode, ComponentDefinition } from "@ui-builder/builder-core";
import { ScrollArea, Separator } from "@ui-builder/ui";
import { Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { PropControl } from "./prop-controls/PropControl";
import { StyleEditor } from "./StyleEditor";

interface PropSchemaEditorProps {
  definition: ComponentDefinition | null;
  node: BuilderNode | null;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
}

export function PropSchemaEditor({
  definition,
  node,
  onPropChange,
  onStyleChange,
}: PropSchemaEditorProps) {
  if (!definition || !node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4">
        <Settings2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-center">
          Select a node to edit its properties
        </p>
      </div>
    );
  }

  const props = node.props;
  const style = node.style as Record<string, unknown>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 border-b shrink-0">
        <p className="text-[10px] font-semibold">{definition.name}</p>
        <p className="text-[9px] text-muted-foreground font-mono">{definition.type}</p>
      </div>

      <ScrollArea className="flex-1">
        {definition.propSchema.length > 0 && (
          <CollapsibleSection title="Properties">
            <div className="space-y-3">
              {definition.propSchema.map((schema) => (
                <PropControl
                  key={schema.key}
                  schema={schema}
                  value={props[schema.key]}
                  onChange={(val) => onPropChange(schema.key, val)}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {definition.propSchema.length > 0 && <Separator />}

        <CollapsibleSection title="Style">
          <StyleEditor style={style} onChange={onStyleChange} />
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex items-center gap-1 w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}
