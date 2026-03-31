import { useMemo, useEffect } from "react";
import { createBuilder } from "@ui-builder/builder-core";
import type { BuilderAPI } from "@ui-builder/builder-core";
import { SAMPLE_COMPONENTS } from "../components/sample-components";
import { FIXTURE_DOCUMENT } from "../fixtures/fixture-document";

/**
 * Creates a BuilderAPI instance pre-loaded with sample components and
 * the fixture document.
 */
export function useBuilderSetup(): BuilderAPI {
  const builder = useMemo(() => {
    const b = createBuilder({
      document: FIXTURE_DOCUMENT,
      permissions: {
        canEdit: true,
        canDelete: true,
        canAdd: true,
        canMove: true,
        canResize: true,
        canGroup: true,
        canUngroup: true,
        canLock: true,
        canHide: true,
        canExport: true,
      },
    });

    // Register all sample components
    for (const comp of SAMPLE_COMPONENTS) {
      b.registry.registerComponent(comp);
    }

    return b;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      builder.destroy();
    };
  }, [builder]);

  return builder;
}
