import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './error-state'

describe('ErrorState', () => {
  it('renders with alert role', () => {
    render(<ErrorState title="Lỗi" />)
    const el = screen.getByRole('alert')
    expect(el).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<ErrorState title="Không tải được báo cáo" />)
    expect(screen.getByText('Không tải được báo cáo')).toBeInTheDocument()
  })

  it('renders optional description', () => {
    render(<ErrorState title="Lỗi" description="Vui lòng thử lại sau." />)
    expect(screen.getByText('Vui lòng thử lại sau.')).toBeInTheDocument()
  })

  it('renders action button when actionLabel and onAction provided', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<ErrorState title="Lỗi" actionLabel="Thử lại" onAction={onAction} />)
    const btn = screen.getByRole('button', { name: /thử lại/i })
    await user.click(btn)
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('does not render button when no actionLabel', () => {
    render(<ErrorState title="Lỗi" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
