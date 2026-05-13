export const syncEngine = {
  kick(): void {
    // Story 2.9 owns the full FSM, sequential queue, retry/backoff, POST /api/v1/orders, and status updates.
    queueMicrotask(() => undefined)
  },
}
