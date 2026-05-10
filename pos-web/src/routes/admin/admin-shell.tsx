const sections = [
  { title: 'Menu', items: ['Categories', 'Products', 'Option Groups'] },
  { title: 'Reports', items: ['Doanh thu', 'Sản phẩm bán chạy'] },
  { title: 'Users/Sessions', items: ['Người dùng', 'Phiên đăng nhập'] },
]

export default function AdminShell() {
  return <section className="grid gap-6 p-6 lg:grid-cols-[260px_1fr]"><nav aria-label="Điều hướng Admin" className="rounded-lg border border-border bg-surface p-4">{sections.map((section) => <div key={section.title} className="mb-5"><h2 className="font-semibold text-primary">{section.title}</h2><ul className="mt-2 space-y-1 text-text-secondary">{section.items.map((item) => <li key={item}><a href={`/admin/${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</a></li>)}</ul></div>)}</nav><div className="rounded-lg border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">Admin shell</h1><p className="mt-2 text-text-secondary">CRUD chi tiết sẽ được triển khai ở các story Admin sau.</p></div></section>
}
