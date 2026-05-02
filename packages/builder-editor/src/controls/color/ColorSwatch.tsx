import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@ui-builder/ui";
import { FloatingPanel } from "../../panels/FloatingPanel";
import { ColorPicker } from "./ColorPicker";

interface ColorSwatchProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  value,
  onChange,
  label,
  size = "md",
  className,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelWidth = 220;
      const panelHeight = 320; // approximate
      const margin = 8;

      // Position below button
      let x = rect.left;
      let y = rect.bottom + 4;

      // Clamp to viewport bounds
      if (x + panelWidth + margin > window.innerWidth) {
        x = window.innerWidth - panelWidth - margin;
      }
      if (x < margin) {
        x = margin;
      }

      if (y + panelHeight + margin > window.innerHeight) {
        y = rect.top - panelHeight - 4;
      }
      if (y < margin) {
        y = margin;
      }

      setPanelPos({ x, y });
    }
    setOpen(true);
  };

  // Transparent checkerboard pattern for empty/transparent colors
  const checkerboard =
    "repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%) 0 0 / 8px 8px";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        title={label ?? value}
        className={cn(
          "rounded border border-border/60 flex-shrink-0 transition-all hover:scale-105 hover:shadow-sm active:scale-95",
          size === "sm" ? "w-5 h-5" : "w-6 h-6",
          className,
        )}
        style={{
          background: value || "transparent",
          backgroundImage: !value ? checkerboard : undefined,
        }}
      />

      {open &&
        createPortal(
          <FloatingPanel
            title={label ?? "Color"}
            defaultPosition={{ x: panelPos.x, y: panelPos.y }}
            width={220}
            onClose={() => setOpen(false)}
          >
            <ColorPicker value={value} onChange={onChange} />
          </FloatingPanel>,
          document.body,
        )}
    </>
  );
};
