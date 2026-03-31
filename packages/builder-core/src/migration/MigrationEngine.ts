import type { SchemaMigration, MigrationEngine as IMigrationEngine } from "./types";
import type { BuilderDocument } from "../document/types";
import { CURRENT_SCHEMA_VERSION } from "../document/constants";

/**
 * MigrationEngine — applies chained schema migrations.
 *
 * Migrations are pure functions, applied in version order.
 * Unknown fields are preserved in legacyData (per spec).
 *
 * @example
 * const engine = new MigrationEngine();
 * engine.register({ fromVersion: '1.0.0', toVersion: '2.0.0', migrate: doc => {...} });
 * const migrated = engine.migrate(oldDoc);
 */
export class MigrationEngine implements IMigrationEngine {
  private readonly migrations: SchemaMigration[] = [];

  /**
   * Register a migration. Migrations will be applied in version chain order.
   *
   * @param migration - The SchemaMigration to register
   */
  register(migration: SchemaMigration): void {
    this.migrations.push(migration);
  }

  /**
   * Compute the migration path from one version to another.
   * Returns an ordered array of migrations to apply.
   *
   * @param fromVersion - Starting version (semver)
   * @param toVersion - Target version (semver)
   * @returns Ordered list of migrations
   */
  getMigrationPath(fromVersion: string, toVersion: string): SchemaMigration[] {
    // Build a simple chain by finding migrations that connect from->to
    const path: SchemaMigration[] = [];
    let currentVersion = fromVersion;

    while (currentVersion !== toVersion) {
      const next = this.migrations.find((m) => m.fromVersion === currentVersion);
      if (!next) break;
      path.push(next);
      currentVersion = next.toVersion;
    }

    return path;
  }

  /**
   * Returns true if there is a migration path from one version to another.
   */
  canMigrate(fromVersion: string, toVersion: string): boolean {
    if (fromVersion === toVersion) return true;
    const path = this.getMigrationPath(fromVersion, toVersion);
    if (path.length === 0) return false;
    // Verify the path actually ends at toVersion
    const lastMigration = path[path.length - 1]!;
    return lastMigration.toVersion === toVersion;
  }


  /**
   * Migrate a document to the target version.
   * Unknown fields are preserved in document.metadata.pluginData.legacyData.
   *
   * @param document - The BuilderDocument to migrate
   * @param targetVersion - Defaults to CURRENT_SCHEMA_VERSION
   * @returns A new (migrated) BuilderDocument
   */
  migrate(
    document: BuilderDocument,
    targetVersion: string = CURRENT_SCHEMA_VERSION,
  ): BuilderDocument {
    const path = this.getMigrationPath(document.schemaVersion, targetVersion);

    if (path.length === 0) {
      if (document.schemaVersion !== targetVersion) {
        console.warn(
          `[MigrationEngine] No migration path from "${document.schemaVersion}" to "${targetVersion}"`,
        );
      }
      return document;
    }

    let result = document;
    for (const migration of path) {
      try {
        result = migration.migrate(result);
      } catch (err) {
        console.error(
          `[MigrationEngine] Migration "${migration.description}" failed:`,
          err,
        );
        throw err;
      }
    }

    return result;
  }
}
