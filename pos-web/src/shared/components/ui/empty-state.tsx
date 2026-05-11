type EmptyStateProps = {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-muted px-4 py-8 text-center" role="status">
      <p className="font-medium text-text-primary">{title}</p>
      {description ? <p className="mt-2 text-sm text-text-secondary">{description}</p> : null}
    </div>
  )
}
