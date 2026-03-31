import { useCallback } from "react";
import { useBuilder } from "./useBuilder";
import type { BuilderPlugin } from "@ui-builder/builder-core";

/**
 * Install plugins at runtime inside React context.
 *
 * @example
 * const { install } = usePlugin();
 * install(myPlugin);
 */
export function usePlugin(): {
  install: (plugin: BuilderPlugin) => void;
} {
  const { builder } = useBuilder();

  const install = useCallback(
    (plugin: BuilderPlugin) => {
      builder.use(plugin);
    },
    [builder],
  );

  return { install };
}
