import { useMemo, useEffect } from "react";
import { createBuilder, GroupRegistry, BUILT_IN_GROUPS, BUILT_IN_SUB_GROUPS } from "@ui-builder/builder-core";
import type { BuilderAPI } from "@ui-builder/builder-core";
import { SAMPLE_COMPONENTS } from "../components/sample-components";
import { FIXTURE_DOCUMENT } from "../fixtures/fixture-document";

/**
 * Creates a BuilderAPI instance pre-loaded with sample components and
 * the fixture document, plus a GroupRegistry for the 2-level component palette.
 */
export function useBuilderSetup(): { builder: BuilderAPI; groupRegistry: GroupRegistry } {
  const builder = useMemo(() => {
    const b = createBuilder({
      document: FIXTURE_DOCUMENT,
      permissions: {
        canEdit: true,
        canDelete: true,
        canAddComponents: true,
        canLoadRemoteComponents: false,
        canExport: true,
        canImport: true,
      },
    });

    // Register all sample components
    for (const comp of SAMPLE_COMPONENTS) {
      b.registry.registerComponent(comp);
    }

    return b;
  }, []);

  const groupRegistry = useMemo(() => {
    const gr = new GroupRegistry();
    for (const g of BUILT_IN_GROUPS) gr.registerGroup(g);
    for (const sg of BUILT_IN_SUB_GROUPS) gr.registerSubGroup(sg);
    return gr;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      builder.destroy();
    };
  }, [builder]);

  return { builder, groupRegistry };
}
