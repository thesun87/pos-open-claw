import { type ReactNode } from 'react'
import { EmptyState } from '../../../../shared/components/ui/empty-state'
import { LoadingSkeleton } from '../../../../shared/components/ui/loading-skeleton'

type SectionCardProps = {
  title: string
  loading?: boolean
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  children: ReactNode
}

export function SectionCard({
  title,
  loading = false,
  empty = false,
  emptyTitle = 'Chưa có đơn đã đồng bộ trong khoảng ngày này.',
  emptyDescription = 'Báo cáo chỉ tính đơn đã đồng bộ lên server.',
  children,
}: SectionCardProps) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-4 text-base font-semibold text-text-primary">{title}</h2>
      <div>
        {loading ? (
          <LoadingSkeleton.Card className="h-40 w-full" />
        ) : empty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          children
        )}
      </div>
    </article>
  )
}
