/**
 * Shared property controls.
 *
 * These controls use `useNodeProperty` internally, ensuring that
 * both the contextual toolbar and property panel dispatch identical commands.
 */
import React, { memo, useCallback } from "react";
import { useNodeProperty } from "@ui-builder/builder-react";
import {
  STYLE_PROPERTIES,
  PROP_PROPERTIES,
} from "@ui-builder/builder-core";
import type { PropertyDescriptor } from "@ui-builder/builder-core";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Toggle,
} from "@ui-builder/ui";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";

// ── Generic control ──────────────────────────────────────────────────────

export interface PropertyInputProps {
  nodeId: string | null;
  descriptor: PropertyDescriptor<string>;
  placeholder?: string;
  className?: string;
}

/** Text input bound to a PropertyDescriptor. */
export const PropertyInput = memo(function PropertyInput({
  nodeId,
  descriptor,
  placeholder,
  className,
}: PropertyInputProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, descriptor);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">{descriptor.label}</Label>
      <Input
        className={className ?? "h-7 text-xs"}
        value={value ?? ""}
        placeholder={placeholder ?? "auto"}
        onChange={(e) => setValue(e.target.value || (undefined as unknown as string))}
      />
    </div>
  );
});

// ── Color control ────────────────────────────────────────────────────────

export interface ColorControlProps {
  nodeId: string | null;
  descriptor: PropertyDescriptor<string>;
  compact?: boolean;
}

/** Color picker + hex input. */
export const ColorControl = memo(function ColorControl({
  nodeId,
  descriptor,
  compact,
}: ColorControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, descriptor);
  return (
    <div className="grid gap-1">
      {!compact && <Label className="text-[10px] text-muted-foreground">{descriptor.label}</Label>}
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          className="h-7 w-8 rounded border border-input bg-background cursor-pointer shrink-0"
          value={value ?? "#000000"}
          onChange={(e) => setValue(e.target.value)}
        />
        <Input
          className="h-7 text-xs flex-1 font-mono"
          value={value ?? ""}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </div>
  );
});

// ── Font size control ────────────────────────────────────────────────────

export interface FontSizeControlProps {
  nodeId: string | null;
}

const FONT_SIZE_OPTIONS = [
  "10px", "11px", "12px", "13px", "14px", "16px", "18px", "20px",
  "24px", "28px", "32px", "36px", "40px", "48px", "56px", "64px", "72px",
];

export const FontSizeControl = memo(function FontSizeControl({ nodeId }: FontSizeControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.fontSize);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Font Size</Label>
      <Select value={value ?? ""} onValueChange={setValue}>
        <SelectTrigger className="h-7 text-xs w-[90px]">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

// ── Font weight control ──────────────────────────────────────────────────

export interface FontWeightControlProps {
  nodeId: string | null;
}

const FONT_WEIGHT_OPTIONS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

export const FontWeightControl = memo(function FontWeightControl({ nodeId }: FontWeightControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.fontWeight);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Weight</Label>
      <Select value={value ?? "400"} onValueChange={setValue}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_WEIGHT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

// ── Text align control ───────────────────────────────────────────────────

export interface TextAlignControlProps {
  nodeId: string | null;
}

export const TextAlignControl = memo(function TextAlignControl({ nodeId }: TextAlignControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.textAlign);
  const icons = [
    { val: "left", Icon: AlignLeft },
    { val: "center", Icon: AlignCenter },
    { val: "right", Icon: AlignRight },
    { val: "justify", Icon: AlignJustify },
  ];
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Align</Label>
      <div className="flex gap-0.5">
        {icons.map(({ val, Icon }) => (
          <Toggle
            key={val}
            size="sm"
            pressed={value === val}
            onPressedChange={() => setValue(val)}
            className="h-7 w-7 p-0"
          >
            <Icon className="h-3 w-3" />
          </Toggle>
        ))}
      </div>
    </div>
  );
});

// ── Text decoration control ──────────────────────────────────────────────

export interface TextDecorationControlProps {
  nodeId: string | null;
}

export const TextDecorationControl = memo(function TextDecorationControl({ nodeId }: TextDecorationControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.textDecoration);
  const fontWeight = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.fontWeight);
  const fontStyle = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.textTransform);

  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Decoration</Label>
      <div className="flex gap-0.5">
        <Toggle
          size="sm"
          pressed={fontWeight.value === "700" || fontWeight.value === "bold"}
          onPressedChange={(pressed) => fontWeight.setValue(pressed ? "700" : "400")}
          className="h-7 w-7 p-0"
        >
          <Bold className="h-3 w-3" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={fontStyle.value === "uppercase"}
          onPressedChange={(pressed) => fontStyle.setValue(pressed ? "uppercase" : "none")}
          className="h-7 w-7 p-0"
        >
          <Italic className="h-3 w-3" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={value === "underline"}
          onPressedChange={(pressed) => setValue(pressed ? "underline" : "none")}
          className="h-7 w-7 p-0"
        >
          <Underline className="h-3 w-3" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={value === "line-through"}
          onPressedChange={(pressed) => setValue(pressed ? "line-through" : "none")}
          className="h-7 w-7 p-0"
        >
          <Strikethrough className="h-3 w-3" />
        </Toggle>
      </div>
    </div>
  );
});

// ── Opacity control ──────────────────────────────────────────────────────

export interface OpacityControlProps {
  nodeId: string | null;
}

export const OpacityControl = memo(function OpacityControl({ nodeId }: OpacityControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.opacity);
  const numValue = value ? parseFloat(value) : 1;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground">Opacity</Label>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {Math.round(numValue * 100)}%
        </span>
      </div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={[numValue]}
        onValueChange={([v]) => setValue(String(v))}
      />
    </div>
  );
});

// ── Border radius control ────────────────────────────────────────────────

export interface BorderRadiusControlProps {
  nodeId: string | null;
}

export const BorderRadiusControl = memo(function BorderRadiusControl({ nodeId }: BorderRadiusControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.borderRadius);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Radius</Label>
      <Input
        className="h-7 text-xs w-[80px]"
        value={value ?? ""}
        placeholder="0px"
        onChange={(e) => setValue(e.target.value || (undefined as unknown as string))}
      />
    </div>
  );
});

// ── Display / Flex direction control ─────────────────────────────────────

export interface DisplayControlProps {
  nodeId: string | null;
}

const DISPLAY_OPTIONS = [
  { value: "block", label: "Block" },
  { value: "flex", label: "Flex" },
  { value: "grid", label: "Grid" },
  { value: "inline-block", label: "Inline Block" },
  { value: "inline", label: "Inline" },
  { value: "none", label: "None" },
];

export const DisplayControl = memo(function DisplayControl({ nodeId }: DisplayControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.display);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Display</Label>
      <Select value={value ?? "block"} onValueChange={setValue}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISPLAY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

// ── Position control ─────────────────────────────────────────────────────

export interface PositionControlProps {
  nodeId: string | null;
}

const POSITION_OPTIONS = [
  { value: "static", label: "Static" },
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
  { value: "fixed", label: "Fixed" },
  { value: "sticky", label: "Sticky" },
];

export const PositionControl = memo(function PositionControl({ nodeId }: PositionControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.position);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Position</Label>
      <Select value={value ?? "static"} onValueChange={setValue}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {POSITION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

// ── Overflow control ─────────────────────────────────────────────────────

export interface OverflowControlProps {
  nodeId: string | null;
}

const OVERFLOW_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
  { value: "scroll", label: "Scroll" },
  { value: "auto", label: "Auto" },
];

export const OverflowControl = memo(function OverflowControl({ nodeId }: OverflowControlProps) {
  const { value, setValue } = useNodeProperty<string>(nodeId, STYLE_PROPERTIES.overflow);
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] text-muted-foreground">Overflow</Label>
      <Select value={value ?? "visible"} onValueChange={setValue}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OVERFLOW_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
