import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge, type StatusBadgeVariant } from './status-badge'

describe('StatusBadge', () => {
  it('renders label text for every variant', () => {
    const variants: StatusBadgeVariant[] = ['success', 'warning', 'danger', 'neutral', 'accent']
    variants.forEach((variant) => render(<StatusBadge variant={variant} label={`label-${variant}`} icon={<span>icon</span>} />))
    variants.forEach((variant) => expect(screen.getByText(`label-${variant}`)).toBeInTheDocument())
  })
})
