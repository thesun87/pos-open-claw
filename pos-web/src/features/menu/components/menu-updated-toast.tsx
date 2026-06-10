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
    <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl bg-inverse-surface px-4 py-3 text-sm font-medium text-on-inverse-surface shadow-overlay">
      <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-success" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      {TOAST_TEXT}
    </div>
  )
}
