"use client";

import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { ComponentRegistry } from "@ui-builder/builder-core";
import { BASE_COMPONENTS } from "@ui-builder/builder-components";
import { FIXTURE_DOCUMENT } from "../../playground/src/fixtures/fixture-document";

// Create a registry with built-in components
const registry = new ComponentRegistry();
BASE_COMPONENTS.forEach((def) => registry.registerComponent(def));

export default function Home() {
  return (
    <div className="w-full min-h-screen bg-white">
      <RuntimeRenderer
        document={FIXTURE_DOCUMENT}
        registry={registry}
        config={{
          breakpoint: "desktop",
          attachNodeIds: true,
        }}
      />
    </div>
  );
}
