import axios from 'axios'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { login } from '../../features/auth/api'
import { useSessionStore } from '../../features/auth/session-store'
import { saveSession } from '../../features/auth/token-store'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import type { ApiClientError } from '../../shared/lib/api-client'
import { AUTH_ADMIN_FORBIDDEN_MESSAGE } from '../../shared/i18n/messages'

const loginSchema = z.object({
  email: z.string().email('Email chưa đúng định dạng.'),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getRedirectPath(role: string) {
  return role.toLowerCase() === 'admin' ? '/admin' : '/pos'
}

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSessionFromRecord = useSessionStore((state) => state.setSessionFromRecord)
  const expiredMessage = useSessionStore((state) => state.authExpiredMessage)
  const routeMessage = (location.state as { message?: string } | null)?.message
  const [formMessage, setFormMessage] = useState<string | null>(routeMessage ?? expiredMessage)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormMessage(null)
    try {
      const response = await login(values.email, values.password)
      const session = await saveSession(response.accessToken, response.user)
      setSessionFromRecord(session)
      navigate(getRedirectPath(session.userInfo.role), { replace: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400 && typeof error.response.data === 'object') {
        const fieldErrors = (error.response.data as { errors?: Record<string, string[]> }).errors
        if (fieldErrors?.email?.[0]) setError('email', { message: fieldErrors.email[0] })
        if (fieldErrors?.password?.[0]) setError('password', { message: fieldErrors.password[0] })
        return
      }
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setFormMessage('Sai email hoặc mật khẩu')
        return
      }
      setFormMessage((error as ApiClientError).uiError?.message ?? 'Không thể đăng nhập lúc này. Vui lòng thử lại.')
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formMessage ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{formMessage === AUTH_ADMIN_FORBIDDEN_MESSAGE ? AUTH_ADMIN_FORBIDDEN_MESSAGE : formMessage}</p> : null}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary" htmlFor="email">Email</label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
        {errors.email ? <p id="email-error" role="alert" className="text-sm text-danger">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary" htmlFor="password">Mật khẩu</label>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} {...register('password')} />
        {errors.password ? <p id="password-error" role="alert" className="text-sm text-danger">{errors.password.message}</p> : null}
      </div>
      <Button className="w-full" type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button>
    </form>
  )
}
