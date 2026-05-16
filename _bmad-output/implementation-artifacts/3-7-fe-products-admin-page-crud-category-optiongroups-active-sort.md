# Story 3.7: FE — Products Admin Page (CRUD + Category + OptionGroups + Active + Sort)

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added Products admin API client, ProductForm, ProductsPage CRUD/filter/search/active/delete flows, route lazy import, and frontend coverage.
- Fixed failing products-page initialization regression by deriving `products` from query data before sorting in `useMemo`.
- Lint remains warning-only for existing RHF/TanStack React Compiler incompatible-library diagnostics; no lint errors. -->

## Story

As an admin,  
I want trang `/admin/menu/products` để quản lý đầy đủ sản phẩm: tạo "Trà Đào Cam Sả" thuộc danh mục Trà với option groups Size + Topping, tắt "Sinh Tố Bơ" hết nguyên liệu, và sắp xếp thứ tự hiển thị,  
so that POS hiển thị đúng menu hiện tại.

## Acceptance Criteria

1. Given route `/admin/menu/products`, when admin mở trang, then render page thật thay cho `PlaceholderPage` với heading "Sản phẩm", mô tả ngắn, CTA `+ Tạo sản phẩm mới`, filter header gồm category dropdown, search input, toggle/checkbox "Chỉ hiển thị đang bán", và `AdminDataTable`.
2. Given products API tải thành công, when render table, then columns gồm `name`, `category.name`, `priceVnd` format bằng `formatVnd()`, `optionGroupsCount`, `isActive` với `StatusBadge` + control inline, `sortOrder`, và row actions "Sửa", "Xóa".
3. Given loading, empty, filtered-empty, hoặc error state, when query state thay đổi, then dùng pattern Categories/OptionGroups page: skeleton từ `AdminDataTable`, `EmptyState` tiếng Việt; error state không lộ raw technical details và có nút "Thử lại". Filtered empty phải nói "Không có sản phẩm trong danh mục này." hoặc tương đương nếu search/filter active.
4. Given initial page load, when không có URL search params, then gọi `GET /api/v1/products` qua FE `apiClient` path `/products` với default sort server (`sortOrder asc, name asc`) và gọi thêm categories + option groups để phục vụ filter/form.
5. Given category filter thay đổi, when admin chọn danh mục, then đồng bộ URL search param `?category=<id>` và refetch products với query param backend `categoryId=<id>`; chọn "Tất cả danh mục" xóa param category.
6. Given search input, when admin gõ tên, then debounce 300ms trước khi refetch với query param `search`; đồng bộ URL search param `search=<term>`; trim/xóa rỗng phải xóa param.
7. Given toggle "Chỉ hiển thị đang bán", when bật/tắt, then đồng bộ URL search param `active=true` khi bật và refetch với backend query param `isActive=true`; khi tắt thì bỏ param để thấy cả đang bán/tạm tắt.
8. Given `ProductForm` dialog ở create mode, when mở, then fields gồm `name` required 1-200, `categoryId` dropdown required từ categories active/loaded, `priceVnd` integer VND ≥0, `optionGroupIds` multi-select 0+ nhóm tùy chọn, `isActive` switch/checkbox label "Đang bán"/"Tạm tắt", `sortOrder` integer ≥0 default max existing sortOrder + 10, và note "Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán."
9. Given `ProductForm` validation, when dữ liệu sai, then RHF + Zod hiển thị inline ngay dưới field/section sai: missing/too-long name, missing category, negative/non-integer price, negative/non-integer sortOrder; money là integer đồng, không float/cents conversion.
10. Given create submit hợp lệ, when admin save, then call `POST /api/v1/products` qua FE path `/products` với payload `{ name, categoryId, priceVnd, isActive, sortOrder, optionGroupIds }`; success dispatch toast "Đã tạo sản phẩm", invalidate/refetch products + admin menu, close dialog.
11. Given edit mode, when admin click "Sửa", then form prefill chính xác từ row `{ name, categoryId, priceVnd, optionGroupIds, isActive, sortOrder }`, multi-select hiển thị các nhóm đã gán; save call `PATCH /api/v1/products/:id` với payload đầy đủ từ form, success toast "Đã cập nhật sản phẩm", refetch + close.
12. Given inline `isActive` control trong table row, when admin toggle, then call `PATCH /api/v1/products/:id` với `{ isActive: <next> }` theo contract Story 3.6; optimistic update UI, rollback nếu fail, invalidate products/admin menu khi settled, và `StatusBadge` cập nhật "Đang bán"/"Tạm tắt".
13. Given delete action, when admin xác nhận, then dialog title "Xóa sản phẩm này?" và warning "Lịch sử đơn cũ vẫn giữ nguyên thông tin sản phẩm." + microcopy "Tắt thay vì xóa nếu sẽ bán lại."; call `DELETE /api/v1/products/:id`; success toast "Đã xóa sản phẩm" và refetch.
14. Given delete returns 409 RFC 7807 `product-in-use` or detail indicates historical orders, when mutation fails, then map to toast/helper "Sản phẩm có trong đơn cũ. Bạn có thể tắt sản phẩm thay vì xóa." with count/detail if available; do not expose raw Axios/stack and keep dialog usable.
15. Given route wiring, when user navigates from Admin sidebar to `/admin/menu/products`, then route lazy-loads `products-page.tsx` instead of `PlaceholderPage`, without breaking `/admin/menu/categories`, `/admin/menu/option-groups`, `/admin/reports`, AdminRoleGate, or mobile nav.
16. Tests cover render/list/loading/empty/error, URL/filter/search debounce behavior, create validation + POST payload, edit prefill + PATCH payload preserving optionGroupIds, inline active optimistic success/rollback, delete success + 409 mapping, route wiring/page import smoke where practical, and regression around Categories/OptionGroups page not broken.

## Tasks / Subtasks

- [x] Add Products admin API client/types (AC: 2, 4, 5, 6, 7, 10, 11, 12, 13)
  - [x] Create `pos-web/src/features/admin/products/api.ts` with `ProductDto`, `ProductMutationDto`, `ProductListParams`, `productsQueryKey(params)` and mutation helpers.
  - [x] Implement `fetchProducts(params)` using `apiClient.get('/products', { params })` where FE URL param `category` maps to backend `categoryId`, and active filter maps to `isActive`.
  - [x] Implement `createProduct`, `updateProduct`, `deleteProduct`; use `/products`, `/products/:id`. For active toggle, reuse `updateProduct(id, { isActive })`; do not call the backend-only `/toggle-active` route from FE unless product owner changes the FE contract.
  - [x] Reuse/export `adminMenuQueryKey` from Categories API for invalidation; do not duplicate unrelated admin menu keys.
- [x] Create reusable `ProductForm` (AC: 8, 9, 10, 11)
  - [x] Add `pos-web/src/routes/admin/menu/_shared/product-form.tsx`, following `category-form.tsx` and `option-group-form.tsx`: RHF + `zodResolver`, local Vietnamese validation, `noValidate`, submit disabled while saving.
  - [x] Fields: name, category select, priceVnd number, optionGroupIds multi-select/checkbox list, isActive checkbox/switch label, sortOrder number, historical-order note.
  - [x] Multi-select may be a shadcn/Radix Combobox if already available; if not, use an accessible checkbox list inside the dialog for MVP. Do not add a new UI library solely for multi-select.
  - [x] Ensure option group selections submit a string array preserving selected IDs; unselected all submits `[]`.
- [x] Build Products admin page (AC: 1, 2, 3, 4, 10, 11, 12, 13, 14)
  - [x] Add `pos-web/src/routes/admin/menu/products-page.tsx` modeled on `categories-page.tsx`/`option-groups-page.tsx`, reusing `AdminDataTable`, `StatusBadge`, `Button`, `Dialog`, `Input`, `EmptyState`.
  - [x] Fetch products, categories, and option groups via TanStack Query. Categories and option groups are required for form choices; handle their loading/error states gracefully in dialog/page.
  - [x] Define table columns and calculate `optionGroupsCount` from `row.optionGroups?.length ?? row.optionGroupIds.length`.
  - [x] Implement create/edit/delete dialog state, default sort order (`max(products.sortOrder)+10` or `10`), mutation invalidation, and custom `toast` event matching existing pages.
  - [x] Implement optimistic active toggle with `queryClient.cancelQueries`, `getQueryData`, `setQueryData`, rollback on error, and invalidation on settled.
  - [x] Map 409 delete conflicts from Problem Details to friendly Vietnamese guidance; never render raw Axios errors.
- [x] Wire route and preserve Admin navigation (AC: 15)
  - [x] Update `pos-web/src/app-router.tsx` so `/admin/menu/products` lazy imports `./routes/admin/menu/products-page`.
  - [x] Do not change sidebar labels/paths in `pos-web/src/routes/admin/_layout.tsx` except for necessary accessibility fixes.
- [x] Add frontend tests (AC: 3, 5, 6, 7, 9, 10, 11, 12, 14, 16)
  - [x] Add `pos-web/src/routes/admin/menu/products-page.test.tsx` using existing mocked `apiClient`, `QueryClientProvider`, `userEvent`, and `window.dispatchEvent = vi.fn()` patterns.
  - [x] Test loading/list columns/VND formatting/status labels and counts.
  - [x] Test safe error retry and empty/filtered-empty copy.
  - [x] Test category URL param → backend `categoryId`, search debounce 300ms (use fake timers or `waitFor`), and active filter → backend `isActive=true`.
  - [x] Test create validation and POST payload including categoryId, integer priceVnd, isActive, sortOrder, and optionGroupIds.
  - [x] Test edit prefill and PATCH payload preserving assigned optionGroupIds.
  - [x] Test active toggle optimistic update + rollback on rejected patch.
  - [x] Test delete success and 409 product-in-use toast guidance.
- [x] Run gates and document results (AC: 16)
  - [x] From `pos-web`, run targeted Vitest for products page and existing admin pages, e.g. `npm run test -- products-page categories-page option-groups-page admin-data-table --run`.
  - [x] Run `npm run typecheck`.
  - [x] Run `npm run lint` if available; if warnings are existing React Compiler/RHF/TanStack diagnostics from prior stories, document them without marking as story failure.

### Review Findings

- [x] [Review][Patch] Search refetch is not debounced 300ms — `onChange` writes URL `search` immediately, and `filters` read directly from `searchParams.get('search')`; this causes immediate `/products` refetch on every keystroke instead of waiting 300ms, violating AC6. [pos-web/src/routes/admin/menu/products-page.tsx:25]
- [x] [Review][Patch] ProductForm missing required historical-order note — create/edit dialog does not render "Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán.", violating AC8 and UX requirement. [pos-web/src/routes/admin/menu/_shared/product-form.tsx:12]
- [x] [Review][Patch] Delete dialog missing required guidance microcopy — dialog includes the historical-order warning but omits "Tắt thay vì xóa nếu sẽ bán lại.", violating AC13. [pos-web/src/routes/admin/menu/products-page.tsx:42]

## Dev Notes

### Current State / Files to Read First

- `pos-web/src/app-router.tsx`: `/admin/menu/products` currently lazy-loads `PlaceholderPage title="Sản phẩm"`. This story must replace only that child route with real `products-page.tsx` and keep categories, option-groups, reports, protected route, and `AdminRoleGate` intact.
- `pos-web/src/routes/admin/_layout.tsx`: sidebar already includes "Sản phẩm" linking to `/admin/menu/products`; preserve sectioned Admin layout, `<NavLink>` active styling, mobile nav, logout behavior.
- `pos-web/src/routes/admin/menu/categories-page.tsx`: primary local pattern for server-state queries, filters/counts from `/menu`, dialog state, mutation invalidation, optimistic active toggle, toast event, safe error state, and delete 409 mapping.
- `pos-web/src/routes/admin/menu/option-groups-page.tsx`: latest Admin CRUD page; use for nested option-group display/count patterns and mutation/test style.
- `pos-web/src/routes/admin/menu/_shared/category-form.tsx` and `_shared/option-group-form.tsx`: form patterns for RHF + Zod, Vietnamese inline errors, number coercion, submit button behavior, and historical-order note.
- `pos-web/src/features/admin/categories/api.ts`: reuse `fetchCategories`, `categoriesQueryKey`, `fetchAdminMenu`, and `adminMenuQueryKey` rather than duplicating category/menu fetch code.
- `pos-web/src/features/admin/option-groups/api.ts`: reuse `fetchOptionGroups` and `optionGroupsQueryKey` for ProductForm option group choices.
- `pos-web/src/shared/components/admin/admin-data-table.tsx`: generic table foundation. Use it; do not create a second table implementation. It currently supports columns, actions, loading skeleton, empty state, and optional sort callbacks.
- `pos-web/src/shared/components/ui/{button,dialog,input,empty-state,status-badge,table}.tsx`: existing primitives available. There is no select/combobox component currently visible in source; prefer native `<select>`/checkbox list or add a minimal shadcn-compatible primitive only if needed.
- `pos-web/src/shared/lib/api-client.ts`: Axios instance already handles base URL/auth/interceptors. All API calls must use this instance.
- `pos-web/src/shared/lib/format-vnd.ts`: use for table price and form preview/help. VND values are integer đồng.
- `pos-web/src/routes/admin/menu/categories-page.test.tsx` and `option-groups-page.test.tsx`: established testing style with mocked `apiClient` and TanStack Query provider.

### Backend API Contract from Story 3.6

- `GET /api/v1/products?categoryId=&search=&isActive=` is allowed for cashier/admin; admin FE can rely on it.
- FE source should call relative `apiClient` path `/products`, not `/api/v1/products`.
- List response sorted `sortOrder asc, name asc`, filtered by optional `categoryId`, case-insensitive partial `search`, and `isActive` boolean.
- Response product shape:
  ```ts
  {
    id: string
    name: string
    categoryId: string
    category: { id: string; name: string }
    priceVnd: number
    isActive: boolean
    sortOrder: number
    optionGroupIds: string[]
    optionGroups: Array<{ id: string; name: string; isRequired: boolean; minSelect: number; maxSelect: number; sortOrder: number }>
    createdAt?: string
    updatedAt?: string
  }
  ```
- Create payload: `{ name, categoryId, priceVnd, isActive?: boolean, sortOrder, optionGroupIds?: string[] }`; backend defaults `isActive=true`, `optionGroupIds=[]` if omitted, but FE should send explicit values from form for clarity.
- Update payload is partial by backend, but FE edit form should send the full editable product fields to avoid accidental assignment preservation surprises. `optionGroupIds: []` means unassign all; missing `optionGroupIds` means preserve current assignments.
- Active toggle contract in backend accepts `{ isActive: boolean }` via `PATCH /products/:id`; Story 3.6 also exposed `/products/:id/toggle-active`, but this FE story’s AC explicitly says PATCH product with flipped `isActive`. Use the AC unless the backend contract changes.
- Delete success is 204. Delete conflicts return 409 Problem Details, recommended type `https://pos.example/errors/product-in-use`, detail includes historical order item count/guidance. Map to friendly FE copy.
- Successful backend mutations bump `menu_version`; FE must invalidate `adminMenuQueryKey` so later Story 3.9/menu sync work sees updates.

### Architecture / Library Guardrails

- Frontend stack: TypeScript strict, Vite 7, React 18, React Router 7, TanStack Query 5, React Hook Form, Zod, Axios, Tailwind/shadcn primitives, Vitest. Do not add a new form/table/toast library.
- Admin server-state belongs in TanStack Query. Do not store products/categories/option groups in Zustand or Dexie; Dexie is POS offline cache, not Admin CRUD source of truth.
- Layer rule: `routes/` may import `features/` and `shared/`; `features/admin/products/api.ts` may import only `shared/` and types. `shared/` must not import routes/features.
- React component filenames are kebab-case; components/types PascalCase; functions camelCase.
- JSON/API fields are camelCase. DB snake_case is backend-only.
- Money is integer VND. Use Zod coercion + `.int().min(0)`; never convert to cents or floats.
- URL search params for UI are intentionally `category`, `search`, `active` per story; backend request params are `categoryId`, `search`, `isActive` per Story 3.6. Keep this mapping explicit in tests.
- Keep token storage untouched. Do not introduce localStorage/sessionStorage. Do not use `dangerouslySetInnerHTML`.
- Custom toast pattern in existing Admin pages is `window.dispatchEvent(new CustomEvent('toast', { detail: '...' }))`; follow it unless a central toast abstraction has since been added.

### UX and Accessibility Requirements

- Follow UX-DR18: `ProductForm` uses RHF + Zod resolver, required fields clear, inline validation under fields, fixed save action at the end of form/dialog.
- Admin density should be moderate; spacing scale is 8px base (`4/8/12/16/24/32px`). Touch/click targets must be at least `44px` (`min-h-touch` exists and is used in current primitives).
- Status must never rely on color only: table active state needs text "Đang bán"/"Tạm tắt" plus control label such as `aria-label="Tạm tắt sản phẩm Sinh Tố Bơ"` or `"Bật bán sản phẩm ..."`.
- Delete copy must steer admins toward tạm tắt for products that may return: "Tắt thay vì xóa nếu sẽ bán lại." This prevents accidental destructive actions and aligns with hard-delete/no-soft-delete architecture.
- Form note about historical orders is required because order snapshots are immutable: "Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán."
- Native `<select>` is acceptable for category filter/form if shadcn Select is not present; ensure associated `<label htmlFor>` and sensible option text.
- For option groups multi-select, if using checkbox list, wrap in `<fieldset>`/`<legend>` or label section clearly; each checkbox label should include group name and optional rule summary (`Bắt buộc`, `0-3`) to help admins choose correctly.
- Debounced search should feel responsive without excessive API calls; tests should confirm no immediate POST/PATCH and only list refetch after debounce.

### Existing Code Behaviors to Preserve

- `/admin/menu/categories` and `/admin/menu/option-groups` are already done. Do not modify their APIs/components except for shared regression-safe improvements.
- `AdminDataTable` row actions are generic buttons labeled "Sửa"/"Xóa". If adding per-row aria labels is needed, do it carefully without breaking existing tests; otherwise keep current row action pattern.
- `fetchAdminMenu()` currently calls `/menu` and is used for category product counts. Products page may invalidate it after mutations; it does not need to read POS Dexie directly.
- `app-router.tsx` uses lazy route modules. Keep lazy imports; do not eagerly import the products page into the main bundle.
- Existing lint may produce warning-only diagnostics from React Compiler incompatible-library checks around RHF/TanStack Table (seen in Story 3.5). Do not hide real TypeScript/lint errors, but document known warnings if unchanged.

### Previous Story Intelligence

- Story 3.3 established FE Categories page with TanStack Query, AdminDataTable, dialog forms, active toggle optimistic update, custom toast events, safe error states, and 409 delete guidance. Products should mirror this interaction model to avoid a divergent Admin UX.
- Story 3.5 established FE Option Groups page with inline RHF/Zod form, nested option editing, VND preview, route replacement, and Vitest coverage. It also fixed a subtle RHF/Zod array-root validation rendering issue (`errors.options.root.message`); if ProductForm has section-level validation, explicitly render both normal and root error locations.
- Story 3.6 completed backend Products CRUD and is the source of truth for Products API shape. It chose deterministic assignment join sort order from submitted `optionGroupIds` array order. ProductForm should preserve intentional selected order if UI supports ordering; if checkbox order is fixed, it will submit option groups in displayed `sortOrder/name` order.
- Recent commits: `ea5796e feat: complete story 3-6 products crud`, `1973beb feat: complete story 3-5 option groups admin`, `0b3f6a3 feat(pos-api): implement option groups CRUD`, `a17a48a feat: complete story 3-3 admin categories`. Current patterns are page-level implementation plus story file status updates.

### Testing Requirements

- Mock `apiClient.get/post/patch/delete` exactly like Categories/OptionGroups tests. For `apiClient.get('/products', { params })`, assert params with `expect.objectContaining({ categoryId: '...', search: '...', isActive: true })`.
- Use a fresh `QueryClient` with retries off per render to avoid cross-test cache contamination.
- For debounce tests, prefer `vi.useFakeTimers()` + `act(() => vi.advanceTimersByTime(300))` or a reliable `waitFor`; restore real timers in `afterEach` if fake timers are used.
- Use `MemoryRouter`/router test only if route wiring is tested directly; otherwise route import smoke can assert `products-page` renders inside provider.
- Test data should include at least:
  - Categories: `c-tra` "Trà", `c-sinh-to` "Sinh tố".
  - Option groups: `g-size` "Size" required 1-1, `g-topping` "Topping" optional 0-3.
  - Products: "Trà Đào Cam Sả" active with both groups, "Sinh Tố Bơ" inactive with no group.
- Validate VND formatting via visible text such as `45.000`/`45.000 ₫` depending current `formatVnd()` output; do not hard-code if implementation uses locale spacing quirks—use regex if needed.
- Regression gates should include existing categories and option-groups tests because products imports shared admin APIs and route wiring.

### Project Structure Notes

Expected new/updated files:

- `pos-web/src/features/admin/products/api.ts` (NEW)
- `pos-web/src/routes/admin/menu/_shared/product-form.tsx` (NEW)
- `pos-web/src/routes/admin/menu/products-page.tsx` (NEW)
- `pos-web/src/routes/admin/menu/products-page.test.tsx` (NEW)
- `pos-web/src/app-router.tsx` (UPDATE: products lazy route)
- `_bmad-output/implementation-artifacts/3-7-fe-products-admin-page-crud-category-optiongroups-active-sort.md` (this story)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status update)

Do not add unless clearly needed:

- New global state stores for Admin products.
- New table/form/toast libraries.
- Dexie schema changes for Admin CRUD.
- Backend changes; Story 3.6 already completed the required product endpoints.

### References

- Story requirements: `_bmad-output/planning-artifacts/epics.md#Story 3.7`
- Epic 3 context/FR27–FR33: `_bmad-output/planning-artifacts/epics.md#Epic 3`
- UX ProductForm/AdminDataTable: `_bmad-output/planning-artifacts/ux-design-specification.md#AdminDataTable`, `#ProductForm` / UX-DR18 references in epics
- Frontend architecture and routes: `_bmad-output/planning-artifacts/architecture.md#Repo-pos-web-Vite-React-PWA`
- API boundary: `_bmad-output/planning-artifacts/architecture.md#Ranh-giới-API-HTTP-boundary`
- Project rules: `_bmad-output/project-context.md#2-Quy-tắc-Bắt-buộc-Thi-hành`, `#3-Naming-Convention`, `#4-Cấu-trúc-Module`
- Previous FE admin baselines: `_bmad-output/implementation-artifacts/3-3-fe-categories-admin-page-crud-sort-order-active-toggle.md`, `_bmad-output/implementation-artifacts/3-5-fe-option-groups-admin-page-crud-inline-options-min-max.md`
- Products backend contract source: `_bmad-output/implementation-artifacts/3-6-be-products-crud-option-groups-assignment.md`, `pos-api/src/menu/controllers/products.controller.ts`, `pos-api/src/menu/repositories/products.repository.ts`

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-16: Story context created and marked ready-for-dev.
- 2026-05-16: Implemented products API/form/page/tests and fixed type/lint/test regressions.
- 2026-05-16: Completed Products admin CRUD page implementation and moved story to review.
- 2026-05-16: Implemented Products admin page/API/form/tests; fixed products-page hook ordering regression (`products` initialized before `sortedProducts`).
- 2026-05-16: Gates passed: targeted products Vitest (6/6), admin regression Vitest (25/25), typecheck, lint with known React Compiler warnings only.
- 2026-05-16: Patched review findings for Products search debounce and required historical/delete microcopy; added regression coverage; kept story in review for next code-review pass.
- 2026-05-16: Review follow-up patch: enforced 300ms search debounce before URL sync/refetch and added tests for debounce plus required ProductForm/delete-dialog copy. Gates: products Vitest 7/7; admin regression Vitest 26/26; typecheck pass; lint 0 errors with 4 known React Compiler warnings.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Hoàn tất Products admin page thật cho `/admin/menu/products`: bảng, filter URL/query, form tạo/sửa, active optimistic toggle, xóa với 409 friendly copy.
- Route đã lazy-load products page thay `PlaceholderPage`; không đổi Admin sidebar.
- Gates pass: typecheck, lint (0 errors; còn 4 warnings React Compiler/RHF/TanStack tồn tại), Vitest targeted 22 tests pass.
- Added Products admin API client, ProductForm, ProductsPage CRUD/filter/search/active/delete flows, route lazy import, and frontend coverage.
- Fixed failing products-page initialization regression by deriving `products` from query data before sorting in `useMemo`.
- Lint remains warning-only for existing RHF/TanStack React Compiler incompatible-library diagnostics; no lint errors.
- Addressed all 3 code-review findings: AC6 debounce now gates URL/refetch by 300ms; AC8 ProductForm note exact text present; AC13 delete guidance microcopy exact text present. Added regression assertions for debounce and copy.

### File List

- `_bmad-output/implementation-artifacts/3-7-fe-products-admin-page-crud-category-optiongroups-active-sort.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/src/features/admin/products/api.ts`
- `pos-web/src/routes/admin/menu/_shared/product-form.tsx`
- `pos-web/src/routes/admin/menu/products-page.tsx`
- `pos-web/src/routes/admin/menu/products-page.test.tsx`
- `pos-web/src/app-router.tsx`
- `pos-web/src/app-router.tsx`
- `pos-web/src/features/admin/products/api.ts`
- `pos-web/src/routes/admin/menu/_shared/product-form.tsx`
- `pos-web/src/routes/admin/menu/products-page.tsx`
- `pos-web/src/routes/admin/menu/products-page.test.tsx`

### Change Log

- 2026-05-16: Story context created and marked ready-for-dev.
- 2026-05-16: Implemented FE products admin CRUD page, form, API client, tests, patched review findings, and moved story to review.
- 2026-05-16: Completed Products admin CRUD page implementation and moved story to review.
- 2026-05-16: Implemented Products admin page/API/form/tests; fixed products-page hook ordering regression (`products` initialized before `sortedProducts`).
- 2026-05-16: Gates passed: targeted products Vitest (6/6), admin regression Vitest (25/25), typecheck, lint with known React Compiler warnings only.
- 2026-05-16: Review follow-up patch: enforced 300ms search debounce before URL sync/refetch and added tests for debounce plus required ProductForm/delete-dialog copy. Gates: products Vitest 7/7; admin regression Vitest 26/26; typecheck pass; lint 0 errors with 4 known React Compiler warnings.
