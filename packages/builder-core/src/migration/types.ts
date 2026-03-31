/**
 * Migration engine type contracts.
 */

import type { BuilderDocument } from "../document/types";

export interface SchemaMigration {
  /** semver — from version */
  fromVersion: string;
  /** semver — to version */
  toVersion: string;
  description: string;
  migrate(document: BuilderDocument): BuilderDocument;
  rollback?(document: BuilderDocument): BuilderDocument;
}

export interface MigrationEngine {
  register(migration: SchemaMigration): void;
  migrate(document: BuilderDocument, targetVersion?: string): BuilderDocument;
  canMigrate(fromVersion: string, toVersion: string): boolean;
  getMigrationPath(fromVersion: string, toVersion: string): SchemaMigration[];
}
