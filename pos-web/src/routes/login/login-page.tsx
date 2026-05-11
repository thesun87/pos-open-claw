import { LoginForm } from './login-form'

export function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-6 py-10">
      <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Café POS</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">Đăng nhập</h1>
        <p className="mt-2 text-sm text-text-secondary">Nhập tài khoản được cấp để bắt đầu bán hàng hoặc quản trị.</p>
        <div className="mt-6"><LoginForm /></div>
      </div>
    </section>
  )
}
