import React from "react";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import type { PaletteItem } from "../types/palette.types";
import { AddChildDialog } from "./AddChildDialog";

export interface ReplaceNodeDialogProps {
  open: boolean;
  registry: ComponentRegistry;
  existingPresets: PaletteItem[];
  targetLabel?: string;
  allowedComponentTypes?: string[];
  onConfirm: (
    componentType: string,
    props: Record<string, unknown>,
    style: Record<string, unknown>,
  ) => void;
  onClose: () => void;
}

export function ReplaceNodeDialog(props: ReplaceNodeDialogProps) {
  return (
    <AddChildDialog
      open={props.open}
      registry={props.registry}
      existingPresets={props.existingPresets}
      targetLabel={props.targetLabel}
      insertMode="inside"
      allowedComponentTypes={props.allowedComponentTypes}
      onConfirm={props.onConfirm}
      onClose={props.onClose}
    />
  );
}
