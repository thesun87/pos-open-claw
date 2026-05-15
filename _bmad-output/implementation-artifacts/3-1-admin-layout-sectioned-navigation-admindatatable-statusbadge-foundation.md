# Story 3.1: Admin Layout + Sectioned Navigation + AdminDataTable + StatusBadge Foundation

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As an admin developer,  
I want có khung Admin chung với sectioned navigation (Menu / Reports), `AdminDataTable` component dùng chung và `StatusBadge` component chuẩn,  
So that các stories sau (Categories, Products, Option Groups, Reports) có UI nhất quán và không phải re-implement table/badge nhiều lần.

## Acceptance Criteria

1. Given routes `/admin/*` đã lazy-load từ Story 1.7, when admin truy cập `/admin`, then route render admin shell không làm tăng POS shell bundle chính và vẫn được bọc bởi `AdminRoleGate` từ Story 1.9.
2. Given file layout admin, when developer mở `pos-web/src/routes/admin/_layout.tsx`, then layout có sectioned navigation (UX-DR30) gồm section `Quản lý Menu` với links `Danh mục`, `Sản phẩm`, `Nhóm tùy chọn` và section `Báo cáo`.
3. Given admin navigation, when user click link, then dùng React Router `<NavLink>`/nested routes thay vì `<a href>` + `preventDefault`; active link/section có visible highlight, `aria-current` mặc định của NavLink, và không dùng màu làm tín hiệu duy nhất.
4. Given admin layout header, when admin đăng nhập, then header hiển thị `StatusBadge`/role badge `Admin`, tên user hiện tại từ session store, và nút `Đăng xuất`.
5. Given user bấm `Đăng xuất`, when action chạy, then clear IndexedDB auth session qua existing `clearSession()`, clear Zustand session state qua `useSessionStore.clearSessionState()`, navigate về `/login`, và không phá refresh/offline session lifecycle hiện có.
6. Given cashier cố truy cập `/admin/*`, when route guard chạy, then `AdminRoleGate` chặn và redirect về `/pos` với message hiện có; không duplicate RoleGate mới.
7. Given component `AdminDataTable<T>` trong `pos-web/src/shared/components/admin/`, when developer mở component, then export generic component dùng props: `columns: { key, label, render?, sortable? }[]`, `data: T[]`, `rowActions: { label, onClick, variant }[]`, `onSortChange?`, `loading?: boolean`, `emptyState?: ReactNode`.
8. Given `AdminDataTable<T>`, when render, then dùng TanStack Table v8 (`@tanstack/react-table`) và shadcn-style table primitive nội bộ, không dùng raw ad-hoc table markup lặp lại ở từng admin page.
9. Given data loading, when `loading=true`, then table render 5 skeleton rows, disable/không render row action click được, và giữ table header rõ.
10. Given table data rỗng và không loading, when `emptyState` được truyền, then render empty state đó; nếu không truyền, render `<EmptyState title="Chưa có dữ liệu" />`.
11. Given row actions, when render mỗi row, then actions nằm inline ở cột cuối, dùng existing `Button` component, có touch target ≥44px, label cụ thể, và variant type-safe mapping về Button variant hiện có (`default|secondary|outline|ghost|destructive`).
12. Given sortable column, when user click/sử dụng keyboard trên header sortable, then gọi `onSortChange` với key + direction, có accessible button/aria-label; không tự fetch data trong component foundation.
13. Given component `StatusBadge` trong `pos-web/src/shared/components/ui/`, when developer mở component, then props là `<StatusBadge variant="success|warning|danger|neutral|accent" label icon? />`.
14. Given `StatusBadge`, when render, then mỗi variant dùng design tokens semantic từ Story 1.7, luôn hiển thị text label, optional icon là decorative/accessible đúng cách, và examples hoạt động: `<StatusBadge variant="success" label="Đang bán" />`, `<StatusBadge variant="neutral" label="Tạm tắt" />`.
15. Given viewport `<1024px`, when admin mở layout, then navigation collapse vào hamburger/disclosure cơ bản, keyboard accessible, focus indicator rõ, touch target ≥44px; nội dung CRUD vẫn ưu tiên hơn nav.
16. Tests cover admin route shell/header/nav active state, cashier forbidden redirect, logout behavior, `AdminDataTable` loading/empty/actions/sort behavior, and `StatusBadge` variants/text accessibility.

## Tasks / Subtasks

- [x] Normalize admin route/layout structure (AC: 1, 2, 3, 4, 6, 15)
  - [x] Rename or replace current `pos-web/src/routes/admin/admin-shell.tsx` with `pos-web/src/routes/admin/_layout.tsx`, preserving the lazy `/admin/*` boundary.
  - [x] Update `pos-web/src/app-router.tsx` lazy import to `./routes/admin/_layout` and route children/placeholders for `/admin`, `/admin/menu/categories`, `/admin/menu/products`, `/admin/menu/option-groups`, `/admin/reports`.
  - [x] Replace current `<a href ... preventDefault()>` nav with `<NavLink>`.
  - [x] Add responsive mobile disclosure/hamburger state for `<1024px`; keep desktop grid/sidebar at `lg` and above.
  - [x] Preserve `AdminRoleGate` wrapping exactly once around `/admin/*`.
- [x] Implement admin header and logout (AC: 4, 5)
  - [x] Read current user from `useSessionStore((s) => s.currentUser)`; display `user.name`/email fallback based on `AuthUser` shape.
  - [x] Use new `StatusBadge variant="accent" label="Admin" />` for role badge.
  - [x] Implement logout by calling existing `clearSession()` from `features/auth/token-store`, `useSessionStore.getState().clearSessionState()`, then React Router `navigate('/login', { replace: true })`.
  - [x] Do not add a backend logout endpoint in this story unless already present; scope is frontend shell foundation.
- [x] Add shadcn-style table primitive if absent (AC: 8)
  - [x] Create `pos-web/src/shared/components/ui/table.tsx` with `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` wrappers matching existing `button.tsx`/`dialog.tsx` style and `cn()` utility.
  - [x] Keep primitive generic and reusable; no admin-specific logic inside `ui/table.tsx`.
- [x] Add `AdminDataTable<T>` foundation (AC: 7, 8, 9, 10, 11, 12)
  - [x] Create `pos-web/src/shared/components/admin/admin-data-table.tsx` and optional `index.ts` export.
  - [x] Install/add `@tanstack/react-table` if package is still missing from `pos-web/package.json`; architecture selected TanStack Table for Admin data grid.
  - [x] Define explicit exported types `AdminDataTableColumn<T>` and `AdminDataTableRowAction<T>`.
  - [x] Use `getCoreRowModel()` and component-local sort state only for UI signal; call `onSortChange` and avoid server fetching/coupling.
  - [x] Render 5 skeleton rows using existing tokens/classes; do not create a separate global `LoadingSkeleton` unless needed by tests.
  - [x] Use existing `<EmptyState />` from `shared/components/ui/empty-state.tsx`.
- [x] Add `StatusBadge` foundation (AC: 13, 14)
  - [x] Create `pos-web/src/shared/components/ui/status-badge.tsx`.
  - [x] Map variants to existing design tokens/classes: success `--color-success`, warning `--color-warning`, danger `--color-danger`, neutral text/border/surface-muted, accent `--color-accent`.
  - [x] Ensure label text is always rendered; icon is optional and must not replace label.
- [x] Add tests and verification gates (AC: 1–16)
  - [x] Add/update route tests for admin shell in `pos-web/src/routes/admin/_layout.test.tsx` or equivalent; test nav labels, active state, responsive disclosure if practical, header user/role, and logout.
  - [x] Add `admin-data-table.test.tsx` for generic render, loading skeleton 5 rows, empty state fallback/custom, row action callback, sortable header callback, and disabled actions while loading.
  - [x] Add `status-badge.test.tsx` for all variants rendering label and accessible text.
  - [x] Extend existing role routing tests if needed to assert cashier `/admin/*` redirect remains intact.
  - [x] Run from `pos-web/`: targeted tests, `npm run typecheck`, `npm run lint`, and `npm run build`.

## Dev Notes

### Source Requirements

- Story source: `_bmad-output/planning-artifacts/epics.md` Story 3.1.
- UX source: `ux-design-specification.md` UX-DR17 `AdminDataTable`, UX-DR21 `StatusBadge`, UX-DR30 admin sectioned navigation, UX-DR34 accessibility.
- Architecture source: React Router v7 route split, shadcn/ui + Tailwind/Radix patterns, TanStack Table for Admin data grid, route-based lazy load for `/admin` to protect POS shell NFR1.

### Existing Frontend State To Preserve

- Current routing in `pos-web/src/app-router.tsx` already wraps `/admin/*` with `<AdminRoleGate />` and lazy-loads `./routes/admin/admin-shell`. Keep this guard/lazy pattern; only change lazy target to `_layout` if you create that file.
- Current `pos-web/src/routes/admin/admin-shell.tsx` is a placeholder and currently uses English labels plus `<a href>` with `preventDefault()`. Replace it; do not preserve that anti-pattern.
- `RootLayout` already owns global app header (`Café POS`, connectivity, pending counter) and wraps children in `SessionBootProvider`. Admin layout should be nested content, not a second global app root that removes connectivity/pending status.
- Existing `Button` has min touch target via `min-h-touch min-w-touch`; use it for nav disclosure, row actions, and logout.
- Existing `EmptyState` requires `title` and optional `description`; `AdminDataTable` fallback should call it with a title.
- Existing `AdminRoleGate` in `features/auth/role-gate.tsx` redirects non-admin to `/pos` with `AUTH_ADMIN_FORBIDDEN_MESSAGE`. Do not duplicate guard logic in layout.
- Existing auth session state is in `features/auth/session-store.ts`; persisted session helpers are in `features/auth/token-store.ts`. Logout must clear both persistent session and Zustand state.

### File Structure Requirements

Expected new/updated files:

- UPDATE `pos-web/src/app-router.tsx`
- NEW/REPLACE `pos-web/src/routes/admin/_layout.tsx`
- DELETE or leave unused only if safe: `pos-web/src/routes/admin/admin-shell.tsx` (prefer remove/update imports to avoid stale code)
- NEW `pos-web/src/shared/components/admin/admin-data-table.tsx`
- NEW optional `pos-web/src/shared/components/admin/index.ts`
- NEW `pos-web/src/shared/components/ui/table.tsx`
- NEW `pos-web/src/shared/components/ui/status-badge.tsx`
- NEW tests near components/routes using existing Vitest + Testing Library pattern
- UPDATE `pos-web/package.json` / lockfile only if adding missing `@tanstack/react-table`

Future story paths that depend on this foundation:

- `pos-web/src/routes/admin/menu/categories-page.tsx` (Story 3.3)
- `pos-web/src/routes/admin/menu/products-page.tsx` (Story 3.7)
- `pos-web/src/routes/admin/menu/option-groups-page.tsx` (Story 3.5)
- `pos-web/src/routes/admin/reports/*` (Epic 4)

### Technical Guardrails

- Use TypeScript strict; avoid `any`. For table generics, constrain row type minimally (`T extends object`) and support column keys as `keyof T | string` if nested/computed columns are needed later.
- Do not introduce a new UI library/DataGrid. Architecture selected TanStack Table v8 + shadcn-style primitives.
- Do not couple `AdminDataTable` to Categories/Products API, TanStack Query, or Dexie. It is a presentational foundation for later stories.
- Do not overload existing `SyncStatusBadge`; Story 3.1 needs a generic business/system `StatusBadge` in `shared/components/ui/`.
- Keep admin labels Vietnamese: `Quản lý Menu`, `Danh mục`, `Sản phẩm`, `Nhóm tùy chọn`, `Báo cáo`, `Đăng xuất`, `Admin`.
- UX/accessibility: WCAG 2.1 AA; focus-visible ring already in `tokens.css`; keep keyboard support, visible active state, text labels, `aria-label` for hamburger, and touch target ≥44px.
- Error UI is not central to this foundation story, but do not show raw Problem Details/stack/request IDs in any placeholder or future-facing error state.

### Previous Story / Git Intelligence

- Epic 2 completed offline POS/order sync work. Recent commits show implementation pattern: targeted component tests first, then typecheck/lint/build gates; keep that discipline.
- Story 2.13 added `StatusBadge`-like void labels in receipt but did not create generic `StatusBadge`; avoid copying receipt-specific badge markup into admin pages. Centralize here.
- Story 1.7–1.9 established PWA shell, route lazy-loading, token/session IndexedDB, axios interceptor, role routing and session lifecycle. Do not rewrite these foundations.
- Current git log includes sync/void/cart work, not Admin foundation; expect this story to be the first Epic 3 FE foundation change.

### Testing Requirements

Minimum frontend coverage:

- Admin layout renders expected Vietnamese nav sections and links.
- Active admin nav link has visible active class and/or `aria-current="page"`.
- Header renders current user identity, `Admin` badge, and `Đăng xuất`.
- Logout clears persisted session/state and navigates to `/login`.
- Cashier attempting `/admin` still redirects to `/pos` through `AdminRoleGate`.
- `AdminDataTable` renders columns/data, 5 skeleton rows during loading, fallback/custom empty state, row action callbacks, and sort callback with direction toggling.
- `StatusBadge` renders labels for all variants and does not rely on color-only indication.

Suggested gates:

```bash
cd pos-web
npm test -- --run src/routes/admin src/shared/components/admin src/shared/components/ui/status-badge.test.tsx
npm run typecheck
npm run lint
npm run build
```

## Project Context Reference

Primary context is `_bmad-output/project-context.md`; source of truth for architecture decisions is `_bmad-output/planning-artifacts/architecture.md`. If documents conflict with existing code, preserve working Story 1/2 behavior and document the mismatch in Dev Agent Record before changing.

## Dev Agent Record

### Agent Model Used

gpt-5.5 (OpenClaw subagent)

### Debug Log References

- 2026-05-14: `cd pos-web && npm test -- --run src/routes/admin src/shared/components/admin src/shared/components/ui/status-badge.test.tsx` — PASS (3 files, 7 tests). React Router test-only 404 stderr after logout navigate because the focused test router omits `/login`; assertion still verifies navigation behavior.
- 2026-05-14: `cd pos-web && npm run typecheck` — PASS.
- 2026-05-14: `cd pos-web && npm run lint` — PASS with one React Compiler warning for TanStack Table `useReactTable()` incompatible-library (expected library warning, no lint errors).
- 2026-05-14: `cd pos-web && npm run build` — PASS; Vite emitted existing chunk-size warning for main bundle.

### Completion Notes

- Implemented lazy Admin layout route at `pos-web/src/routes/admin/_layout.tsx` with Vietnamese sectioned navigation, React Router `NavLink`, active/focus states, responsive hamburger disclosure, nested admin placeholders, and single existing `AdminRoleGate` wrapping in `app-router.tsx`.
- Added Admin header using current session user identity, generic `StatusBadge` role badge, and logout flow clearing IndexedDB session plus Zustand session state before navigating to `/login`.
- Added reusable shadcn-style table primitives, `AdminDataTable<T>` foundation with TanStack Table v8, typed columns/actions, loading skeleton rows, empty states, inline actions, and sortable header callback.
- Added generic `StatusBadge` component with semantic variants and always-visible label text.
- Added/updated tests for Admin layout/header/nav/logout, cashier redirect preservation, AdminDataTable loading/empty/actions/sort behavior, StatusBadge variants/text accessibility, and existing App route smoke coverage.

### File List

- pos-web/package.json
- pos-web/package-lock.json
- pos-web/src/App.test.tsx
- pos-web/src/app-router.tsx
- pos-web/src/routes/admin/admin-shell.tsx (deleted)
- pos-web/src/routes/admin/_layout.tsx
- pos-web/src/routes/admin/_layout.test.tsx
- pos-web/src/shared/components/admin/admin-data-table.tsx
- pos-web/src/shared/components/admin/admin-data-table.test.tsx
- pos-web/src/shared/components/admin/index.ts
- pos-web/src/shared/components/ui/table.tsx
- pos-web/src/shared/components/ui/status-badge.tsx
- pos-web/src/shared/components/ui/status-badge.test.tsx

## Change Log

- 2026-05-14: Created comprehensive Story 3.1 context for Admin layout, AdminDataTable, and StatusBadge foundation.
- 2026-05-14: Implemented Story 3.1 admin layout/navigation, AdminDataTable, StatusBadge, tests, and verification gates.
- 2026-05-14: Implemented Story 3.1 Admin layout/table/badge foundation and moved to review after passing gates.
