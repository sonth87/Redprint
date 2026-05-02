/**
 * DragCoordinator — orchestrates DragStrategy instances.
 * Selects the active strategy on gesture start via first-canHandle-wins.
 * Delegates onMove/onDrop/onCancel to the active strategy.
 * Pure class — no React state, no DOM side effects of its own.
 */

import type { DragStrategy, DragContext, DragVisualState } from "./types";
import { EMPTY_VISUAL_STATE } from "./types";

export class DragCoordinator {
  private strategies: DragStrategy[] = [];
  /** Set by startGesture(); null between gestures. */
  activeStrategy: DragStrategy | null = null;
  private activeCtx: DragContext | null = null;
  private lastVisualState: DragVisualState = EMPTY_VISUAL_STATE;

  register(strategy: DragStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Select the first strategy whose canHandle() returns true for this context.
   * Returns true when a strategy was found, false otherwise.
   */
  startGesture(ctx: DragContext): boolean {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(ctx)) {
        this.activeStrategy = strategy;
        this.activeCtx = ctx;
        this.lastVisualState = EMPTY_VISUAL_STATE;
        return true;
      }
    }
    return false;
  }

  onMove(e: MouseEvent): DragVisualState {
    if (!this.activeStrategy || !this.activeCtx) return EMPTY_VISUAL_STATE;
    this.lastVisualState = this.activeStrategy.onMove(this.activeCtx, e);
    return this.lastVisualState;
  }

  onDrop(e: MouseEvent): void {
    if (!this.activeStrategy || !this.activeCtx) return;
    this.activeStrategy.detachPreview?.();
    this.activeStrategy.onDrop(this.activeCtx, e, this.lastVisualState);
    this._reset();
  }

  onCancel(): void {
    if (!this.activeStrategy || !this.activeCtx) return;
    this.activeStrategy.detachPreview?.();
    this.activeStrategy.onCancel(this.activeCtx);
    this._reset();
  }

  private _reset(): void {
    this.activeStrategy = null;
    this.activeCtx = null;
    this.lastVisualState = EMPTY_VISUAL_STATE;
  }
}
