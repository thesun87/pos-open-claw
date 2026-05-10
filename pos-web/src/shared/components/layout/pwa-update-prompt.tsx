import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../ui/button'

export function PwaUpdatePrompt() {
  const { offlineReady: [offlineReady, setOfflineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!offlineReady && !needRefresh) return null
  return (
    <aside aria-live="polite" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-border bg-surface p-4 text-sm shadow-lg">
      <p className="font-semibold text-text-primary">{needRefresh ? 'Đã có bản cập nhật POS mới' : 'POS sẵn sàng dùng offline'}</p>
      <p className="mt-1 text-text-secondary">{needRefresh ? 'Cập nhật khi thuận tiện để nhận giao diện mới nhất.' : 'Bạn vẫn có thể thao tác khi mạng chập chờn.'}</p>
      <div className="mt-3 flex gap-2">
        {needRefresh ? <Button size="sm" onClick={() => void updateServiceWorker(true)}>Cập nhật</Button> : null}
        <Button size="sm" variant="outline" onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}>Để sau</Button>
      </div>
    </aside>
  )
}
