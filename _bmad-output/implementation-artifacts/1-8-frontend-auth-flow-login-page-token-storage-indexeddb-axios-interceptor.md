# Story 1.8: Frontend Auth Flow — Login Page + Token Storage IndexedDB + Axios Interceptor

Status: done

<!-- Validation: create-story checklist self-review completed 2026-05-11. -->

## Story

As a cashier or admin,
I want truy cập trang `/login`, nhập email + password, đăng nhập thành công và được điều hướng tới surface phù hợp với access token được lưu an toàn vào IndexedDB,
so that tôi có thể bắt đầu sử dụng POS hoặc Admin và phiên của tôi tồn tại qua reload/offline trong 7 ngày.

## Acceptance Criteria

1. **Dexie session store:** Given Dexie 4.x đã được install, when developer mở `src/db/dexie.ts`, then Dexie instance `db` được tạo với schemas tách module:
   - `db.session`: bảng access token, primary key `id` (single-row pattern), fields `accessToken`, `expiresAt`, `userInfo`, `lastLoginAt`.
   - `db.orders`: bảng pending orders placeholder, populate ở Epic 2.
   - `db.menu`: bảng menu cache placeholder.
   - version migration setup theo Dexie convention; `db.session` không bao giờ chứa password plaintext.
2. **Login form:** Given route `/login` đã tồn tại từ Story 1.7, when developer mở `src/routes/login/login-page.tsx` và `login-form.tsx`, then form dùng React Hook Form + `zodResolver` với schema validate `email` (email regex) + `password` (min 8); submit gọi `POST /api/v1/auth/login` qua `apiClient`; loading state dùng RHF `isSubmitting`; lỗi validation server 400 hiển thị field errors inline; lỗi credentials 401 hiển thị message tiếng Việt `Sai email hoặc mật khẩu`; layout dùng design tokens (`--color-bg`, `--color-primary`) và đạt WCAG AA.
3. **Successful login persistence + role redirect:** Given login thành công, when server trả `{ accessToken, user }`, then client ghi `db.session.put({ id: 'current', accessToken, expiresAt: <decoded exp>, userInfo: user, lastLoginAt: now() })`; Zustand `sessionStore` cập nhật `currentUser`; điều hướng theo role: admin → `/admin`, cashier → `/pos`.
4. **Request interceptor:** Given axios interceptor đã được wire, when request đi ra, then request interceptor đọc `db.session.get('current')`, check `expiresAt` chưa qua, đính `Authorization: Bearer <accessToken>`; nếu `exp` đã qua, emit custom event `auth.expired`, redirect `/login`, không gửi request.
5. **401 refresh flow:** Given request 401 từ server, when response interceptor xử lý, then thực hiện đúng 1 lần `POST /api/v1/auth/refresh` với cookie tự gửi (`withCredentials`) + header `X-CSRF-Token` đọc từ cookie `csrf_token`; nếu refresh thành công, ghi access token mới vào `db.session` và retry original request đúng 1 lần; nếu refresh thất bại, clear `db.session`, emit `auth.expired`, redirect `/login`.
6. **Offline/network error behavior:** Given request fail vì network error, when response interceptor xử lý, then đọc `db.session` access token và check `exp`; nếu còn hạn, reject lỗi network nhưng không clear session/redirect (Epic 2 sẽ wire Dexie offline writes); nếu hết hạn, emit `auth.expired` và redirect `/login`.
7. **Strict token storage:** Given token storage strict, when developer search code, then không có `localStorage.setItem` hoặc `sessionStorage.setItem` cho token; code không lưu password; refresh token chỉ qua HttpOnly cookie từ backend.
8. **Tests/gates:** Frontend tests cover Dexie session store helpers, login form validation/submission states, role redirect, request Authorization header, expired-token redirect, 401 refresh success/failure, network error session-preservation, and no-token-storage regression scan. Required gates pass and are recorded: `cd pos-web && npm run typecheck && npm run lint && npm test && npm run build`.

## Tasks / Subtasks

- [x] Install FE auth/session dependencies (AC: 1,2,3,8)
  - [x] Add runtime deps: `dexie@4`, `dexie-react-hooks`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `zod`, and lightweight JWT decode helper if needed (`jwt-decode`) or implement a tiny base64url decoder with tests.
  - [x] Do not add alternative state/query libraries for this story; TanStack Query is for later Admin server-state stories.
- [x] Add Dexie database module and typed session helpers (AC: 1,3,4,5,6,7)
  - [x] Create `src/db/dexie.ts` exporting typed `db` with versioned stores: `session`, `orders`, `menu`.
  - [x] Create `src/features/auth/token-store.ts` for `saveSession`, `getCurrentSession`, `clearSession`, `decodeJwtExpiresAt`.
  - [x] Enforce single-row key `id: 'current'`; store `expiresAt` as epoch milliseconds derived from JWT `exp` seconds.
  - [x] User info type must match backend login response: `{ id, email, role, tenantId, storeId }`; normalize role handling for current backend enum casing if necessary (`Admin`/`Cashier` vs `admin`/`cashier`) without changing API contract silently.
- [x] Implement auth API and session store (AC: 2,3,5)
  - [x] Create `src/features/auth/api.ts` with `login(email,password)` and `refresh()` using `apiClient` against `/auth/login` and `/auth/refresh` (baseURL already includes API host/prefix if configured; do not hardcode host).
  - [x] Create `src/features/auth/session-store.ts` Zustand store with `currentUser`, `isAuthenticated`, `setSessionFromRecord`, `clearSessionState`.
  - [x] Keep feature imports one-way: auth feature may import `shared/` and `db/`; shared code must not import `features/auth` directly.
- [x] Replace login stub with real accessible login UI (AC: 2,3,7)
  - [x] Add `src/routes/login/login-form.tsx`; update `login-page.tsx` to render it.
  - [x] Use RHF + Zod validation; labels associated with fields; inline errors via `aria-describedby`; submit button disabled/loading while `isSubmitting`.
  - [x] Map 400 validation Problem Details to field errors; map 401 invalid credentials to `Sai email hoặc mật khẩu`; never show raw stack/trace/request id to user.
  - [x] Use existing shadcn-compatible `Button` and `Input`, warm café tokens, visible focus state, and semantic form HTML.
- [x] Wire axios auth interceptor safely (AC: 4,5,6,7)
  - [x] Update `src/shared/lib/api-client.ts` or extract `src/features/auth/interceptor.ts`; avoid circular imports by passing token-store functions into a setup function if needed.
  - [x] Request path: read IndexedDB async, skip auth header for `/auth/login` and `/auth/refresh`, attach Bearer only when session exists and `expiresAt > Date.now()`.
  - [x] Expired path: clear session, emit `window.dispatchEvent(new CustomEvent('auth.expired'))`, redirect via a navigation helper or `window.location.assign('/login')` fallback; do not send original request.
  - [x] 401 path: guard `_retry` flag on Axios config to prevent loops; read `csrf_token` from `document.cookie`; call refresh with `withCredentials: true`; save new access token; retry original request once.
  - [x] Network-error path: if no `error.response`, check IndexedDB session; preserve valid session, clear only expired session.
- [x] Add auth-expired handling integration (AC: 4,5,6)
  - [x] Root layout or app bootstrap listens for `auth.expired`, clears Zustand session state, and redirects `/login` with non-technical Vietnamese message when possible.
  - [x] Keep full reload/reboot session hydration mostly for Story 1.9; this story may hydrate current user after login and for interceptor checks only.
- [x] Tests and regression gates (AC: 1-8)
  - [x] Add Vitest tests for token decoding, Dexie session helpers (use test DB name/cleanup), login form validation and API error mapping.
  - [x] Add interceptor tests with mocked axios adapter or module mocks for success auth header, expired token redirect, 401 refresh success/failure, and network error preservation.
  - [x] Add a grep-like test or lint-friendly assertion ensuring token persistence never uses `localStorage`/`sessionStorage`.
  - [x] Run and record: `cd pos-web && npm run typecheck && npm run lint && npm test && npm run build`.

### Review Findings

- [x] [Review][Patch] `shared/lib/api-client.ts` imports `features/auth`, violating the required frontend layering. [pos-web/src/shared/lib/api-client.ts:2]
- [x] [Review][Patch] Exported `refresh()` API wrapper does not send `X-CSRF-Token` from `csrf_token` cookie, so direct refresh callers would violate the refresh contract. [pos-web/src/features/auth/api.ts:12]

## Dev Notes

### Scope boundaries

- This story owns: login form, Dexie database foundation, IndexedDB-backed access-token storage, Zustand auth state after login, axios bearer/refresh interceptor, auth-expired event behavior, and auth-flow tests.
- This story does **not** own: full app boot/reload role guarding and offline 7-day route access (Story 1.9), POS order/menu Dexie schemas beyond placeholders (Epic 2/3), logout button UX, Admin CRUD, or CI lint rule wiring (Story 1.10). Add clear extension points only.

### Current implementation state to preserve

- `pos-web/src/shared/lib/api-client.ts` already exports `apiClient` with `baseURL = import.meta.env.VITE_API_BASE_URL`, Accept JSON, response Problem Details mapping stub, and a Story 1.8 request-interceptor TODO. Extend this file; preserve Problem Details mapping behavior. [Source: `pos-web/src/shared/lib/api-client.ts`; `_bmad-output/implementation-artifacts/1-7-frontend-shell-pwa-design-tokens-tailwind-shadcn-react-router-v7.md#Dev-Agent-Record`]
- `pos-web/src/routes/login/login-page.tsx` is a stub stating login form comes in Story 1.8. Replace it with real page + `login-form.tsx`, not a second route. [Source: `pos-web/src/routes/login/login-page.tsx`]
- Router currently defines `/login`, `/pos`, `/admin/*` in `src/app-router.tsx`; keep React Router v7 data-router pattern and lazy `/admin/*`. [Source: `pos-web/src/app-router.tsx`; `_bmad-output/planning-artifacts/epics.md#Story-1.7`]
- Existing UI primitives: `Button`, `Input`, `Dialog`, `cn`, warm café tokens, layout status components. Reuse them; do not introduce another UI kit. [Source: `pos-web/src/shared/components/ui/*`; `_bmad-output/project-context.md#Technology-Stack-Versions`]

### Architecture and security guardrails

- Token storage is strict: access token only in IndexedDB `db.session`; refresh token only as backend HttpOnly Secure cookie; never `localStorage`/`sessionStorage`; never password storage; never `dangerouslySetInnerHTML`. [Source: `_bmad-output/project-context.md#2-Quy-tắc-Bắt-buộc-Thi-hành`; `_bmad-output/planning-artifacts/architecture.md#Xác-thực-Bảo-mật`]
- Access token JWT TTL is exactly 7 days and is also the offline gate. Client must decode `exp` and store `expiresAt`; expired token must redirect `/login` without sending protected request. [Source: `_bmad-output/planning-artifacts/architecture.md#Xác-thực-Bảo-mật`; `_bmad-output/planning-artifacts/architecture.md#Luồng-Auth-Client`]
- Refresh flow uses backend `POST /api/v1/auth/refresh` with rotating refresh cookie and CSRF double-submit: cookie `csrf_token` + header `X-CSRF-Token`. Axios request must allow cookies (`withCredentials: true`) for auth calls needing cookies. [Source: `_bmad-output/planning-artifacts/epics.md#Story-1.5`; `_bmad-output/planning-artifacts/epics.md#Story-1.8`]
- Error responses use RFC 7807 Problem Details. UI-facing messages are Vietnamese and sanitized; do not expose raw technical detail, stack, or trace id. [Source: `_bmad-output/project-context.md#2-Quy-tắc-Bắt-buộc-Thi-hành`; `_bmad-output/planning-artifacts/architecture.md#API-Mẫu-Giao-tiếp`]
- CSP/XSS mitigation matters because access token is readable by JS in IndexedDB. Avoid HTML injection and third-party script assumptions. [Source: `_bmad-output/planning-artifacts/architecture.md#Key-Risks-Mitigations`]

### File structure requirements

Expected files to add/update:

```text
pos-web/src/
├── db/
│   └── dexie.ts                         # NEW typed Dexie db: session/orders/menu
├── features/
│   └── auth/
│       ├── api.ts                       # NEW login/refresh API wrappers
│       ├── token-store.ts               # NEW IndexedDB session helpers + JWT exp decode
│       ├── session-store.ts             # NEW Zustand current-user state
│       └── interceptor.ts               # NEW optional setup helper for apiClient interceptors
├── routes/login/
│   ├── login-page.tsx                   # UPDATE real page shell
│   └── login-form.tsx                   # NEW RHF/Zod form
└── shared/lib/
    ├── api-client.ts                    # UPDATE wire auth/refresh behavior while preserving errorMapper
    └── error-mapper.ts                  # UPDATE only if needed for validation/credential mapping
```

Layering: `routes/` may import `features/auth`; `features/auth` may import `shared/` and `db/`; `shared/` must not import `features/auth` unless dependency injection avoids a direct feature dependency. [Source: `_bmad-output/project-context.md#4-Cấu-trúc-Module`; `_bmad-output/planning-artifacts/architecture.md#Repo-pos-web`]

### API contracts

- Login request: `POST /api/v1/auth/login` body `{ email, password }`; response 200 `{ accessToken, user: { id, email, role, tenantId, storeId } }`; cookies set by backend. [Source: `_bmad-output/planning-artifacts/epics.md#Story-1.5`]
- Refresh request: `POST /api/v1/auth/refresh` header `X-CSRF-Token: <csrf_token cookie>`; response 200 `{ accessToken }`; 401 `type=...session-revoked`, 403 `type=...csrf-failed`. [Source: `_bmad-output/planning-artifacts/epics.md#Story-1.5`]
- Invalid credentials: backend 401 Problem Details type `...invalid-credentials`, title/message equivalent to `Sai email hoặc mật khẩu`; login page should show exactly `Sai email hoặc mật khẩu` for users. [Source: `_bmad-output/planning-artifacts/epics.md#Story-1.5`; `_bmad-output/planning-artifacts/epics.md#Story-1.8`]

### UX/accessibility requirements

- Login is a core WCAG 2.1 AA flow: labels, visible focus, field error association, keyboard-only submit path, no color-only state, contrast 4.5:1 normal text. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-Strategy`; `_bmad-output/planning-artifacts/epics.md#UX-Design-Requirements`]
- Use warm café visual system: background `#F8F3EA`, surface white, primary `#6F3E1F`, text `#241A14`; do not add a conflicting theme. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Visual-Design-Foundation`; `pos-web/src/styles/tokens.css`]
- Microcopy is Vietnamese. Status/error text should be calm and non-technical. [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Status-Microcopy-Localization`]

### Previous story intelligence

- Story 1.7 intentionally left auth/token storage unimplemented and added clear extension points; do not fake login or temporary token persistence. [Source: `_bmad-output/implementation-artifacts/1-7-frontend-shell-pwa-design-tokens-tailwind-shadcn-react-router-v7.md#Dev-Notes`]
- Story 1.7 gates passed after strict typing/lint fixes. Maintain strict TypeScript and avoid Fast Refresh lint issues by keeping component exports and helper exports separated where necessary. [Source: `_bmad-output/implementation-artifacts/1-7-frontend-shell-pwa-design-tokens-tailwind-shadcn-react-router-v7.md#Dev-Agent-Record`]
- Existing API client already maps Problem Details. Extend, don’t replace, to avoid regression in tests from Story 1.7. [Source: `_bmad-output/implementation-artifacts/1-7-frontend-shell-pwa-design-tokens-tailwind-shadcn-react-router-v7.md#Completion-Notes-List`]

### Latest technical notes

- Dexie 4 TypeScript docs recommend typed table properties and `db.version(n).stores({...})`; keep schema strings minimal and explicit. `dexie-react-hooks` `useLiveQuery` is available for later stories but this story mostly needs direct async helpers. [Source: Dexie docs web research 2026-05-11: `https://dexie.org/docs/Typescript`, `https://dexie.org/docs/liveQuery()`]
- Axios interceptors may return async config promises; guard refresh retry with a custom `_retry` flag to prevent infinite 401 loops. Keep token reads async-safe because IndexedDB is async.

### Testing Standards

- Use Vitest + Testing Library already configured in `pos-web`.
- Tests must not rely on real backend. Mock `apiClient`/axios adapter, Dexie test database, and navigation side effects.
- Minimum coverage for this story: validation happy/negative path, session save/read/clear, expiration logic, interceptor auth attach, 401 refresh retry, refresh failure clear/redirect, network error valid-session preservation, and no token storage in local/session storage.
- Required final gates: `cd pos-web && npm run typecheck && npm run lint && npm test && npm run build`.

## Project Structure Notes

- Aligns with architecture’s `routes → features → shared/db` one-way frontend layering.
- `shared/lib/api-client.ts` is the only likely layering tension because interceptor needs auth session. Prefer `features/auth/interceptor.ts` exporting `installAuthInterceptor(apiClient, deps)` and call it from app bootstrap or api-client setup with injected functions to avoid `shared` importing `features`. If direct import is used, document why and ensure no circular import.
- Do not expand `db.orders`/`db.menu` beyond placeholders; later stories own real offline order/menu schemas.

## References

- `_bmad-output/planning-artifacts/epics.md#Story-1.8` — canonical story and acceptance criteria.
- `_bmad-output/planning-artifacts/epics.md#Story-1.5` — backend login/refresh/logout API contracts.
- `_bmad-output/planning-artifacts/epics.md#Story-1.9` — next story boundary for reload/offline role gate behavior.
- `_bmad-output/planning-artifacts/architecture.md#Xác-thực-Bảo-mật` — JWT 7-day IndexedDB + refresh cookie strategy.
- `_bmad-output/planning-artifacts/architecture.md#Luồng-Auth-Client` — interceptor/refresh/offline auth flow.
- `_bmad-output/planning-artifacts/architecture.md#Repo-pos-web` — expected frontend file locations.
- `_bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-Strategy` — login accessibility requirements.
- `_bmad-output/project-context.md` — mandatory stack, token storage ban, naming/layering/security rules.
- `_bmad-output/implementation-artifacts/1-7-frontend-shell-pwa-design-tokens-tailwind-shadcn-react-router-v7.md` — previous story implementation notes and extension points.
- Web research: Dexie 4 TypeScript docs (`https://dexie.org/docs/Typescript`), Dexie liveQuery docs (`https://dexie.org/docs/liveQuery()`).

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-11: Implemented Story 1.8 end-to-end following dev-story workflow.
- 2026-05-11: Required gates passed: `cd pos-web && npm run typecheck && npm run lint && npm test && npm run build`.
- 2026-05-11: Vitest result: 5 test files passed, 15 tests passed. Build completed with existing Vite chunk-size warning only.
- 2026-05-11: Addressed code-review patches: removed shared→features auth imports from `shared/lib/api-client.ts`, moved interceptor installation to app bootstrap via `features/auth/install-auth-interceptor.ts`, and updated exported `refresh()` to include `X-CSRF-Token` from `csrf_token` plus `withCredentials`.
- 2026-05-11: Review patch gates passed: `cd pos-web && npm run typecheck && npm run lint && npm test -- --run && npm run build`. Vitest result: 5 test files passed, 15 tests passed. Build completed with existing Vite chunk-size warning only.

### Completion Notes List

- Added Dexie 4 database foundation with typed `session`, `orders`, and `menu` tables; session uses single-row `id: 'current'` and stores access token metadata only.
- Added auth token-store helpers for JWT `exp` decoding, session save/read/clear, refreshed token persistence, role normalization, and no password persistence.
- Added auth API wrappers, Zustand session state, real accessible login form/page with RHF + Zod validation, sanitized Vietnamese error handling, role redirect, and loading state.
- Added axios auth interceptor for async IndexedDB Bearer attachment, expired-token event/redirect, one-time 401 refresh with CSRF cookie header, retry-on-success, refresh-failure cleanup, and network-error valid-session preservation.
- Added root `auth.expired` listener that clears Zustand session state and redirects to `/login` with Vietnamese user-facing message.
- Added Vitest coverage for token decoding/session helpers, login validation/submission/error mapping, interceptor auth/expiry/refresh/network paths, and localStorage/sessionStorage token setter regression.
- Resolved review finding: `shared/lib/api-client.ts` no longer imports `features/auth`; auth interceptor is installed once from app bootstrap through a feature-owned installer.
- Resolved review finding: exported `refresh()` now sends `withCredentials: true` and `X-CSRF-Token` read from cookie `csrf_token` when available.

### File List

- `_bmad-output/implementation-artifacts/1-8-frontend-auth-flow-login-page-token-storage-indexeddb-axios-interceptor.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/package.json`
- `pos-web/package-lock.json`
- `pos-web/src/App.test.tsx`
- `pos-web/src/db/dexie.ts`
- `pos-web/src/features/auth/api.ts`
- `pos-web/src/features/auth/interceptor.test.ts`
- `pos-web/src/features/auth/install-auth-interceptor.ts`
- `pos-web/src/features/auth/interceptor.ts`
- `pos-web/src/features/auth/session-store.ts`
- `pos-web/src/features/auth/storage-regression.test.ts`
- `pos-web/src/features/auth/token-store-types.ts`
- `pos-web/src/features/auth/token-store.test.ts`
- `pos-web/src/features/auth/token-store.ts`
- `pos-web/src/routes/_layout.tsx`
- `pos-web/src/routes/login/login-form.test.tsx`
- `pos-web/src/routes/login/login-form.tsx`
- `pos-web/src/routes/login/login-page.tsx`
- `pos-web/src/shared/lib/api-client.ts`

## Change Log

- 2026-05-11: Created ready-for-dev story with comprehensive frontend auth context, IndexedDB token-store guardrails, axios refresh/offline behavior, current Story 1.7 state, and validation checklist self-review.

- 2026-05-11: Implemented frontend auth flow, IndexedDB session persistence, axios auth/refresh interceptor, login UI, auth-expired integration, and required tests/gates; story moved to review.
- 2026-05-11: Addressed 2 code-review patch findings: fixed frontend layering by moving auth interceptor wiring out of shared API client, and added CSRF cookie header handling to exported refresh wrapper; required gates passed again.
