import React from "react";

export interface ArtboardLabelProps {
  icon: React.ReactNode;
  label: string;
  width: number;
  isActive: boolean;
  onClick: () => void;
  gripProps?: React.HTMLAttributes<HTMLDivElement>;
  /**
   * Canvas zoom level. The label lives inside the canvas's own
   * `scale3d(zoom, ...)` transform (`CanvasRoot.tsx`), so at low zoom its
   * fixed `fontSize: 11` shrinks along with the canvas and becomes
   * unreadable. Scaling by `1 / zoom` here counteracts that, keeping the
   * label's on-screen size constant regardless of canvas zoom.
   */
  zoom?: number;
}

export function ArtboardLabel({ icon, label, width, isActive, onClick, gripProps, zoom = 1 }: ArtboardLabelProps) {
  const counterScale = zoom > 0 ? 1 / zoom : 1;
  return (
    <div
      style={{
        position: "absolute", bottom: "100%", marginBottom: 20,
        transform: `scale(${counterScale})`, transformOrigin: "left bottom",
        fontSize: 16, fontWeight: 500,
        color: "hsl(var(--muted-foreground))",
        display: "flex", alignItems: "center", gap: 6,
        userSelect: "none", whiteSpace: "nowrap",
        paddingLeft: 6, paddingRight: 6, paddingTop: 4, paddingBottom: 4,
        borderRadius: 4,
        cursor: gripProps ? "grab" : "pointer",
      }}
      onClick={onClick}
      className={gripProps ? "duration-200 hover:bg-black/5" : ""}
      {...gripProps}
    >
      {icon}
      <span>{label}</span>
      <span style={{ opacity: 0.5 }}>&#183; {width}px</span>
      {isActive && (
        <span style={{ fontSize: 10, background: "hsl(221.2 83.2% 53.3% / 0.12)", color: "hsl(221.2 83.2% 53.3%)", padding: "2px 6px", borderRadius: 3 }}>
          Active
        </span>
      )}
    </div>
  );
}
