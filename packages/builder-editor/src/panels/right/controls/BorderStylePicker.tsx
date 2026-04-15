import React from "react";
import { cn } from "@ui-builder/ui";

type BorderStyleValue = "none" | "solid" | "dashed" | "dotted" | "double";

interface BorderStylePickerProps {
  value: BorderStyleValue | string;
  onChange: (v: BorderStyleValue) => void;
}

const BORDER_STYLES: {
  value: BorderStyleValue;
  label: string;
  render: React.ReactNode;
}[] = [
  {
    value: "none",
    label: "None",
    render: (
      <svg width={28} height={10} viewBox="0 0 28 10">
        <line
          x1={2}
          y1={5}
          x2={26}
          y2={5}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.3}
        />
      </svg>
    ),
  },
  {
    value: "solid",
    label: "Solid",
    render: (
      <svg width={28} height={10} viewBox="0 0 28 10">
        <line x1={2} y1={5} x2={26} y2={5} stroke="currentColor" strokeWidth={2} />
      </svg>
    ),
  },
  {
    value: "dashed",
    label: "Dashed",
    render: (
      <svg width={28} height={10} viewBox="0 0 28 10">
        <line
          x1={2}
          y1={5}
          x2={26}
          y2={5}
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="5 3"
          strokeLinecap="square"
        />
      </svg>
    ),
  },
  {
    value: "dotted",
    label: "Dotted",
    render: (
      <svg width={28} height={10} viewBox="0 0 28 10">
        <line
          x1={2}
          y1={5}
          x2={26}
          y2={5}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeDasharray="1 4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: "double",
    label: "Double",
    render: (
      <svg width={28} height={10} viewBox="0 0 28 10">
        <line x1={2} y1={3} x2={26} y2={3} stroke="currentColor" strokeWidth={1.5} />
        <line x1={2} y1={7} x2={26} y2={7} stroke="currentColor" strokeWidth={1.5} />
      </svg>
    ),
  },
];

/**
 * Visual border style selector — shows SVG line previews instead of text options.
 */
export function BorderStylePicker({ value, onChange }: BorderStylePickerProps) {
  return (
    <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
      {BORDER_STYLES.map((style) => (
        <button
          key={style.value}
          type="button"
          title={style.label}
          className={cn(
            "flex-1 flex items-center justify-center h-7 rounded transition-colors",
            value === style.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
          onClick={() => onChange(style.value)}
        >
          {style.render}
        </button>
      ))}
    </div>
  );
}
