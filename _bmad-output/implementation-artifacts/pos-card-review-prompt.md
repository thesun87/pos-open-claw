# Review Request: POS UI Layout Updates & Product Image Render

Please review the following layout and feature changes made to the POS screen components.

## User Intent / Requirement
1. **Product Card Spacing & Typography**:
   - Increase the font size of the product name, price, and "Đặt món" button.
   - Decrease vertical spacing between the product name line and the price line to make the card more compact.
   - Reduce the height of the product cards to remove extra spacing.
2. **Product Grid Header**:
   - Remove "Menu sản phẩm" heading and "Chọn món để thêm vào đơn" subtitle.
3. **Product Images in Dialog / Cart**:
   - Option Modal: Replace the product placeholder icon with the product image if the product has `imageUrl`.
   - Cart Line Item: Replace the product placeholder icon with the product image if the product has `imageUrl`.

## Changes Made
1. **Product Card Updates**:
   - Modify `product-tile.tsx` default variant: `text-sm` -> `text-base` for name, `text-sm` -> `text-base` for price, and `text-xs font-medium` -> `text-sm font-semibold` for order button.
   - Set aspect ratio to `aspect-[4/4.6]` and pb to `pb-3` to make card shorter. Chose `justify-start` and container `gap-0.5`, removing `mt-1` from the row.
   - Changed compact variant name size to `text-base` and price to `text-sm` for consistency.
   - Updated unit test `product-tile.test.tsx` to assert `aspect-[4/4.6]`.
2. **Header Removal**:
   - Changed header `div` in `pos-shell.tsx` to `sr-only` to visually hide "Menu sản phẩm" and "Chọn món để thêm vào đơn" to maximize vertical space, while preserving it for SEO/accessibility and keeping existing `App.test.tsx` assertions passing.
3. **Product Images in Option Modal**:
   - Updated `option-modal.tsx` header to check `product?.imageUrl` and render `<img src={product.imageUrl} ... />` inside the container if present, falling back to initials otherwise.
4. **Product Images in Cart Line Items**:
   - Updated `cart-panel.tsx` to fetch the product by `item.productId` from Dexie IndexedDB using `useLiveQuery`.
   - Replaced placeholder initials with the retrieved product image if `imageUrl` is present.

## Diff
```diff
diff --git a/pos-web/src/features/menu/components/option-modal.tsx b/pos-web/src/features/menu/components/option-modal.tsx
index 38b0933..a6828a2 100644
--- a/pos-web/src/features/menu/components/option-modal.tsx
+++ b/pos-web/src/features/menu/components/option-modal.tsx
@@ -35,2 +35,2 @@ export function OptionModal({ product, open, onOpenChange, onAddToCart }: Option
-        <header className="flex items-start justify-between gap-5 border-b border-outline-variant/35 p-6"><div className="flex gap-5"><div className="grid h-24 w-24 shrink-0 place-items-center rounded-[20px] bg-gradient-to-br from-primary-container/70 to-surface-container-high text-3xl font-bold text-primary/45 shadow-inner">{getTextInitials(product?.name ?? '')}</div><div className="pt-1"><DialogTitle className="text-[28px] font-semibold leading-9 text-on-surface">{product?.name ?? 'Tùy chọn sản phẩm'}</DialogTitle><DialogDescription id="option-modal-description" className="mt-2 max-w-[28rem] font-body-md text-on-surface-variant">Tùy chỉnh size, topping và ghi chú cho đơn hiện tại.</DialogDescription></div></div><DialogClose aria-label="Đóng" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span aria-hidden="true" className="material-symbols-outlined">close</span></DialogClose></header>
+        <header className="flex items-start justify-between gap-5 border-b border-outline-variant/35 p-6"><div className="flex gap-5"><div className="h-24 w-24 shrink-0 rounded-[20px] bg-surface-container-low overflow-hidden shadow-inner flex items-center justify-center">{product?.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary-container/70 to-surface-container-high text-3xl font-bold text-primary/45">{getTextInitials(product?.name ?? '')}</div>}</div><div className="pt-1"><DialogTitle className="text-[28px] font-semibold leading-9 text-on-surface">{product?.name ?? 'Tùy chọn sản phẩm'}</DialogTitle><DialogDescription id="option-modal-description" className="mt-2 max-w-[28rem] font-body-md text-on-surface-variant">Tùy chỉnh size, topping và ghi chú cho đơn hiện tại.</DialogDescription></div></div><DialogClose aria-label="Đóng" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span aria-hidden="true" className="material-symbols-outlined">close</span></DialogClose></header>
diff --git a/pos-web/src/features/menu/components/product-tile.test.tsx b/pos-web/src/features/menu/components/product-tile.test.tsx
index db34b5c..1f50dfa 100644
--- a/pos-web/src/features/menu/components/product-tile.test.tsx
+++ b/pos-web/src/features/menu/components/product-tile.test.tsx
@@ -15,7 +15,7 @@ describe('ProductTile', () => {
     render(<ProductTile product={baseProduct} onSelect={vi.fn()} />)
 
     const tile = screen.getByRole('button', { name: 'Bạc Xỉu, 35.000 ₫' })
-    expect(tile).toHaveClass('aspect-[4/5]', 'bg-surface-container')
+    expect(tile).toHaveClass('aspect-[4/4.6]', 'bg-surface-container')
     expect(screen.getByText('BX')).toBeInTheDocument()
     expect(screen.queryByText('OPTIONS')).not.toBeInTheDocument()
   })
diff --git a/pos-web/src/features/menu/components/product-tile.tsx b/pos-web/src/features/menu/components/product-tile.tsx
index 38b0933..0da0aac 100644
--- a/pos-web/src/features/menu/components/product-tile.tsx
+++ b/pos-web/src/features/menu/components/product-tile.tsx
@@ -26,8 +26,8 @@ export function ProductTile({ product, onSelect, variant = 'default' }: ProductT
           {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : getTextInitials(product.name)}
         </div>
         <div className="flex-1 min-w-0">
-          <div className="font-bold text-on-surface truncate text-sm">{product.name}</div>
-          <span className="text-xs font-semibold text-primary-container">{price}</span>
+          <div className="font-bold text-on-surface truncate text-base">{product.name}</div>
+          <span className="text-sm font-semibold text-primary-container">{price}</span>
         </div>
       </button>
     )
@@ -38,8 +38,8 @@ export function ProductTile({ product, onSelect, variant = 'default' }: ProductT
       aria-label={ariaLabel}
       onClick={onSelect}
       className={cn(
-        'group relative overflow-hidden rounded-xl bg-surface-container border border-outline-variant/20 hover:border-primary-container shadow-[0_4px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] text-left w-full flex flex-col justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pb-4',
-        variant === 'default' && 'aspect-[4/5]'
+        'group relative overflow-hidden rounded-xl bg-surface-container border border-outline-variant/20 hover:border-primary-container shadow-[0_4px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] text-left w-full flex flex-col justify-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pb-3',
+        variant === 'default' && 'aspect-[4/4.6]'
       )}
     >
       {/* Product Image / Initials */}
@@ -54,13 +54,13 @@ export function ProductTile({ product, onSelect, variant = 'default' }: ProductT
       </div>
 
       {/* Card Info */}
-      <div className="px-4 pt-3 flex flex-col gap-1 w-full flex-1 justify-between">
-        <div className="font-semibold text-on-surface truncate text-sm" title={product.name}>
+      <div className="px-4 pt-2.5 flex flex-col gap-0.5 w-full flex-1 justify-start">
+        <div className="font-semibold text-on-surface truncate text-base" title={product.name}>
           {product.name}
         </div>
-        <div className="flex justify-between items-center mt-1">
-          <span className="font-bold text-primary-container text-sm">{price}</span>
-          <span className="px-3 py-1 border border-primary-container text-primary-container rounded-full text-xs font-medium group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
+        <div className="flex justify-between items-center">
+          <span className="font-bold text-primary-container text-base">{price}</span>
+          <span className="px-3 py-1 border border-primary-container text-primary-container rounded-full text-sm font-semibold group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
             Đặt món
           </span>
         </div>
diff --git a/pos-web/src/features/orders/components/cart-panel.tsx b/pos-web/src/features/orders/components/cart-panel.tsx
index 8e45300..10688a2 100644
--- a/pos-web/src/features/orders/components/cart-panel.tsx
+++ b/pos-web/src/features/orders/components/cart-panel.tsx
@@ -9,2 +9,4 @@ import { PaymentMethodModal } from './payment-method-modal'
 import { VoidOrderDialog } from './void-order-dialog'
 import { getTextInitials } from '../../../shared/lib/text-initials'
+import { useLiveQuery } from 'dexie-react-hooks'
+import { db } from '../../../db/dexie'
@@ -21,5 +23,7 @@ function CartLineItem({ item, onAskRemove }: LineItemProps) {
   function removeLine() { if (item.quantity > 1) onAskRemove(item); else removeItem(item.tempId) }
+  const product = useLiveQuery(() => db.products.get(item.productId), [item.productId])
+  const imageUrl = product?.imageUrl
   return (
     <article className="flex flex-col gap-2 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant" aria-label={`Món ${item.productNameSnapshot}`}>
       <div className="flex gap-3">
         {/* Placeholder image / initials */}
-        <div className="w-12 h-12 rounded-md bg-surface-container-low flex items-center justify-center font-bold text-primary text-xs select-none shrink-0">
-          {getTextInitials(item.productNameSnapshot)}
+        <div className="w-12 h-12 rounded-md bg-surface-container-low flex items-center justify-center font-bold text-primary text-xs select-none shrink-0 overflow-hidden">
+          {imageUrl ? (
+            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
+          ) : (
+            getTextInitials(item.productNameSnapshot)
+          )}
         </div>
diff --git a/pos-web/src/routes/pos/pos-shell.tsx b/pos-web/src/routes/pos/pos-shell.tsx
index db34f2d..0a00df1 100644
--- a/pos-web/src/routes/pos/pos-shell.tsx
+++ b/pos-web/src/routes/pos/pos-shell.tsx
@@ -58,4 +58,4 @@ export function PosShell() {
-        <div className="mb-7">
-          <h1 className="text-[34px] font-semibold leading-10 text-on-surface">Menu sản phẩm</h1>
-          <p className="mt-1 text-on-surface-variant">Chọn món để thêm vào đơn</p>
-        </div>
+        <div className="sr-only">
+          <h1>Menu sản phẩm</h1>
+          <p>Chọn món để thêm vào đơn</p>
+        </div>
```

Please run a critical code review on these changes and return your findings.
