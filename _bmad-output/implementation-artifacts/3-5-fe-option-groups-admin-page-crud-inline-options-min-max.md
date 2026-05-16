# Story 3.5: FE — Option Groups Admin Page (CRUD + Inline Options + Min/Max)

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented Option Groups admin CRUD page, API client/types, inline option form validation, route wiring, and frontend coverage for list states, create/edit/delete, payloads, and validation.
- Repair pass fixed section-level validation rendering for `maxSelect=1` with multiple default options.
- Built real `/admin/menu/option-groups` page replacing placeholder with list/loading/empty/error states, create/edit/delete dialogs, and Vietnamese UX copy.
- Added OptionGroupForm with inline child options, min/max and default-option validation, VND delta preview, and historical-order note.
- Added TanStack Query mutations for POST/PATCH/DELETE, query invalidation for option groups/admin menu, toast success messages, and 409 in-use guidance.
- Added Vitest coverage for list states, create validation/payload, edit prefill/PATCH id preservation, inline add/remove without premature API, delete success/409 mapping; categories regression tests pass. -->

## Story

As an admin,  
I want trang `/admin/menu/option-groups` để CRUD nhóm tùy chọn với options con quản lý inline,  
so that tôi có thể tạo nhóm "Size" với S/M/L delta giá, bật quy tắc bắt buộc, và sắp xếp thứ tự hiển thị.

## Acceptance Criteria

1. Given route `/admin/menu/option-groups`, when admin mở trang, then hiển thị trang thật thay cho placeholder hiện tại với heading "Nhóm tùy chọn", mô tả ngắn, và header action `+ Tạo nhóm tùy chọn`.
2. Given dữ liệu từ `GET /api/v1/option-groups`, when tải thành công, then dùng `AdminDataTable` hiện có với columns: `name`, `isRequired` hiển thị `StatusBadge` label "Bắt buộc"/"Không bắt buộc", `min/maxSelect` dạng `0-3`, `optionsCount`, `sortOrder`, và row actions "Sửa", "Xóa".
3. Given trang đang loading, empty, hoặc lỗi, when query state thay đổi, then dùng pattern của Categories page: skeleton/loading qua `AdminDataTable`, empty state tiếng Việt rõ, error state không lộ raw technical details và có nút "Thử lại".
4. Given `OptionGroupForm` dialog, when admin tạo hoặc sửa, then form fields gồm `name` required, `isRequired` checkbox/switch label "Bắt buộc chọn"/"Không bắt buộc", `minSelect` integer input ≥0, `maxSelect` integer input ≥1, `sortOrder` integer input, và subsection "Tùy chọn" quản lý inline danh sách option.
5. Given subsection "Tùy chọn", when render mỗi option row, then có field `label`, `priceDeltaVnd` integer VND, `isDefault` checkbox, `sortOrder`, nút remove có accessible label cụ thể, và preview delta giá bằng `formatVnd()`; khi delta bằng 0 hiển thị rõ 0đ/không cộng thêm theo microcopy tiếng Việt.
6. Given admin click `+ Thêm tùy chọn` hoặc remove option, when thao tác, then UI cập nhật form state ngay lập tức và KHÔNG gọi API cho tới khi submit form.
7. Given form validation, when dữ liệu sai, then Zod + React Hook Form hiển thị validation inline ngay dưới field/section sai cho: `name` 1-100 chars, `minSelect <= maxSelect`, `maxSelect >= 1`, nếu `isRequired=true` thì `minSelect >= 1`, ít nhất 1 option khi save, option `label` 1-100 chars, `priceDeltaVnd` integer cho phép âm/0/dương, `sortOrder` integer ≥0, và tối đa 1 `isDefault=true` khi `maxSelect=1`.
8. Given submit form hợp lệ ở create mode, when admin save, then call `POST /api/v1/option-groups` với full payload `{ name, isRequired, minSelect, maxSelect, sortOrder, options: [{ label, priceDeltaVnd, isDefault, sortOrder }] }`; success dispatch toast "Đã lưu nhóm tùy chọn", refetch list, và close dialog.
9. Given submit form hợp lệ ở edit mode, when admin save, then call `PATCH /api/v1/option-groups/:id` với full payload group + complete `options` array, preserve existing child option `id` for rows loaded from server, success dispatch same toast, refetch, và close dialog.
10. Given delete action, when admin xác nhận, then call `DELETE /api/v1/option-groups/:id`; success dispatch toast "Đã xóa nhóm tùy chọn" và refetch; 409 in-use/option-in-use maps to toast/helper "Bỏ gán nhóm tùy chọn khỏi sản phẩm trước khi xóa" with count/detail if available.
11. Given edit existing option group, when dialog mở, then prefill group and nested options exactly from API response, including option `id`, `label`, `priceDeltaVnd`, `isDefault`, `sortOrder`; form hiển thị note: "Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán."
12. Given route wiring, when user navigates from Admin sidebar to `/admin/menu/option-groups`, then route lazy-loads the new page component instead of `PlaceholderPage`, without breaking existing `/admin/menu/categories`, `/admin/menu/products`, `/admin/reports` navigation.
13. Tests cover render/list/loading/empty/error, create validation, add/remove inline options without premature API call, create POST payload, edit prefill + PATCH payload preserving option ids, delete success, delete 409 toast mapping, and route wiring or page import smoke where practical.

## Tasks / Subtasks

- [x] Add Option Groups admin API client/types (AC: 2, 8, 9, 10)
  - [x] Create `pos-web/src/features/admin/option-groups/api.ts` with DTOs for group and option child.
  - [x] Implement `fetchOptionGroups`, `createOptionGroup`, `updateOptionGroup`, `deleteOptionGroup` using `apiClient` paths `/option-groups` and `/option-groups/:id`.
  - [x] Define stable query key `['admin', 'option-groups']` and mutation payload types that preserve child `id` only for update/edit rows.
- [x] Create reusable `OptionGroupForm` with inline options (AC: 4, 5, 6, 7, 11)
  - [x] Add `pos-web/src/routes/admin/menu/_shared/option-group-form.tsx` following `category-form.tsx` style: RHF + `zodResolver`, local Vietnamese validation messages, `noValidate` form.
  - [x] Use `useFieldArray` for options add/remove so no API is called until `handleSubmit`.
  - [x] Include VND delta preview via `formatVnd()` and accessible remove buttons (e.g. `Xóa tùy chọn Size L`).
  - [x] Include snapshot note text in edit/create dialog content.
- [x] Build Option Groups page (AC: 1, 2, 3, 8, 9, 10, 11)
  - [x] Add `pos-web/src/routes/admin/menu/option-groups-page.tsx` modeled on `categories-page.tsx`, reusing `AdminDataTable`, `StatusBadge`, `Button`, `Dialog`, and `EmptyState`.
  - [x] Define table columns including required badge, min/max text, options count, and sort order.
  - [x] Implement create/edit/delete dialog state, default sort order (max existing sortOrder + 10), mutations, query invalidation, and toast events.
  - [x] Map 409 delete errors from Problem Details or `detail` string to helpful Vietnamese toast; do not expose stack/raw Axios errors.
- [x] Wire route and preserve admin navigation (AC: 12)
  - [x] Update `pos-web/src/app-router.tsx` so `/admin/menu/option-groups` lazy imports `option-groups-page`.
  - [x] Do not change existing admin sidebar labels/paths unless tests require minor accessibility fixes.
- [x] Add frontend tests (AC: 3, 6, 7, 8, 9, 10, 13)
  - [x] Add `pos-web/src/routes/admin/menu/option-groups-page.test.tsx` mirroring Categories tests with mocked `apiClient`.
  - [x] Test validation messages for min/max, required min, missing options, and single-select multiple defaults.
  - [x] Test add/remove option rows updates UI without calling `post`/`patch` before submit.
  - [x] Test POST/PATCH payload shapes, including existing option `id` on edit.
  - [x] Test delete 409 toast includes guidance to unassign from products.
- [x] Run gates and document results (AC: 13)
  - [x] From `pos-web`, run targeted Vitest for option-groups page and existing categories/admin table tests.
  - [x] Run `npm run typecheck` and, if time permits, `npm run lint`.

## Dev Notes

### Current State / Files to Read First

- `pos-web/src/app-router.tsx`: `/admin/menu/option-groups` currently lazy-loads `PlaceholderPage title="Nhóm tùy chọn"`; this story must replace only that route with the real page while keeping other lazy routes intact.
- `pos-web/src/routes/admin/_layout.tsx`: admin sidebar already has "Nhóm tùy chọn" linking to `/admin/menu/option-groups`; preserve this navigation and the sectioned Admin layout from Story 3.1.
- `pos-web/src/routes/admin/menu/categories-page.tsx`: best local pattern for TanStack Query server-state, `AdminDataTable` columns/actions, dialog state, mutation invalidation, custom `toast` event, friendly fetch error, and delete 409 mapping. Reuse patterns; do not reinvent table/dialog behavior.
- `pos-web/src/routes/admin/menu/_shared/category-form.tsx`: best form pattern for RHF + Zod resolver, inline field errors, Vietnamese labels, and submit disabled state.
- `pos-web/src/features/admin/categories/api.ts`: best API client structure for admin menu features. Create a sibling `features/admin/option-groups/api.ts` rather than placing admin CRUD calls in `features/menu/api.ts`.
- `pos-web/src/shared/components/admin/admin-data-table.tsx`: generic table foundation from Story 3.1. Use it; do not create another table component.
- `pos-web/src/shared/components/ui/status-badge.tsx`, `button.tsx`, `dialog.tsx`, `input.tsx`, `empty-state.tsx`: existing UI primitives. Prefer these before adding new dependencies.
- `pos-web/src/shared/lib/api-client.ts`: Axios instance already handles base URL and Problem Details mapping via interceptor. Use this instance for all API calls.
- `pos-web/src/shared/lib/format-vnd.ts`: use for price delta preview; VND values are integer đồng, not floats.
- `pos-web/src/routes/admin/menu/categories-page.test.tsx`: established testing style with mocked `apiClient`, `QueryClientProvider`, `userEvent`, and `window.dispatchEvent = vi.fn()`.
- Backend Story 3.4 is done and created `GET/POST/PATCH/DELETE /api/v1/option-groups`; FE can rely on this contract.

### API Contract from Story 3.4

- `GET /api/v1/option-groups` returns groups sorted by `sortOrder asc, name asc` with nested options sorted by `sortOrder asc, label/name asc`.
- Response group shape: `{ id, name, isRequired, minSelect, maxSelect, sortOrder, options: [{ id, label, priceDeltaVnd, isDefault, sortOrder }] }`.
- Create payload: `{ name, isRequired, minSelect, maxSelect, sortOrder, options: [{ label, priceDeltaVnd, isDefault?, sortOrder }] }` and returns created group.
- Update payload is full replacement for group + complete `options` array. Existing options loaded from API should keep `id` in payload; newly added options omit `id`.
- Delete success is 204. Delete conflicts use RFC 7807, notably `https://pos.example/errors/option-group-in-use` with detail containing product assignment count; Story 3.4 may also return option-in-use style conflicts for historical FK safety.
- All paths are relative to `apiClient` base and global API prefix, matching Categories code: use `/option-groups`, not `/api/v1/option-groups` in FE source.

### Architecture / Library Guardrails

- Frontend stack is React 18, Vite 7, React Router 7, TanStack Query 5, React Hook Form, Zod, Axios, Tailwind/shadcn primitives, and Vitest. Do not add a new form/table/toast library for this story.
- Admin server-state belongs in TanStack Query. Do not store option groups in Zustand or Dexie.
- Layer rule: `routes/` may import `features/` and `shared/`; `features/admin/option-groups/api.ts` may import only `shared/` and types. `shared/` must not import routes/features.
- React component filenames are kebab-case; components/types are PascalCase; functions are camelCase.
- All money fields are integer VND. Use `type="number"`, Zod coercion, and integer validation. Do not use float/cents conversion.
- Custom event toast pattern currently dispatches `new CustomEvent('toast', { detail: '...' })`; follow existing Categories page unless a central toast abstraction has since appeared.
- No `dangerouslySetInnerHTML`; no token/localStorage changes.

### UX and Accessibility Requirements

- Admin UI uses table/form/dialog pattern; labels and validation are Vietnamese and near the field requiring correction.
- `StatusBadge` must include text label, not color-only, for required/non-required state.
- Row actions must remain buttons with concrete labels "Sửa" and "Xóa". If adding aria-labels for duplicate row actions, keep tests aligned.
- Remove-option button should be keyboard reachable and have a specific accessible name. Avoid icon-only X without label.
- Form note must state: "Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán." This prevents admins expecting historical receipt changes.
- On saving/deleting, disable submit/destructive buttons while mutation is pending to prevent duplicate requests.

### Previous Story Intelligence

- Story 3.3 Categories FE established the concrete admin FE baseline. It uses `useQuery`, `useMutation`, query invalidation, optimistic toggle, custom toast event, and friendly error copies. Copy this pattern where relevant, but do not bring category-specific active toggle into option groups.
- Story 3.4 BE endpoint maps Prisma `Option.name` to API child field `label`. FE must only use `label`; do not send `name` for child options.
- Story 3.4 update/delete logic protects historical order snapshots. FE should preserve child option IDs on edit so backend can update safe rows rather than treating all children as newly created.
- Recent commits: `0b3f6a3 feat(pos-api): implement option groups CRUD`, `a17a48a feat: complete story 3-3 admin categories`, `d539897 feat(pos-api): implement categories CRUD`, `00fd18d feat(pos-web): add admin layout foundation`. These show the expected story order and implementation pattern.

### Testing Requirements

- Use Vitest + Testing Library style from `categories-page.test.tsx`; mock `apiClient` with `vi.mock('../../../shared/lib/api-client', ...)` adjusted for file path.
- Create representative fixtures: required Size group with M/L options; optional Topping group with maxSelect 3; delete conflict error with Problem Details detail including product count.
- Tests should assert user-visible Vietnamese copy and API payloads, not implementation internals.
- Validation tests should submit without valid data and assert inline messages exist before any API mutation call.
- Add/remove test should assert `apiClient.post`/`patch` not called until final save click.
- Keep test QueryClient retry disabled to avoid flaky repeated calls.
- Minimum gates: targeted `npm test -- option-groups-page` (or Vitest filter syntax supported by package), existing `categories-page` tests to catch regressions, and `npm run typecheck`.

### Project Structure Notes

Expected new/updated files:

- `pos-web/src/features/admin/option-groups/api.ts` (new)
- `pos-web/src/routes/admin/menu/_shared/option-group-form.tsx` (new)
- `pos-web/src/routes/admin/menu/option-groups-page.tsx` (new)
- `pos-web/src/routes/admin/menu/option-groups-page.test.tsx` (new)
- `pos-web/src/app-router.tsx` (update route lazy import)

Detected constraints/conflicts:

- Existing route is a placeholder, so implementation should update route wiring but should not alter admin layout/navigation semantics.
- Existing FE dependencies already include RHF/Zod/TanStack Query; adding new dependencies for this page is unnecessary and should be avoided.
- Backend permits `priceDeltaVnd` negative for discounts; FE validation must not reject negative integers.

### References

- Story requirements: `_bmad-output/planning-artifacts/epics.md#Story 3.5`
- UX admin table/form requirements: `_bmad-output/planning-artifacts/ux-design-specification.md#AdminDataTable`, `_bmad-output/planning-artifacts/ux-design-specification.md#Component Implementation Strategy`
- Architecture frontend stack and structure: `_bmad-output/planning-artifacts/architecture.md#Repo-pos-web-Vite-React-PWA`, `_bmad-output/project-context.md#4-Cấu-trúc-Module`
- Project guardrails: `_bmad-output/project-context.md#2-Quy-tắc-Bắt-buộc-Thi-hành`, `_bmad-output/project-context.md#3-Naming-Convention`
- Existing admin FE baseline: `pos-web/src/routes/admin/menu/categories-page.tsx`, `pos-web/src/routes/admin/menu/_shared/category-form.tsx`, `pos-web/src/features/admin/categories/api.ts`
- Backend contract source: `_bmad-output/implementation-artifacts/3-4-be-option-groups-options-crud-endpoints.md`, `pos-api/src/menu/controllers/option-groups.controller.ts`

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-16: Fixed RHF/Zod array-root validation display for option section (`errors.options.root.message`) so single-select multiple-defaults appears inline.
- 2026-05-16: Gates run from `pos-web`: `npm run test -- option-groups --run` ✅ 7/7; `npm run test -- option-groups-page categories-page admin-data-table --run` ✅ 19/19; `npm run typecheck` ✅; `npm run lint` ✅ with existing React Compiler/RHF/TanStack warning-only diagnostics.

- 2026-05-16: Implemented option groups API client, RHF/Zod form with inline options, page query/mutations/dialogs, and route lazy-load.
- 2026-05-16: Targeted tests initially exposed import path, Zod preprocess chaining, create payload empty id, and section-level validation rendering issues; fixed and reran gates successfully.
- 2026-05-16: Gates: `npm run test -- option-groups categories-page --run` PASS (2 files, 16 tests); `npm run typecheck` PASS; `npm run lint` PASS with 3 existing React Compiler incompatible-library warnings (category form, option group form, admin data table), no errors.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented Option Groups admin CRUD page, API client/types, inline option form validation, route wiring, and frontend coverage for list states, create/edit/delete, payloads, and validation.
- Repair pass fixed section-level validation rendering for `maxSelect=1` with multiple default options.
- Built real `/admin/menu/option-groups` page replacing placeholder with list/loading/empty/error states, create/edit/delete dialogs, and Vietnamese UX copy.
- Added OptionGroupForm with inline child options, min/max and default-option validation, VND delta preview, and historical-order note.
- Added TanStack Query mutations for POST/PATCH/DELETE, query invalidation for option groups/admin menu, toast success messages, and 409 in-use guidance.
- Added Vitest coverage for list states, create validation/payload, edit prefill/PATCH id preservation, inline add/remove without premature API, delete success/409 mapping; categories regression tests pass.

### File List

- `_bmad-output/implementation-artifacts/3-5-fe-option-groups-admin-page-crud-inline-options-min-max.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/src/app-router.tsx`
- `pos-web/src/features/admin/option-groups/api.ts`
- `pos-web/src/routes/admin/menu/_shared/option-group-form.tsx`
- `pos-web/src/routes/admin/menu/option-groups-page.tsx`
- `pos-web/src/routes/admin/menu/option-groups-page.test.tsx`
- `pos-web/src/features/admin/option-groups/api.ts`
- `pos-web/src/routes/admin/menu/_shared/option-group-form.tsx`
- `pos-web/src/routes/admin/menu/option-groups-page.tsx`
- `pos-web/src/routes/admin/menu/option-groups-page.test.tsx`
- `pos-web/src/app-router.tsx`

### Change Log

- 2026-05-16: Story context created and marked ready-for-dev.
- 2026-05-16: Implemented FE Option Groups admin page and marked ready for review.
- 2026-05-16: Implemented option groups admin page CRUD/inline options and marked done after passing gates.
