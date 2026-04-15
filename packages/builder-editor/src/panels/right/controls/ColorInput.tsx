import React from "react";
import { Input } from "@ui-builder/ui";
import { cn } from "@ui-builder/ui";

interface ColorInputProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

/**
 * Color swatch + hex text input combo.
 * The swatch opens native color picker; the text field accepts any valid CSS color.
 */
export function ColorInput({ value, onChange, className }: ColorInputProps) {
  // Normalize to a hex string for the color input (fallback to black)
  const hexForPicker = /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : /^#[0-9a-fA-F]{3}$/.test(value)
    ? value
    : "#000000";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative h-7 w-7 shrink-0">
        <div
          className="absolute inset-0 rounded border border-input"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px",
          }}
        />
        <div
          className="absolute inset-0 rounded"
          style={{ backgroundColor: value || "transparent" }}
        />
        <input
          type="color"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          value={hexForPicker}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <Input
        className="h-7 text-xs flex-1 font-mono"
        value={String(value ?? "")}
        placeholder="#000000 or rgba()"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
