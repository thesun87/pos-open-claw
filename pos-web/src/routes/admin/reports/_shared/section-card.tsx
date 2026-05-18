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
    <article className="rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-sm lg:p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-admin-gray-500">{title}</h2>
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
