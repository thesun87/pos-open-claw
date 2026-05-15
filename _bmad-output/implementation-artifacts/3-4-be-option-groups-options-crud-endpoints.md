# Story 3.4: BE — Option Groups + Options CRUD Endpoints

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a backend developer,  
I want endpoints CRUD nhóm tùy chọn (`option_groups`) và tùy chọn (`options`) với validation `min_select ≤ max_select`, delta giá integer, và tự động bump `menu_version`,  
so that admin có thể quản lý "Size", "Đá", "Đường", "Topping" với quy tắc bắt buộc rõ ràng.

## Acceptance Criteria

1. Given schema `OptionGroup` và `Option` đã có từ Story 1.2 foundation, when developer review schema/migration, then xác nhận không cần migration mới cho CRUD logic hiện tại: `option_groups.min_select <= max_select`, `min_select >= 0`, `max_select >= 1`, `options.price_delta_vnd` integer cho phép âm/dương/0, và index `idx_options_option_group_id` đều đã tồn tại trong migration.
2. Given controller `src/menu/controllers/option-groups.controller.ts`, when triển khai, then expose routes dưới global prefix `/api/v1`: `GET /option-groups`, `POST /option-groups`, `PATCH /option-groups/:id`, `DELETE /option-groups/:id`.
3. Given role requirements, when request authenticated as `cashier`, then `GET /api/v1/option-groups` được phép để POS/admin FE đọc; POST/PATCH/DELETE trả 403 RFC 7807. Admin được phép mọi route.
4. Given `GET /api/v1/option-groups`, when called, then return list sorted `sortOrder asc, name asc`, each group includes nested `options` sorted `sortOrder asc, name asc`, with camelCase JSON fields `{ id, name, isRequired, minSelect, maxSelect, sortOrder, options: [{ id, label, priceDeltaVnd, isDefault, sortOrder }] }`. Internally Prisma field currently named `Option.name`; API must expose it as `label`.
5. Given `POST /api/v1/option-groups`, when body `{ name, isRequired, minSelect, maxSelect, sortOrder, options: [{ label, priceDeltaVnd, isDefault?, sortOrder }] }` is valid, then create group and all options atomically, assign UUID v7 IDs, set tenant/store from `TenantContext`, return 201 with created group + nested options, and bump `menu_version` in the same transaction.
6. Given `PATCH /api/v1/option-groups/:id`, when body includes group fields and a full `options` array, then update group and replace the complete options array atomically: update/insert/delete child options as needed by submitted IDs or, if implementation chooses simpler MVP behavior, delete old options and recreate only when safe; preserve tenant/store scope; return updated group + nested options; bump `menu_version` in the same transaction.
7. Given an existing option may be referenced by `order_item_options`, when replacing options during PATCH, then do **not** delete/recreate referenced option rows if that would break historical FK references. Prefer updating existing option rows by `id`, creating new rows without `id`, and deleting only removed options with zero historical references; if a removed option has historical references, mark `isActive=false` or return 409 with clear Problem Details rather than violating snapshot integrity.
8. Given `DELETE /api/v1/option-groups/:id`, when group is assigned to products via `product_option_groups`, then return 409 RFC 7807 `type=https://pos.example/errors/option-group-in-use`, title `Nhóm tùy chọn đang được dùng`, and detail containing product assignment count; do not delete and do not bump version.
9. Given `DELETE /api/v1/option-groups/:id`, when group is not assigned to products, then delete group/options safely in a transaction and bump `menu_version`; if any historical option FK prevents hard delete, preserve snapshot integrity by returning 409 or deactivating options according to repository design documented in code/tests.
10. Given validation rules, when invalid payload is submitted, then return 400 RFC 7807 via existing `ProblemDetailsFilter`; validation covers: `name` string 1-100 chars, `minSelect` integer ≥0, `maxSelect` integer ≥1, `minSelect ≤ maxSelect`, if `isRequired=true` then `minSelect ≥1`, create requires at least 1 option, option `label` string 1-100 chars, `priceDeltaVnd` integer allowing negative/zero/positive, `sortOrder` integer ≥0, and max one `isDefault=true` when `maxSelect=1`.
11. Given multi-tenant architecture, when any repository query runs, then it must be tenant/store scoped through existing `runWithTenantContext` + `tenantScopeExtension` patterns; never use unscoped raw SQL for business queries.
12. Given existing orders with `OrderItemOption.labelSnapshot` and `priceDeltaSnapshot`, when admin updates/deletes option groups/options, then old order snapshot fields remain unchanged; service must not update `OrderItemOption.*Snapshot` and tests verify unchanged snapshots after option group update.
13. Given menu sync depends on versioning, when any successful mutation happens (create/update/delete), then `MenuVersionService.bumpMenuVersion(tenantId, storeId, tx)` runs in the same Prisma transaction as the mutation; failed validation/409/404 must not bump.
14. Given backend-only story needs discoverable API, when implementation completes, then Swagger/OpenAPI includes request/response examples for create group with nested options, update group with nested options, min/max validation error, and delete-in-use 409.
15. Tests cover service/controller/repository behavior for CRUD happy paths, min>max validation, required group min rule, single-select multiple defaults validation, create requires options, negative `priceDeltaVnd`, delete-in-use 409, cashier/admin role behavior where practical, menu-version bump on successful mutations only, cross-tenant isolation, and snapshot immutability after update.
16. A seed-driven e2e test or demo script proves API contract can create/update Size/Đá/Đường/Topping style groups and observes `menu_version` increment after each successful mutation.

## Tasks / Subtasks

- [x] Add Option Groups DTOs and validation (AC: 5, 6, 10, 14)
  - [x] Create `pos-api/src/menu/dto/create-option-group.dto.ts`, `update-option-group.dto.ts`, and nested option DTO(s).
  - [x] Use `class-validator` decorators for primitive rules and custom validation for cross-field rules (`minSelect <= maxSelect`, required min, single-select max one default, at least one option on create).
  - [x] Map API child field `label` to Prisma `Option.name`; do not leak `name` for child options in public request/response contract.
  - [x] Add Swagger examples for success and validation errors.
- [x] Add Option Groups repository (AC: 4, 5, 6, 7, 8, 9, 11, 12)
  - [x] Create `pos-api/src/menu/repositories/option-groups.repository.ts` following `CategoriesRepository` patterns.
  - [x] Define `OptionGroupRecord` response shape with nested `options` and expose `label` in service/controller response mapping.
  - [x] Implement scoped `list`, `findById`, `createWithOptions`, `updateWithOptions`, `countProductAssignments`, `countHistoricalOptionReferences`, and `delete` helpers.
  - [x] Use UUID v7 for group/options IDs and include tenantId/storeId on both group and child options.
- [x] Add Option Groups service (AC: 5, 6, 7, 8, 9, 12, 13)
  - [x] Create `pos-api/src/menu/services/option-groups.service.ts` with Controller → Service → Repository layering.
  - [x] Wrap every mutation in `prisma.$transaction` and call `menuVersion.bumpMenuVersion()` inside that transaction only after successful mutation.
  - [x] Map duplicate/not-found/FK/business errors to Nest exceptions carrying `PROBLEM_TYPES` payloads.
  - [x] Ensure update/delete strategy never modifies historical `OrderItemOption.labelSnapshot` or `priceDeltaSnapshot`.
- [x] Add controller and module wiring (AC: 2, 3, 4, 14)
  - [x] Create `pos-api/src/menu/controllers/option-groups.controller.ts` using `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('cashier','admin')` for GET, `@Roles('admin')` for mutations.
  - [x] Add controller/provider/repository to `MenuModule` without breaking existing `MenuSyncController` and `CategoriesController`.
  - [x] Use `@HttpCode(204)` for delete success and path param `:id`.
- [x] Add Problem Details constants (AC: 8, 10)
  - [x] Extend `pos-api/src/common/errors/problem-types.ts` with `optionGroupInUse`, and if needed `optionGroupValidation`, `optionInUse`, `optionGroupNameConflict`.
  - [x] Keep content flowing through existing `ProblemDetailsFilter`; do not return ad-hoc `{ success, message }`.
- [x] Tests and demo (AC: 1, 3, 10, 12, 13, 15, 16)
  - [x] Add controller validation/role specs for valid/invalid DTOs and cashier/admin access expectations.
  - [x] Add service specs for transactions, menu-version bump, create/update/delete, not-found, delete-in-use 409, and no bump on failures.
  - [x] Add repository or integration/e2e coverage for nested options, product assignment count, historical option reference handling, and tenant scoping.
  - [x] Add seed-driven e2e test or script proving creation of Size/Đá/Đường/Topping style groups and menu_version increment.
  - [x] Run smallest meaningful gates before moving to review: targeted Jest for option-groups + existing menu/categories specs, and `npm run typecheck` in `pos-api` if available.

### Review Findings

- [x] [Review][Patch] Repository truy cập các relation model bị chặn, làm hỏng product assignment/historical reference checks [pos-api/src/menu/repositories/option-groups.repository.ts:167] — `countProductAssignments()` gọi `tenantScopedClient(...).productOptionGroup.count()` và `countHistoricalOptionReferences()` gọi `tenantScopedClient(...).orderItemOption.count()`, nhưng `ProductOptionGroup` và `OrderItemOption` nằm trong `BLOCKED_RELATION_MODELS` của tenant-scope extension. Các đường delete/update có check này sẽ ném `MissingTenantContextError` thay vì trả 409/tiếp tục mutation, vi phạm AC 7/8/9/11/12.
- [x] [Review][Patch] PATCH không thể gửi full replacement rỗng và không validate cross-field khi partial [pos-api/src/menu/dto/update-option-group.dto.ts:14] — `UpdateOptionGroupDto` override `options` với `@ArrayMinSize(1)`, nên admin không thể thay thế complete options array bằng `[]` để remove all children (trong khi AC 6/7 yêu cầu xử lý delete/update/insert child options). Vì dùng `PartialType(CreateOptionGroupDto)`, custom validator chạy với field thiếu có thể bỏ qua hoặc cho qua trạng thái không hợp lệ khi PATCH chỉ gửi `minSelect` hoặc `maxSelect`; service cũng không merge existing values trước khi validate, nên có thể tạo group vi phạm `minSelect <= maxSelect` hoặc required-min rule, dựa vào DB/thiếu rule thay vì trả 400 Problem Details theo AC 10.
- [x] [Review][Patch] Updating option id không tồn tại trong group vẫn bump menu_version và silently drops old options [pos-api/src/menu/repositories/option-groups.repository.ts:141] — `updateMany({ id: o.id, optionGroupId: id })` không kiểm tra `count`; nếu client gửi child `id` sai/thuộc group khác, update no-op, `submitted` vẫn loại option cũ khỏi delete path, response thiếu option đó nhưng service vẫn bump. Cần reject 400/404/409 hoặc treat as create without id; không được silently corrupt replacement semantics (AC 6/11/13).

## Dev Notes

### Current State / Files to Read First

- `pos-api/prisma/schema.prisma`: `OptionGroup`, `Option`, `ProductOptionGroup`, `OrderItemOption`, and `MenuVersion` already exist. `Option.name` is the DB/Prisma field that API must expose as option `label` for this story.
- `pos-api/prisma/migrations/20260510102734_init/migration.sql`: already has DB checks `chk_option_groups_min_max`, `chk_option_groups_min_select_nonnegative`, `chk_option_groups_max_select_positive` and index `idx_options_option_group_id`. This satisfies the no-new-migration expectation unless implementation discovers drift.
- `pos-api/src/menu/controllers/categories.controller.ts`, `services/categories.service.ts`, `repositories/categories.repository.ts`: authoritative pattern for this repo's menu CRUD: guards/roles, tenant context, transaction, repository isolation, Swagger examples, Problem Details payloads.
- `pos-api/src/menu/services/menu-version.service.ts`: reuse exactly; all menu mutations must call `bumpMenuVersion()` in the same transaction.
- `pos-api/src/menu/repositories/menu.repository.ts` and `pos-api/src/menu/menu.service.ts`: existing menu snapshot reads option groups/options. Keep response compatibility for `/api/v1/menu`; do not break POS menu cache.
- `pos-api/src/prisma/tenant-scope.extension.ts`: OptionGroup and Option are scoped models. ProductOptionGroup is a blocked relation model requiring scoped Product/OptionGroup repository access; do not bypass.
- `pos-api/src/common/errors/problem-types.ts`: currently has category problem types but not option-group-specific ones; extend it.
- `pos-api/src/orders/repositories/orders.repository.ts` and `pos-api/src/orders/orders.service.ts`: order sync writes immutable option snapshots. This story must not modify snapshot fields.

### Architecture / Library Guardrails

- Backend stack: NestJS 11, Prisma 7, PostgreSQL 16, class-validator/class-transformer, Swagger, Jest. Keep TypeScript strict and existing module/DI conventions.
- Required layering: Controller → Service → Repository → PrismaService. Controller must not call repository; repository must not contain business rules beyond DB-specific scoped queries/counts.
- API paths are kebab-case plural under global `/api/v1`; controller decorator should be `@Controller('option-groups')`.
- JSON fields are camelCase. Database remains snake_case through Prisma mapping.
- Multi-tenant scope is mandatory for all business DB access. Use `runWithTenantContext(context, () => tenantScopedClient(client)....)` pattern from `CategoriesRepository`.
- No `prisma.$queryRaw`/`$executeRaw` for this story unless there is no safe Prisma alternative and tenant/store scope is explicit and reviewed.
- UUIDs must use `uuidv7()` from `uuid`, matching existing repository code.
- Snapshot immutability is non-negotiable: never update `OrderItemOption.labelSnapshot` or `priceDeltaSnapshot`; avoid deleting referenced `Option` rows in ways that break historical order FK integrity.

### API Contract Details

- Request create/update option item shape: `{ id?: string, label: string, priceDeltaVnd: number, isDefault?: boolean, sortOrder: number }`.
- Response option item shape: `{ id, label, priceDeltaVnd, isDefault, sortOrder }`; `isActive` may be included internally or in response if needed for safe historical delete/update strategy, but avoid forcing FE story 3.5 to handle inactive options unless documented.
- Sorting should mirror menu snapshot patterns: groups `sortOrder asc, name asc`; options `sortOrder asc, name asc`.
- Suggested business conflict types:
  - `https://pos.example/errors/option-group-in-use` for product assignment delete block.
  - `https://pos.example/errors/option-in-use` if removing a historically referenced child option is blocked.
  - `https://pos.example/errors/validation` for cross-field validation failures if using BadRequestException payload.
- `PATCH` should be full replacement for child options as requested by epic, but safe with historical FK references. If payload option has `id`, update that row; if no `id`, create; if existing option omitted, delete only if no historical reference, otherwise deactivate or return 409. Document chosen behavior in service tests and Swagger description.

### Previous Story Intelligence

- Story 3.2 implemented Categories CRUD and established menu-version bumping pattern. Reuse the same transaction style and preserve category tests.
- Story 3.3 extended category backend DTOs with `isActive` while implementing FE categories. Current repo already contains those changes and commit `a17a48a feat: complete story 3-3 admin categories` is the most recent implementation baseline.
- Category review found bugs around validation coverage and disabled UI actions; for this BE story, proactively add controller DTO validation tests, not just service happy-path tests.
- Existing menu code reads option groups for POS already; CRUD must not rename internal Prisma fields or break `MenuService` DTOs used by FE POS stories.

### Testing Requirements

- Controller/DTO tests should prove cross-field validation rejects: `minSelect > maxSelect`, `maxSelect < 1`, `isRequired=true` with `minSelect=0`, create with empty options, single-select with two defaults, non-integer `priceDeltaVnd`, empty label/name.
- Service tests should assert `prisma.$transaction` is used and `menuVersion.bumpMenuVersion()` receives the transaction client.
- Delete-in-use test should mock `product_option_groups` count >0 and assert 409 type `option-group-in-use` and no bump.
- Snapshot immutability test can create/mock an existing `OrderItemOption` snapshot, update option label/delta, then assert snapshot fields unchanged. Prefer integration/e2e if practical; otherwise service/repository test with explicit assertion that no order item option update method is called.
- Cross-tenant isolation should follow existing repository/Prisma extension testing style; do not use unscoped relation operations for `ProductOptionGroup`.
- Run targeted commands from `pos-api`, for example `npm test -- option-groups` plus existing menu/category tests and typecheck. If exact scripts differ, inspect `pos-api/package.json` first.

### Project Structure Notes

Expected new/updated files:

- `pos-api/src/menu/controllers/option-groups.controller.ts`
- `pos-api/src/menu/controllers/option-groups.controller.spec.ts`
- `pos-api/src/menu/dto/create-option-group.dto.ts`
- `pos-api/src/menu/dto/update-option-group.dto.ts`
- `pos-api/src/menu/repositories/option-groups.repository.ts`
- `pos-api/src/menu/services/option-groups.service.ts`
- `pos-api/src/menu/services/option-groups.service.spec.ts`
- `pos-api/src/menu/menu.module.ts`
- `pos-api/src/common/errors/problem-types.ts`
- optional e2e/demo: `pos-api/test/option-groups.e2e-spec.ts` or a documented script under the existing test/demo convention

### References

- Story requirements: `_bmad-output/planning-artifacts/epics.md#Story 3.4`
- Epic 3 dependencies: `_bmad-output/planning-artifacts/epics.md#Epic 3`
- API and structure: `_bmad-output/planning-artifacts/architecture.md#API Surface`, `#Unified Project Structure`
- Project context rules: `_bmad-output/project-context.md`
- Existing backend CRUD baseline: `pos-api/src/menu/controllers/categories.controller.ts`, `pos-api/src/menu/services/categories.service.ts`, `pos-api/src/menu/repositories/categories.repository.ts`
- Schema/migration source of truth: `pos-api/prisma/schema.prisma`, `pos-api/prisma/migrations/20260510102734_init/migration.sql`

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-15: Implemented option-groups DTO/repository/service/controller and module wiring.
- 2026-05-15: Verified initial migration already contains option group min/max checks and `idx_options_option_group_id`; no new migration required.
- 2026-05-15: Ran targeted and full backend gates successfully.
- 2026-05-15: Addressed code-review follow-ups for tenant-safe relation counts, PATCH resulting-state validation, empty option replacement, and wrong child option id rejection.
- 2026-05-15: Re-ran targeted option-groups tests, full Jest suite, and typecheck successfully.

### Completion Notes List

- Added `/api/v1/option-groups` CRUD with cashier/admin GET access and admin-only mutations.
- Added nested option DTO validation, including min/max cross-field rules, required minimum rule, create options requirement, integer VND deltas including negative values, and single-select default constraint.
- Added tenant-scoped repository/service implementation with UUID v7 IDs, `Option.name` ⇄ API `label` mapping, sorted nested list responses, transaction-wrapped mutations, and menu-version bumping only on successful mutations.
- Delete/update paths block unsafe removal when product assignments or historical order option references exist, preserving snapshot immutability.
- Added Swagger examples and HTTP demo contract for Size/Đá/Đường/Topping groups.
- ✅ Resolved review finding [Patch]: relation counts now use scoped Product/Option queries instead of blocked relation models.
- ✅ Resolved review finding [Patch]: PATCH permits `options: []` and validates merged resulting group state before mutation.
- ✅ Resolved review finding [Patch]: child option updates reject ids outside the scoped group and do not bump `menu_version`; tests cover wrong id, empty replacement, and partial min/max/required updates.

### File List

- `_bmad-output/implementation-artifacts/3-4-be-option-groups-options-crud-endpoints.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-api/src/common/errors/problem-types.ts`
- `pos-api/src/menu/controllers/option-groups.controller.ts`
- `pos-api/src/menu/controllers/option-groups.controller.spec.ts`
- `pos-api/src/menu/dto/create-option-group.dto.ts`
- `pos-api/src/menu/dto/update-option-group.dto.ts`
- `pos-api/src/menu/menu.module.ts`
- `pos-api/src/menu/repositories/option-groups.repository.ts`
- `pos-api/src/menu/services/option-groups.service.ts`
- `pos-api/src/menu/services/option-groups.service.spec.ts`
- `pos-api/test/option-groups-contract-demo.http`

### Change Log

- 2026-05-15: Story context created and marked ready-for-dev.
- 2026-05-15: Implemented option-groups/options CRUD endpoints and marked ready for review.
- 2026-05-15: Addressed code review findings - 3 items resolved.
