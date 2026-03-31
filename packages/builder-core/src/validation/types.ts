/**
 * Validation type contracts.
 */

export interface DropValidationResult {
  valid: boolean;
  reason?: string;
}

export interface DropValidator {
  /** Validate whether a node type can be dropped into a target parent */
  canDrop(params: {
    sourceType: string;
    targetParentId: string;
    targetParentType: string;
    position: import("../state/types").DropPosition;
    slotName?: string;
  }): DropValidationResult;
}
