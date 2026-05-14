export const SYNC_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000] as const

export function getRetryDelay(attemptIndex: number): number {
  const boundedIndex = Math.min(Math.max(attemptIndex, 0), SYNC_RETRY_DELAYS_MS.length - 1)
  return SYNC_RETRY_DELAYS_MS[boundedIndex] ?? 16000
}

export function shouldPauseAfterAttempt(attemptCount: number): boolean {
  return attemptCount >= SYNC_RETRY_DELAYS_MS.length
}
