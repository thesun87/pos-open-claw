import { useCallback } from 'react'

export function usePrint() {
  return useCallback(() => {
    if (typeof window === 'undefined' || typeof window.print !== 'function') return
    window.print()
  }, [])
}
