import { describe, it, expect } from "vitest";
import { MigrationEngine } from "../../src/migration/MigrationEngine";
import type { BuilderDocument } from "../../src/document/types";

function makeDoc(schemaVersion: string): BuilderDocument {
  return {
    id: "doc-1",
    schemaVersion,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    name: "Test",
    nodes: {},
    rootNodeId: "root",
    breakpoints: [],
    variables: {},
    assets: { version: "1.0", assets: [] },
    plugins: [],
    canvasConfig: {
      showGrid: false,
      gridSize: 8,
      snapEnabled: false,
      snapThreshold: 6,
      snapToGrid: false,
      snapToComponents: false,
      rulerEnabled: false,
      showHelperLines: false,
    },
    metadata: {},
  };
}

describe("MigrationEngine", () => {
  it("returns document unchanged if same version", () => {
    const engine = new MigrationEngine();
    const doc = makeDoc("2.1.0");
    const result = engine.migrate(doc, "2.1.0");
    expect(result).toBe(doc);
  });

  it("applies a single migration", () => {
    const engine = new MigrationEngine();
    engine.register({
      fromVersion: "1.0.0",
      toVersion: "2.0.0",
      description: "v1 → v2",
      migrate: (doc) => ({ ...doc, schemaVersion: "2.0.0", name: doc.name + " (migrated)" }),
    });
    const doc = makeDoc("1.0.0");
    const result = engine.migrate(doc, "2.0.0");
    expect(result.schemaVersion).toBe("2.0.0");
    expect(result.name).toBe("Test (migrated)");
  });

  it("chains multiple migrations", () => {
    const engine = new MigrationEngine();
    engine.register({
      fromVersion: "1.0.0",
      toVersion: "2.0.0",
      description: "v1→v2",
      migrate: (doc) => ({ ...doc, schemaVersion: "2.0.0" }),
    });
    engine.register({
      fromVersion: "2.0.0",
      toVersion: "3.0.0",
      description: "v2→v3",
      migrate: (doc) => ({ ...doc, schemaVersion: "3.0.0", name: doc.name + " v3" }),
    });
    const doc = makeDoc("1.0.0");
    const result = engine.migrate(doc, "3.0.0");
    expect(result.schemaVersion).toBe("3.0.0");
    expect(result.name).toBe("Test v3");
  });

  it("canMigrate returns true if path exists", () => {
    const engine = new MigrationEngine();
    engine.register({ fromVersion: "1.0.0", toVersion: "2.0.0", description: "", migrate: (d) => d });
    expect(engine.canMigrate("1.0.0", "2.0.0")).toBe(true);
    expect(engine.canMigrate("1.0.0", "3.0.0")).toBe(false);
  });

  it("getMigrationPath returns correct ordered migrations", () => {
    const engine = new MigrationEngine();
    const m1 = { fromVersion: "1.0.0", toVersion: "2.0.0", description: "", migrate: (d: BuilderDocument) => d };
    const m2 = { fromVersion: "2.0.0", toVersion: "3.0.0", description: "", migrate: (d: BuilderDocument) => d };
    engine.register(m1);
    engine.register(m2);
    const path = engine.getMigrationPath("1.0.0", "3.0.0");
    expect(path).toHaveLength(2);
    expect(path[0]).toBe(m1);
    expect(path[1]).toBe(m2);
  });
});
