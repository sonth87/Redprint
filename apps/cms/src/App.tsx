import React, { useState } from "react";
import { Separator } from "@ui-builder/ui";
import { LayoutTemplate } from "lucide-react";
import { PALETTE_GROUPS } from "@/lib/paletteCatalog";
import { createRegistry, PresetCatalog, PresetEditor } from "@ui-builder/builder-presets";
import type { PaletteItem } from "@ui-builder/builder-presets";

const registry = createRegistry();

export function App() {
  const [selectedItem, setSelectedItem] = useState<PaletteItem | null>(null);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background">
      <header className="flex items-center h-11 px-4 border-b bg-background shrink-0 gap-2">
        <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center text-background text-xs font-black select-none">
          B
        </div>
        <span className="text-sm font-semibold">UI Builder</span>
        <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">
          Component Configurator
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: preset catalog */}
        <div className="w-80 shrink-0 overflow-hidden flex flex-col border-r">
          <PresetCatalog
            groups={PALETTE_GROUPS}
            selectedItemId={selectedItem?.id ?? null}
            onSelect={setSelectedItem}
            registry={registry}
          />
        </div>

        <Separator orientation="vertical" />

        {/* Center + Right: keyed so editor remounts with correct initial values per item */}
        {selectedItem ? (
          <PresetEditor
            key={selectedItem.id}
            item={selectedItem}
            registry={registry}
            onReset={() => {}}
            onChange={(updatedItem) => {
              // Future: persist updatedItem to API/database
              console.log("Preset updated:", updatedItem);
            }}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground select-none">
      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
        <LayoutTemplate className="h-7 w-7 text-muted-foreground/30" />
      </div>
      <p className="text-sm">Select a preset from the left panel</p>
      <p className="text-xs text-muted-foreground/60">
        Preview and edit properties in real-time
      </p>
    </div>
  );
}
