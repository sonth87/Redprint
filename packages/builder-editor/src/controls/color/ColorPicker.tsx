import React, { useState } from "react";
import { Sketch } from "@uiw/react-color";
import type { ColorResult } from "@uiw/react-color";
import { cn } from "@ui-builder/ui";
import { Plus, Pencil, Check, X } from "lucide-react";
import { useDocument } from "@ui-builder/builder-react";
import { useBuilder } from "@ui-builder/builder-react";
import { CMD_SET_THEME_COLORS } from "@ui-builder/builder-core";
import { useMyColors } from "./useMyColors";

const DEFAULT_THEME_COLORS = [
  "#ffffff", "#f3f4f6", "#9ca3af", "#374151", "#111827", "#3b82f6", "#ef4444",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const { document: builderDoc } = useDocument();
  const { dispatch } = useBuilder();
  const { myColors, addColor, removeColor } = useMyColors();
  const [isEditingTheme, setIsEditingTheme] = useState(false);

  const themeColors = builderDoc.themeColors ?? DEFAULT_THEME_COLORS;

  const handleSketchChange = (result: ColorResult) => {
    onChange(result.hexa === result.hex ? result.hex : result.hexa);
  };

  const handleAddMyColor = () => {
    const hex = value.startsWith("#") ? value.slice(0, 7) : value;
    addColor(hex);
  };

  const handleThemeColorToggle = (color: string) => {
    if (!isEditingTheme) {
      onChange(color);
      return;
    }
    // In edit mode: toggle color in/out of theme
    if (themeColors.includes(color)) {
      dispatch({ type: CMD_SET_THEME_COLORS, payload: { colors: themeColors.filter((c) => c !== color) } });
    }
  };

  const handleAddThemeColor = () => {
    const hex = value.startsWith("#") ? value.slice(0, 7) : value;
    if (!themeColors.includes(hex)) {
      dispatch({ type: CMD_SET_THEME_COLORS, payload: { colors: [...themeColors, hex] } });
    }
  };

  return (
    <div className="flex flex-col gap-0 w-[220px]">
      {/* Sketch picker (gradient + hue + alpha + hex) */}
      <Sketch
        color={value}
        onChange={handleSketchChange}
        presetColors={false}
        style={{ width: "100%", boxShadow: "none", borderRadius: 0, padding: "8px 8px 4px" }}
      />

      {/* Theme colors */}
      <div className="px-2 pb-1 border-t border-border/50">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Theme colors</span>
          <button
            onClick={() => setIsEditingTheme((v) => !v)}
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded transition-colors",
              isEditingTheme
                ? "text-primary bg-primary/10"
                : "text-primary hover:bg-primary/10"
            )}
          >
            {isEditingTheme ? "Done" : "Edit"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {themeColors.map((color) => (
            <button
              key={color}
              onClick={() => handleThemeColorToggle(color)}
              title={isEditingTheme ? `Remove ${color}` : color}
              className={cn(
                "relative w-6 h-6 rounded-sm border border-border/50 flex-shrink-0 transition-all hover:scale-110",
                isEditingTheme && "ring-1 ring-destructive/50"
              )}
              style={{ background: color }}
            >
              {isEditingTheme && (
                <X className="absolute inset-0 m-auto w-3 h-3 text-white drop-shadow" />
              )}
            </button>
          ))}
          {isEditingTheme && (
            <button
              onClick={handleAddThemeColor}
              title="Add current color to theme"
              className="w-6 h-6 rounded-sm border border-dashed border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* My colors */}
      <div className="px-2 pb-2 border-t border-border/50">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">My colors</span>
          <button
            onClick={handleAddMyColor}
            className="text-[10px] text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded transition-colors"
          >
            + Add
          </button>
        </div>
        {myColors.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No saved colors yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {myColors.map((color) => (
              <button
                key={color}
                onClick={() => onChange(color)}
                onContextMenu={(e) => { e.preventDefault(); removeColor(color); }}
                title={`${color} (right-click to remove)`}
                className="w-6 h-6 rounded-full border border-border/50 flex-shrink-0 transition-all hover:scale-110"
                style={{ background: color }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
