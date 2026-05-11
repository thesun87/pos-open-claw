import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'
import * as authApi from '../../features/auth/api'

vi.mock('../../features/auth/api')
vi.mock('../../features/auth/token-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth/token-store')>()
  return { ...actual, saveSession: vi.fn(async () => ({ userInfo: { role: 'cashier' } })) }
})

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

beforeEach(() => { vi.clearAllMocks() })

describe('LoginForm', () => {
  it('validates email and password before submit', async () => {
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Email chưa đúng định dạng.')).toBeInTheDocument()
    expect(screen.getByText('Mật khẩu cần ít nhất 8 ký tự.')).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('maps invalid credentials to Vietnamese message', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText('Email'), 'cashier@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Sai email hoặc mật khẩu')).toBeInTheDocument()
  })

  it('submits and redirects by role on success', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ accessToken: 'token', user: { id: 'u', email: 'cashier@example.com', role: 'Cashier', tenantId: 't', storeId: 's' } })
    render(<MemoryRouter><LoginForm /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText('Email'), 'cashier@example.com')
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/pos', { replace: true }))
  })
})
