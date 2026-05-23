---
title: 'Cập nhật giao diện màn hình POS và hiển thị ảnh sản phẩm'
type: 'refactor'
created: '2026-05-23'
status: 'done'
route: 'one-shot'
---

# Cập nhật giao diện màn hình POS và hiển thị ảnh sản phẩm

## Intent

**Problem:** 
1. Chữ trên thẻ sản phẩm (tên, giá, nút) nhỏ và khoảng cách quá rộng.
2. Hai dòng tiêu đề "Menu sản phẩm" và phụ đề "Chọn món để thêm vào đơn" chiếm không gian ở khu vực lưới sản phẩm.
3. Trong hộp thoại tùy chọn (Option Modal) và giỏ hàng (Cart Panel), các món hàng chỉ hiển thị icon placeholder/initials (chữ cái đầu) thay vì hình ảnh thực tế của sản phẩm.

**Approach:** 
1. Tăng kích thước chữ của các phần tử trên thẻ sản phẩm POS, chuyển sang bố cục `justify-start` với tỷ lệ khung hình `aspect-[4/4.6]`, và rút ngắn khoảng cách (`gap-0.5`).
2. Sử dụng lớp `sr-only` cho tiêu đề và mô tả trong lưới sản phẩm để ẩn chúng đi visually (giúp tăng tối đa không gian màn hình nhưng vẫn giữ cho trình đọc màn hình và test case hoạt động tốt).
3. Cập nhật `OptionModal` và `CartLineItem` để tự động hiển thị ảnh sản phẩm (`imageUrl`) nếu có. Trong giỏ hàng, sử dụng `useLiveQuery` để truy xuất ảnh sản phẩm thông qua `productId` từ cơ sở dữ liệu IndexedDB của Dexie.

## Suggested Review Order

**Cải thiện giao diện Thẻ sản phẩm POS**

- Chuyển sang bố cục `justify-start`, đổi tỷ lệ khung hình thành `aspect-[4/4.6]`, giảm padding bottom xuống `pb-3` và tăng cỡ chữ
  [product-tile.tsx:37](../../pos-web/src/features/menu/components/product-tile.tsx#L37)
- Thu hẹp khoảng cách (`gap-0.5`, bỏ `mt-1`) và tăng size giá bán & nút Đặt món
  [product-tile.tsx:57](../../pos-web/src/features/menu/components/product-tile.tsx#L57)
- Đồng bộ hóa kích thước chữ cho chế độ compact (nếu được dùng trong tương lai)
  [product-tile.tsx:17](../../pos-web/src/features/menu/components/product-tile.tsx#L17)
- Cập nhật unit test của thẻ sản phẩm khớp với aspect ratio mới
  [product-tile.test.tsx:15](../../pos-web/src/features/menu/components/product-tile.test.tsx#L15)

**Ẩn tiêu đề và mô tả lưới sản phẩm**

- Ẩn phần tiêu đề "Menu sản phẩm" thông qua lớp `sr-only`
  [pos-shell.tsx:58](../../pos-web/src/routes/pos/pos-shell.tsx#L58)

**Hiển thị ảnh sản phẩm trong Option Modal & Cart Line Items**

- Nạp `useLiveQuery` và `db` vào giỏ hàng
  [cart-panel.tsx:12](../../pos-web/src/features/orders/components/cart-panel.tsx#L12)
- Truy xuất `imageUrl` và hiển thị ảnh sản phẩm nếu có trong dòng món của giỏ hàng
  [cart-panel.tsx:24](../../pos-web/src/features/orders/components/cart-panel.tsx#L24)
- Thay thế initials placeholder bằng ảnh sản phẩm thực tế trong Option Modal header
  [option-modal.tsx:35](../../pos-web/src/features/menu/components/option-modal.tsx#L35)
