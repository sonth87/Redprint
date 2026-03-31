import type {
  BuilderEventMap,
  BuilderEventType,
  EventHandler,
  Unsubscribe,
} from "./types";

/**
 * Typed pub/sub event bus for cross-module communication.
 * Framework-agnostic — no React/DOM dependencies.
 *
 * @example
 * const bus = new EventBus();
 * const unsub = bus.on('node:added', ({ node }) => console.log(node.id));
 * bus.emit('node:added', { node: myNode });
 * unsub(); // remove listener
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event type.
   *
   * @param event - Event type key from BuilderEventMap
   * @param handler - Callback invoked with the event payload
   * @returns Unsubscribe function — call to remove this listener
   */
  on<K extends BuilderEventType>(event: K, handler: EventHandler<K>): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    // EventHandler<K> is assignable to EventHandler (wider type), safe cast
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler);
    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  /**
   * Emit an event to all registered listeners.
   *
   * @param event - Event type key from BuilderEventMap
   * @param payload - Event payload matching the event type
   */
  emit<K extends BuilderEventType>(event: K, payload: BuilderEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Unhandled error in handler for "${event}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a specific event type, or all listeners
   * if no event type is provided.
   *
   * @param event - Optional event type to clear. If omitted, clears all.
   */
  off(event?: BuilderEventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Returns the number of listeners registered for an event.
   * Useful for tests and diagnostics.
   *
   * @param event - Event type to check
   * @returns Number of registered listeners
   */
  listenerCount(event: BuilderEventType): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
