type EmptyStateProps = {
  title: string
  description?: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface-muted/50 px-4 py-10 text-center" role="status">
      <span aria-hidden="true" className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-container">
        <span className="material-symbols-outlined text-[24px] text-text-secondary/70">search_off</span>
      </span>
      <p className="font-medium text-text-primary">{title}</p>
      {description ? <p className="mt-2 text-sm text-text-secondary">{description}</p> : null}
    </div>
  )
}
