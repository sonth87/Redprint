import React, { useContext } from "react";
import { Label } from "@ui-builder/ui";
import { ImageIcon, X } from "lucide-react";
import type { PropSchema } from "@ui-builder/builder-core";
import { MediaContext } from "../context";

export function ImagePropControl({
  schema,
  value,
  onChange,
}: {
  schema: Extract<PropSchema, { type: "image" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { onOpenMediaManager } = useContext(MediaContext);
  const src = String(value ?? "");
  const isImageUrl = src.startsWith("http") || src.startsWith("/") || src.startsWith("data:");

  const handleOpen = () => {
    onOpenMediaManager((asset) => onChange(asset.url));
  };

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      {/* Thumbnail preview */}
      <div
        className="relative w-full h-24 rounded-md border border-border overflow-hidden bg-muted cursor-pointer group"
        onClick={handleOpen}
      >
        {src && isImageUrl ? (
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6 opacity-40" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">Change Image</span>
        </div>
        {/* Remove button */}
        {src && (
          <button
            className="absolute top-1 right-1 z-10 rounded-full bg-black/60 p-0.5 text-white hover:bg-destructive transition-colors"
            onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
