import { useEffect, useState } from 'react'

const TOAST_TEXT = 'Menu đã cập nhật'

export function MenuUpdatedToast({ durationMs = 4000 }: { durationMs?: number }): JSX.Element | null {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onMenuUpdated = () => {
      setVisible(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), durationMs)
    }
    window.addEventListener('menu.updated', onMenuUpdated)
    return () => {
      window.removeEventListener('menu.updated', onMenuUpdated)
      if (timer) clearTimeout(timer)
    }
  }, [durationMs])

  if (!visible) return null
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 rounded-lg border border-green-200 bg-white px-4 py-3 text-sm font-medium text-green-700 shadow-lg">
      <span aria-hidden="true">✓ </span>{TOAST_TEXT}
    </div>
  )
}
