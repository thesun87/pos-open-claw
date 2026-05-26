type StoreConfigToggleProps = {
  tableMode: boolean
  disabled?: boolean
  isBusy?: boolean
  onToggleRequest: () => void
}

export function StoreConfigToggle({ tableMode, disabled = false, isBusy = false, onToggleRequest }: StoreConfigToggleProps) {
  return (
    <section className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm" aria-busy={isBusy ? 'true' : undefined}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-admin-gray-800">Chế độ phục vụ</h2>
          <p className="mt-1 text-sm text-admin-gray-500">Chọn cách POS bắt đầu luồng bán hàng cho store này.</p>
        </div>
        <label className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border border-admin-gray-200 px-4 py-3 focus-within:ring-2 focus-within:ring-admin-brand-500">
          <input
            type="checkbox"
            role="switch"
            aria-checked={tableMode}
            checked={tableMode}
            disabled={disabled}
            onChange={onToggleRequest}
            className="h-5 w-10 cursor-pointer accent-admin-brand-500 disabled:cursor-not-allowed"
          />
          <span className="font-medium text-admin-gray-800">Chế độ bàn: {tableMode ? 'Bật' : 'Tắt'}</span>
        </label>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-admin-gray-200 bg-admin-gray-50 p-4">
          <h3 className="font-semibold text-admin-gray-800">Bật</h3>
          <p className="mt-1 text-sm text-admin-gray-600">POS hiển thị sơ đồ bàn làm màn hình chính; mỗi order gắn với bàn. Có nút Bán hàng nhanh cho khách mang đi.</p>
        </div>
        <div className="rounded-xl border border-admin-gray-200 bg-admin-gray-50 p-4">
          <h3 className="font-semibold text-admin-gray-800">Tắt</h3>
          <p className="mt-1 text-sm text-admin-gray-600">POS hoạt động đúng counter-service hiện tại (mặc định). Floor-plan, sticky bàn header, Bán hàng nhanh — đều ẩn.</p>
        </div>
      </div>
    </section>
  )
}
