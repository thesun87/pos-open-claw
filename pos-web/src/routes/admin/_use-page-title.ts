import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/menu/categories': 'Danh mục sản phẩm',
  '/admin/menu/products': 'Sản phẩm',
  '/admin/menu/option-groups': 'Nhóm tùy chọn',
  '/admin/reports': 'Báo cáo',
}

export function usePageTitle(): string {
  const { pathname } = useLocation()
  const direct = TITLES[pathname]
  if (direct) return direct
  const match = Object.keys(TITLES).sort((a, b) => b.length - a.length).find((path) => pathname.startsWith(path))
  return match ? TITLES[match]! : 'Admin'
}
