/**
 * @deprecated Use StyleSections instead.
 * Kept for backward compatibility with existing consumers.
 */
import React from "react";
import type { StyleConfig } from "@ui-builder/builder-core";
import { StyleSections } from "./style-controls/StyleSections";

interface StyleEditorProps {
  style: Partial<StyleConfig>;
  onChange: (key: string, value: unknown) => void;
}

export function StyleEditor({ style, onChange }: StyleEditorProps) {
  return <StyleSections style={style as Record<string, unknown>} onChange={onChange} />;
}
