import React from "react";
import { GripVertical } from "lucide-react";

export interface ArtboardLabelProps {
  icon: React.ReactNode;
  label: string;
  width: number;
  isActive: boolean;
  onClick: () => void;
  gripProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function ArtboardLabel({ icon, label, width, isActive, onClick, gripProps }: ArtboardLabelProps) {
  return (
    <div
      style={{
        position: "absolute", bottom: "100%", marginBottom: 8,
        fontSize: 11, color: "hsl(var(--muted-foreground))",
        display: "flex", alignItems: "center", gap: 5,
        userSelect: "none", cursor: "pointer", whiteSpace: "nowrap",
      }}
      onClick={onClick}
    >
      {gripProps && (
        <div
          style={{ cursor: "grab", display: "flex", alignItems: "center", padding: "0 2px", marginRight: 2, opacity: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reposition"
          className="duration-200 hover:scale-150"
          {...gripProps}
        >
          <GripVertical size={11} />
        </div>
      )}
      {icon}
      <span>{label}</span>
      <span style={{ opacity: 0.5 }}>&#183; {width}px</span>
      {isActive && (
        <span style={{ fontSize: 9, background: "hsl(221.2 83.2% 53.3% / 0.12)", color: "hsl(221.2 83.2% 53.3%)", padding: "1px 5px", borderRadius: 3 }}>
          Active
        </span>
      )}
    </div>
  );
}
