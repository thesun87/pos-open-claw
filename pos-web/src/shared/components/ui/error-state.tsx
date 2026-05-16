import { Button } from './button'

type ErrorStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({ title, description, actionLabel, onAction }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/40 bg-surface px-4 py-8 text-center"
    >
      <p className="font-medium text-text-primary">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-text-secondary">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
