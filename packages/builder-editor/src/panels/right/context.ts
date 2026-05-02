import { createContext } from "react";
import type { Asset } from "@ui-builder/builder-core";

export interface MediaContextValue {
  assets: Asset[];
  onOpenMediaManager: (onSelect: (asset: Asset) => void) => void;
}

export const MediaContext = createContext<MediaContextValue>({
  assets: [],
  onOpenMediaManager: () => {},
});
