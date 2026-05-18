import AppLayout from './tailadmin/layout/AppLayout'
import PageBreadcrumb from './tailadmin/components/common/PageBreadCrumb'

function AdminHome() {
  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle="Trang chủ Admin" />
      <div className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm"><p className="mt-2 text-sm text-admin-gray-500">Chọn một mục quản trị để bắt đầu.</p></div>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle={title} />
      <div className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm"><p className="mt-2 text-sm text-admin-gray-500">CRUD chi tiết sẽ được triển khai ở các story Admin sau.</p></div>
    </div>
  )
}

export function AdminLayout() {
  return (
    <div data-admin-scope className="font-admin">
      <AppLayout />
    </div>
  )
}

export default AdminLayout
export { AdminHome, PlaceholderPage }
