import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../shared/lib/cn'
import { adminNavSections } from './_nav-items'

type Props = { isCollapsed?: boolean; onToggleCollapse?: () => void; onMobileClose?: () => void; variant?: 'desktop' | 'mobile' }

export function AdminSidebar({ isCollapsed = false, onToggleCollapse, onMobileClose, variant = 'desktop' }: Props) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null)
  const isMobile = variant === 'mobile'

  useEffect(() => {
    if (!isMobile) return
    firstLinkRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onMobileClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, onMobileClose])

  const sidebar = (
    <aside role={isMobile ? 'dialog' : undefined} aria-modal={isMobile ? true : undefined} aria-label={isMobile ? 'Điều hướng Admin (di động)' : undefined} className={cn('fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-admin-gray-200 bg-white px-5 transition-all duration-300 ease-in-out', isMobile ? 'bottom-0 w-[290px]' : isCollapsed ? 'hidden w-[90px] lg:flex' : 'hidden w-[290px] lg:flex')}>
      <div className="flex h-16 items-center justify-between border-b border-admin-gray-100">
        <div className={cn('font-semibold text-admin-gray-900', isCollapsed && !isMobile && 'sr-only')}>Café POS Admin</div>
        {!isMobile ? <button type="button" aria-label={isCollapsed ? 'Mở điều hướng' : 'Thu gọn điều hướng'} aria-pressed={isCollapsed} onClick={onToggleCollapse} className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-admin-gray-500 hover:bg-admin-gray-50 hover:text-admin-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500 focus-visible:ring-offset-2">{isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}</button> : null}
      </div>
      <nav aria-label="Điều hướng Admin" className="flex-1 overflow-y-auto py-4">
        {adminNavSections.map((section) => (
          <section key={section.title} className="mb-5">
            <h2 className={cn('mb-2 mt-2 text-xs font-semibold uppercase tracking-wider text-admin-gray-400', isCollapsed && !isMobile && 'sr-only')}>{section.title}</h2>
            <ul className="space-y-1">
              {section.items.map((item, index) => {
                const Icon = item.icon
                return <li key={item.to}><NavLink ref={index === 0 ? firstLinkRef : undefined} to={item.to} title={isCollapsed && !isMobile ? item.label : undefined} onClick={onMobileClose} className={({ isActive }) => cn('relative flex min-h-touch items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500 focus-visible:ring-offset-2', isCollapsed && !isMobile && 'justify-center', isActive ? 'bg-admin-brand-50 text-admin-brand-500 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-admin-brand-500' : 'text-admin-gray-500 hover:bg-admin-gray-50 hover:text-admin-gray-700') }><Icon aria-hidden="true" size={20} /><span className={cn(isCollapsed && !isMobile && 'sr-only')}>{item.label}</span></NavLink></li>
              })}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  )

  if (!isMobile) return sidebar
  return <><div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />{sidebar}</>
}
