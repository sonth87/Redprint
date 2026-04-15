import React from "react";
import { Label } from "@ui-builder/ui";
import { NumericPropertyInput } from "../controls/NumericPropertyInput";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import {
  ArrowLeftRight,
  ArrowUpDown,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

interface SizeSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

type SizeField = {
  key: string;
  icon: React.ReactNode;
  label: string;
  units: string[];
};

const SIZE_FIELDS: SizeField[] = [
  { key: "width",     icon: <ArrowLeftRight className="h-3 w-3" />, label: "W",        units: ["px", "%", "vw"] },
  { key: "height",    icon: <ArrowUpDown    className="h-3 w-3" />, label: "H",        units: ["px", "%", "vh"] },
  { key: "minWidth",  icon: <MoveHorizontal className="h-3 w-3" />, label: "Min W",    units: ["px", "%"] },
  { key: "maxWidth",  icon: <MoveHorizontal className="h-3 w-3" />, label: "Max W",    units: ["px", "%"] },
  { key: "minHeight", icon: <MoveVertical   className="h-3 w-3" />, label: "Min H",    units: ["px", "%"] },
  { key: "maxHeight", icon: <MoveVertical   className="h-3 w-3" />, label: "Max H",    units: ["px", "%"] },
];

export function SizeSection({ style, onStyleChange }: SizeSectionProps) {
  return (
    <CollapsibleSection title="Size">
      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        {SIZE_FIELDS.map((field) => (
          <div key={field.key} className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              {field.icon}
              {field.label}
            </Label>
            <NumericPropertyInput
              value={String(style[field.key] ?? "")}
              placeholder="auto"
              units={field.units}
              min={0}
              onChange={(val) => onStyleChange(field.key, val || undefined)}
            />
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
