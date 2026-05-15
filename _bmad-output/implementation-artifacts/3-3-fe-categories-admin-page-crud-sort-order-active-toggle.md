# Story 3.3: FE — Categories Admin Page (CRUD + Sort Order + Active Toggle)

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an admin,  
I want trang `/admin/menu/categories` để CRUD danh mục với sắp xếp thứ tự hiển thị,  
so that tôi có thể tạo "Trà mới", đổi tên "Cà phê" thành "Cà phê truyền thống", tắt/ẩn danh mục không còn dùng, hoặc xóa danh mục cũ.

## Acceptance Criteria

1. Given route `/admin/menu/categories`, when admin mở trang, then render page trong existing `AdminLayout` với title `Danh mục sản phẩm`, mô tả ngắn, và nút primary `+ Tạo danh mục mới`.
2. Given categories API từ Story 3.2, when page fetch list, then dùng authenticated `GET /api/v1/categories`, TanStack Query cache/invalidate, hiển thị qua `<AdminDataTable />` từ Story 3.1 với columns `name`, `sortOrder`, `productCount`, `isActive`, actions `Sửa`, `Xóa`.
3. Given `productCount`, when render list, then compute từ current menu snapshot (`GET /api/v1/menu`) bằng count products theo `categoryId`; nếu menu snapshot chưa available/fail thì hiển thị `—` và không block CRUD categories.
4. Given admin click `+ Tạo danh mục mới`, when dialog mở, then render `<CategoryForm />` bằng shadcn Dialog/RHF/Zod với fields: `name` required 1-100 chars, `sortOrder` integer ≥0 default `max(sortOrder)+10`, `isActive` switch default `true` nếu backend DTO hỗ trợ.
5. Given create form valid, when submit, then call `POST /api/v1/categories` body `{ name, sortOrder, isActive? }` only including `isActive` after backend DTO supports it; success closes dialog, toast `Đã tạo danh mục`, invalidates categories query and menu-related query/cache.
6. Given admin click `Sửa`, when dialog mở, then form prefill row data and allows editing `name`, `sortOrder`, and `isActive` only if backend accepts it; submit calls `PATCH /api/v1/categories/:id`; success toast `Đã cập nhật danh mục` and refetches.
7. Given inline active toggle is visible, when admin toggles `isActive`, then call `PATCH /api/v1/categories/:id` with `{ isActive: <next> }`, use optimistic update with rollback on failure, and show text label `Đang dùng` / `Tạm ẩn` via `StatusBadge` or switch label; do not rely on color only.
8. Given current backend DTO does not yet expose `isActive` in create/update DTO, when implementing this story, then minimally extend BE category DTO/repository tests to accept optional `isActive: boolean` for create/update rather than faking FE-only state; all mutations must keep existing menu-version bump transaction from Story 3.2.
9. Given admin click `Xóa`, when confirm dialog opens, then label `Xóa danh mục này?` and detail `Không thể hoàn tác.`; confirm calls `DELETE /api/v1/categories/:id`; success toast `Đã xóa danh mục` and refetches.
10. Given delete returns 409 category-has-products, when handling error, then toast `Danh mục đang chứa N sản phẩm. Xóa hoặc chuyển sản phẩm sang danh mục khác trước.` extracting N from Problem Details `detail` if possible, with fallback message if count unavailable.
11. Given loading state, when TanStack Query fetching initial categories, then `AdminDataTable` renders skeleton rows and row actions/toggles are disabled or not clickable.
12. Given empty categories list, when not loading, then render `<EmptyState />` with copy `Chưa có danh mục nào. Tạo danh mục đầu tiên để bắt đầu.`.
13. Given 5xx/network/request error, when categories list fails, then render reusable error state/card with retry button; do not show raw technical error, stack trace, idempotency, or menu-version terms to admin.
14. Given sorting, when page renders, then default order is `sortOrder` asc then `name` asc matching backend repository; sortable headers may update local sort state but must not fight backend order or mutate server data.
15. Given accessibility requirements, when using keyboard/screen reader, then create/edit/delete/toggle controls have labels, focus indicator, dialog focus trap/return, Esc safe close, errors linked via `aria-describedby`, touch target ≥44px, and no status communicated by color alone.
16. Tests cover page happy path, loading, empty, fetch error retry, create success/validation, edit success, active toggle optimistic rollback, delete success, delete 409 mapping, and a11y-critical labels/focus behavior.

## Tasks / Subtasks

- [x] Wire admin categories route/page (AC: 1, 2, 11, 12, 13)
  - [x] Replace Story 3.1 placeholder for `/admin/menu/categories` with lazy/imported `categories-page.tsx` under `pos-web/src/routes/admin/menu/`.
  - [x] Keep existing `AdminLayout`, navigation, `AdminRoleGate`, and logout behavior untouched.
  - [x] Add page header/title/CTA and render `AdminDataTable` with loading/empty/error states.
- [x] Add category API + query layer (AC: 2, 3, 5, 6, 7, 9, 10)
  - [x] Create `pos-web/src/features/admin/categories/api.ts` (or project-consistent admin feature path) using existing `apiClient`; endpoints are relative to `/api/v1`: `/categories`, `/categories/:id`, `/menu`.
  - [x] Define `CategoryDto` matching BE response `{ id, name, sortOrder, isActive, createdAt, updatedAt }` and mutation DTOs.
  - [x] Use TanStack Query for list/mutations; invalidate categories and menu snapshot queries after successful mutation.
  - [x] Compute `productCount` from menu snapshot products by `categoryId`; tolerate missing menu data.
- [x] Implement `CategoryForm` dialog (AC: 4, 5, 6, 15)
  - [x] Create `pos-web/src/routes/admin/menu/_shared/category-form.tsx` or `features/admin/categories/components/category-form.tsx`.
  - [x] Use React Hook Form + `zodResolver`; no custom ad-hoc validation.
  - [x] Fields: name, sortOrder, optional isActive switch when backend is ready; inline Vietnamese validation messages.
  - [x] Preserve unsaved changes by confirming before unsafe close if practical; at minimum do not close on validation failure.
- [x] Implement active status/toggle correctly (AC: 7, 8, 15)
  - [x] Verify/extend BE `CreateCategoryDto`/`UpdateCategoryDto` with optional `isActive` using `@IsBoolean()`/`@IsOptional()` and Swagger examples.
  - [x] Ensure `CategoriesRepository.create/update` persists `isActive` and existing transaction still bumps menu version.
  - [x] Add/adjust BE tests for create/update/toggle `isActive`; do not add a separate toggle endpoint for categories unless architecture changes.
  - [x] FE table uses existing `StatusBadge` and/or accessible switch with visible labels `Đang dùng` / `Tạm ẩn`.
- [x] Implement delete confirmation + error mapping (AC: 9, 10, 13, 15)
  - [x] Use existing shadcn Dialog primitive; destructive button variant for confirm.
  - [x] Parse Problem Details response for 409 category-has-products; map to admin-friendly Vietnamese toast.
  - [x] Disable duplicate delete submit while pending.
- [x] Tests and quality gates (AC: 16)
  - [x] Add `categories-page.test.tsx` with MSW or axios/apiClient mocking consistent with existing FE tests.
  - [x] Add `category-form.test.tsx` if form complexity warrants separate tests.
  - [x] Update BE category DTO/service/repository/controller specs if `isActive` support is added.
  - [x] Run targeted FE tests plus typecheck/lint where available; run targeted BE category tests if BE changed.


### Review Findings

- [x] [Review][Patch] Active switch form label is static and misleading when inactive — AC7/AC15 require visible text label `Đang dùng` / `Tạm ẩn` and no color-only/status ambiguity. The form always renders `Trạng thái: đang dùng` even when editing an inactive category, so admins/screen readers get wrong state text. [pos-web/src/routes/admin/menu/_shared/category-form.tsx:40-42]
- [x] [Review][Patch] Row actions are not disabled during initial loading — AC11 requires row actions/toggles disabled or not clickable while initial categories are loading. Current `AdminDataTable` supports `loading` skeletons, but row action buttons have no disabled state and CategoriesPage passes clickable `Sửa`/`Xóa` actions unconditionally once rendered/refetching. [pos-web/src/shared/components/admin/admin-data-table.tsx:86]
- [x] [Review][Patch] Backend lacks validation test for non-boolean `isActive` — AC16 requires BE scenarios for invalid non-boolean rejection after adding optional `isActive`. Service specs only assert payload forwarding for boolean values; no DTO/controller validation coverage proves invalid values are rejected. [pos-api/src/menu/services/categories.service.spec.ts:54-81]

## Dev Notes

### Current State / Files to Read First

- `pos-web/src/routes/admin/_layout.tsx`: already provides Admin shell, sectioned nav links to `/admin/menu/categories`, `/admin/menu/products`, `/admin/menu/option-groups`, header, logout, responsive nav. **Do not duplicate layout or role gate.**
- `pos-web/src/app-router.tsx`: contains lazy admin route boundary and placeholder child routes from Story 3.1; update only the categories child to real page.
- `pos-web/src/shared/components/admin/admin-data-table.tsx`: generic table already exists with columns, rowActions, loading skeletons, empty state, sortable header callback. Reuse it; do not build another table.
- `pos-web/src/shared/components/ui/status-badge.tsx`, `button.tsx`, `dialog.tsx`, `input.tsx`, `empty-state.tsx`, `table.tsx`: reuse existing primitives.
- `pos-web/src/shared/lib/api-client.ts`: use existing auth/interceptor base client; do not create a new axios instance.
- `pos-web/src/features/menu/api.ts` + `types.ts`: existing `fetchMenu()` returns menu snapshot used by POS. Reuse or wrap it for `productCount`; avoid changing POS sync semantics.
- `pos-api/src/menu/controllers/categories.controller.ts`, `dto/create-category.dto.ts`, `dto/update-category.dto.ts`, `repositories/categories.repository.ts`, `services/categories.service.ts`: current BE category CRUD already returns `isActive` in response and Prisma has `Category.isActive`, but DTO only accepts `name` and `sortOrder`. This story's active toggle requires optional `isActive` support in DTO/repository/tests.

### Architecture / Library Guardrails

- FE stack: React 19 + TypeScript + Vite, React Router v7, TanStack Query for server state, Dexie for POS offline cache, RHF + Zod for forms, shadcn/Radix primitives, Vitest + Testing Library. [Source: `_bmad-output/planning-artifacts/architecture.md`]
- BE stack if touched: NestJS, Prisma 7, class-validator DTOs, Problem Details filter, Jest tests. Keep `/api/v1` prefix and camelCase JSON. [Source: `_bmad-output/planning-artifacts/architecture.md`]
- API contract from Story 3.2: `GET/POST/PATCH/DELETE /api/v1/categories`, admin-only mutations, cashier/admin GET, RFC 7807 errors, `bumpMenuVersion()` in same transaction for mutations. [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.2`]
- Category schema: `Category` has `id`, `tenantId`, `storeId`, `name`, `sortOrder`, `isActive`, timestamps, unique `(tenantId, storeId, name)`. [Source: `pos-api/prisma/schema.prisma`]
- Do **not** introduce drag-and-drop for categories in MVP. Sort order is numeric input; duplicate `sortOrder` is allowed and stable display uses `sortOrder` then `name`.
- Do **not** soft-delete categories. Delete remains hard delete and blocked by products (409) per Story 3.2/AR25.
- Do **not** expose technical terms (`menu_version`, idempotency, trace IDs) in admin toasts/copy.

### UX / Accessibility Guardrails

- Follow UX-DR17 `AdminDataTable`: loading/empty/error/filtered/saving row action states, columns/actions/status/sort order, clear headers, skeleton rows, specific action labels.
- Follow UX-DR19 `CategoryForm`: RHF + Zod, fields name + sort order + optional icon; this story adds active switch because schema/target key includes active toggle.
- Follow UX-DR21 `StatusBadge`: always text label, not color-only.
- Admin navigation remains sectioned under Menu (Categories/Products/Option Groups), Reports; CRUD content should be more prominent than nav.
- Dialog requirements: focus trap, heading, safe Esc close, focus return, inline validation close to fields.

### Previous Story Intelligence

- Story 3.1 established the admin shell and reusable components. Its implementation added `@tanstack/react-table`, `AdminDataTable`, `StatusBadge`, table primitive, and route placeholders. Build on those exact files.
- Story 3.2 implemented backend Categories CRUD and menu-version bumping. Reuse its endpoint contract and do not break existing controller/service tests. If adding `isActive`, keep mutation inside the existing service transaction so menu sync sees version changes.
- Recent commits: `feat(pos-api): implement categories CRUD` and `feat(pos-web): add admin layout foundation`; expect codebase patterns from those changes to be authoritative over older planning docs.

### Testing Requirements

- FE tests should mock authenticated API calls and verify user-visible Vietnamese text, not implementation internals.
- Required FE scenarios: initial loading skeleton, successful list with product counts, empty state, fetch error retry, create validation and success, edit prefill/success, delete confirm/success, delete 409 friendly toast, active toggle optimistic success and rollback failure.
- Required BE scenarios if DTO changed: create with default/explicit `isActive`, patch `isActive=false/true`, invalid non-boolean rejected, mutation still bumps menu version.
- Run the smallest meaningful gates before marking done: targeted `vitest` for categories/admin page, TypeScript check for `pos-web`, targeted Jest for BE categories if touched.

### Project Structure Notes

- Expected new/updated FE files:
  - `pos-web/src/routes/admin/menu/categories-page.tsx`
  - `pos-web/src/routes/admin/menu/categories-page.test.tsx`
  - `pos-web/src/routes/admin/menu/_shared/category-form.tsx` (or feature-local equivalent if consistent)
  - `pos-web/src/features/admin/categories/api.ts` and optionally `types.ts`/`hooks.ts`
- Expected updated existing FE file:
  - `pos-web/src/app-router.tsx`
- Expected BE updates only for `isActive` support:
  - `pos-api/src/menu/dto/create-category.dto.ts`
  - `pos-api/src/menu/dto/update-category.dto.ts` (inherits PartialType)
  - `pos-api/src/menu/repositories/categories.repository.ts`
  - relevant category specs

### References

- Story requirements: `_bmad-output/planning-artifacts/epics.md#Story 3.3`
- Epic 3 sequence and dependencies: `_bmad-output/planning-artifacts/epics.md#Epic 3`
- Admin UX requirements: `_bmad-output/planning-artifacts/ux-design-specification.md#AdminDataTable`, `#StatusBadge`, `#Admin navigation`
- Architecture structure/API: `_bmad-output/planning-artifacts/architecture.md#Unified Project Structure`, `#API Surface`
- Current BE category implementation: `pos-api/src/menu/**`
- Current FE admin foundation: `pos-web/src/routes/admin/_layout.tsx`, `pos-web/src/shared/components/admin/admin-data-table.tsx`

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-15 21:57 GMT+7: Inspected existing implementation for Story 3.3 and verified all AC-mapped files were present.
- 2026-05-15 21:58 GMT+7: Ran targeted FE category page tests and FE typecheck.
- 2026-05-15 21:58 GMT+7: Ran targeted BE categories service spec and BE typecheck.
- 2026-05-15 21:59 GMT+7: Ran full `pos-web` Vitest regression suite; all tests passed with existing Radix/React act warnings.
- 2026-05-15 22:10 GMT+7: Verified review fixes for active form status label, disabled table row actions during fetching/loading, and BE non-boolean `isActive` DTO/controller validation coverage.
- 2026-05-15 22:10 GMT+7: Ran targeted BE controller spec for `isActive` validation review finding.
- 2026-05-15 22:05 GMT+7: Fixed code-review follow-ups for dynamic active label, disabled row actions during refetch, and invalid non-boolean `isActive` DTO validation coverage.
- 2026-05-15 22:05 GMT+7: Ran targeted FE category page tests, FE typecheck, targeted BE category controller/service specs, BE typecheck, and full `pos-web` Vitest regression suite.

### Completion Notes List

- Implemented `/admin/menu/categories` route with existing `AdminLayout` integration, page header, CTA, loading skeletons, empty state, retryable safe error state, and `AdminDataTable` columns/actions.
- Added admin categories API/query layer using shared `apiClient`, TanStack Query cache keys, category mutations, menu snapshot fetch, product count computation from menu products, and category/menu invalidation after successful mutations.
- Added RHF + Zod `CategoryForm` dialog with Vietnamese validation, default `sortOrder`, active switch, edit prefill, and validation-safe submit behavior.
- Implemented active status display/toggle with text labels `Đang dùng` / `Tạm ẩn`, accessible toggle labels, optimistic update, rollback on failure, and no color-only status communication.
- Extended BE category create/update flow to accept optional `isActive`, persist it through repository create/update, and keep mutations inside the existing menu-version bump transaction.
- Implemented delete confirmation dialog, duplicate-submit disabling, success toast, and 409 category-has-products Problem Details mapping to friendly Vietnamese copy.
- Added FE coverage for loading/list/product counts, empty, fetch retry, create validation/success, edit success, active toggle rollback, delete success/error mapping; updated BE category service specs for `isActive` payloads.
- ✅ Resolved review finding [Patch]: Category form status label now reflects current `isActive` state as `Đang dùng` / `Tạm ẩn` instead of static active copy.
- ✅ Resolved review finding [Patch]: Admin table row actions support disabled state and categories page disables `Sửa`/`Xóa` while category data is fetching/loading.
- ✅ Resolved review finding [Patch]: Added backend controller/DTO validation coverage proving non-boolean `isActive` values are rejected for create/update DTOs.
- Review follow-ups completed: `CategoryForm` now watches `isActive` and renders `Trạng thái: Đang dùng` / `Trạng thái: Tạm ẩn`; `AdminDataTable` row actions now support disabled state and categories page disables edit/delete while categories are fetching/refetching; controller DTO validation test rejects non-boolean `isActive` values (`"false"`, `"yes"`).

### File List

- _bmad-output/implementation-artifacts/3-3-fe-categories-admin-page-crud-sort-order-active-toggle.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- pos-api/src/menu/dto/create-category.dto.ts
- pos-api/src/menu/repositories/categories.repository.ts
- pos-api/src/menu/services/categories.service.spec.ts
- pos-api/src/menu/controllers/categories.controller.spec.ts
- pos-web/package.json
- pos-web/package-lock.json
- pos-web/src/App.tsx
- pos-web/src/app-router.tsx
- pos-web/src/features/admin/categories/api.ts
- pos-web/src/routes/admin/menu/categories-page.tsx
- pos-web/src/routes/admin/menu/categories-page.test.tsx
- pos-web/src/routes/admin/menu/_shared/category-form.tsx

### Change Log

- 2026-05-15: Implemented Story 3.3 admin categories CRUD page, FE query/form/tests, BE optional `isActive` support, and moved story to review.
- 2026-05-15: Addressed 3 code review patch findings and moved story back to review for re-review.
- 2026-05-15: Addressed review follow-ups for active form status copy, disabled row actions during category refetch, and invalid `isActive` DTO validation coverage; story remains ready for review.
