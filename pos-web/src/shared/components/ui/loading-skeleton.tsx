import { cn } from '../../lib/cn'

type LoadingSkeletonProps = {
  className?: string
  lines?: number
  height?: string
}

function LoadingSkeletonCard({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Đang tải"
      className={cn('animate-pulse rounded-lg bg-surface-muted', className)}
    />
  )
}

export function LoadingSkeleton({ className, lines = 3, height = 'h-4' }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-label="Đang tải" className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('animate-pulse rounded bg-surface-muted', height, i === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full')}
        />
      ))}
    </div>
  )
}

LoadingSkeleton.Card = LoadingSkeletonCard
