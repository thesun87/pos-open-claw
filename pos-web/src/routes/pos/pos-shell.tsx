export function PosShell() {
  return (
    <section className="p-6">
      <div className="rounded-lg border border-warning bg-surface-muted p-4 text-text-primary md:hidden">POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet</div>
      <div className="hidden grid-cols-[1fr_360px] gap-6 md:grid lg:grid-cols-[1fr_400px]" aria-label="Bố cục POS hai cột">
        <section className="min-h-[70vh] rounded-lg border border-border bg-surface p-6"><h1 className="text-2xl font-semibold">Khu vực menu / sản phẩm</h1><p className="mt-2 text-text-secondary">Placeholder danh mục và lưới sản phẩm cho story POS tiếp theo.</p></section>
        <aside className="min-h-[70vh] rounded-lg border border-border bg-surface p-6" aria-label="Giỏ hàng và thanh toán"><h2 className="text-xl font-semibold">Giỏ hàng / thanh toán</h2><p className="mt-2 text-text-secondary">Panel cố định bên phải cho đơn hiện tại.</p><div className="total mt-8 text-3xl font-bold">0 ₫</div></aside>
      </div>
    </section>
  )
}
