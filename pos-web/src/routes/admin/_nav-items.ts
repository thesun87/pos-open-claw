import { BarChart3, FolderKanban, ListChecks, Package, type LucideIcon } from 'lucide-react'

export type AdminNavItem = { label: string; to: string; icon: LucideIcon }
export type AdminNavSection = { title: string; items: AdminNavItem[] }

export const adminNavSections: AdminNavSection[] = [
  { title: 'Quản lý Menu', items: [
    { label: 'Danh mục', to: '/admin/menu/categories', icon: FolderKanban },
    { label: 'Sản phẩm', to: '/admin/menu/products', icon: Package },
    { label: 'Nhóm tùy chọn', to: '/admin/menu/option-groups', icon: ListChecks },
  ] },
  { title: 'Báo cáo', items: [{ label: 'Báo cáo', to: '/admin/reports', icon: BarChart3 }] },
]
