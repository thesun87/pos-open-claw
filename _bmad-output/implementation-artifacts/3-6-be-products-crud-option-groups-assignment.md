# Story 3.6: BE — Products CRUD + Option Groups Assignment

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a backend developer,  
I want endpoints CRUD products với assignment many-to-many với option groups, isActive toggle, và sortOrder,  
so that admin tạo/sửa sản phẩm với đầy đủ thuộc tính cho POS hiển thị đúng.

## Acceptance Criteria

1. Given schema `Product` và join `ProductOptionGroup` đã có từ Story 1.2 foundation, when developer review schema/migration, then xác nhận indexes `idx_products_category_id`, `idx_products_is_active`, PK composite `(productId, optionGroupId)` đều có và không cần migration mới cho CRUD logic hiện tại.
2. Given controller `src/menu/controllers/products.controller.ts`, when triển khai, then expose routes dưới global prefix `/api/v1`: `GET /products?categoryId=&search=&isActive=`, `POST /products`, `PATCH /products/:id`, `PATCH /products/:id/toggle-active`, `DELETE /products/:id`.
3. Given role requirements, when request authenticated as `cashier`, then `GET /api/v1/products` được phép để POS/admin FE đọc nếu cần; POST/PATCH/DELETE/toggle trả 403 RFC 7807. Admin được phép mọi route.
4. Given `GET /api/v1/products`, when called with optional filters, then return list sorted `sortOrder asc, name asc`, filtered by `categoryId`, case-insensitive partial `search` on name, and `isActive` boolean when provided; each item includes `{ id, name, categoryId, category: { id, name }, priceVnd, isActive, sortOrder, optionGroupIds, optionGroups }` where assignments are sorted by join `sortOrder asc`, option group `sortOrder asc`, `name asc`.
5. Given `POST /api/v1/products`, when body `{ name, categoryId, priceVnd, isActive, sortOrder, optionGroupIds: [] }` is valid, then create product and join rows atomically, assign UUID v7 product ID, set tenant/store from `TenantContext`, return 201 with created product and assignments, and bump `menu_version` in the same transaction.
6. Given `PATCH /api/v1/products/:id`, when body includes product fields and optionally `optionGroupIds`, then partial-update product fields; if `optionGroupIds` is provided, replace assignment set atomically; if omitted, preserve existing assignments; return updated product and bump `menu_version` in the same transaction.
7. Given `PATCH /api/v1/products/:id/toggle-active`, when called by admin, then flip `isActive` or set it from payload `{ isActive: boolean }` (choose one contract and document in Swagger/tests), return updated product, and bump `menu_version` in the same transaction.
8. Given validation, when test edge cases, then reject invalid payloads with 400 RFC 7807 via `ProblemDetailsFilter`: `name` 1-200 chars, `priceVnd` integer ≥0, `sortOrder` integer ≥0, `categoryId` UUID exists in same tenant/store, every `optionGroupIds[]` UUID exists in same tenant/store, and duplicate optionGroupIds are rejected or de-duplicated deterministically with tests.
9. Given `DELETE /api/v1/products/:id`, when product has `order_items` historical references, then return 409 RFC 7807 (`type=https://pos.example/errors/product-in-use` recommended) with Vietnamese title/detail instructing admin to use `isActive=false` instead; do not delete and do not bump version.
10. Given `DELETE /api/v1/products/:id`, when product has no historical `order_items`, then delete join rows then product safely in one transaction and bump `menu_version`; if FK constraint blocks delete, map to 409 Problem Details rather than leaking raw Prisma error.
11. Given soft-delete vs hard-delete decision, when implementing, then keep hard delete per AR25/no soft delete; use `isActive=false` as the business “Tạm tắt” path and include Swagger/example microcopy guidance “Tắt thay vì xóa nếu sẽ bán lại”.
12. Given old orders contain `OrderItem.productNameSnapshot` and `unitPriceSnapshot`, when product name/price/status/assignment changes or product delete is attempted, then order snapshots remain unchanged; service must not update any `*Snapshot` field.
13. Given menu sync depends on versioning, when any successful mutation happens (create/update/toggle/delete), then `MenuVersionService.bumpMenuVersion(tenantId, storeId, tx)` runs in the same Prisma transaction as the mutation; failed validation/403/404/409 must not bump.
14. Given backend-only story needs discoverable API, when implementation completes, then Swagger/OpenAPI includes request/response examples for create product, assign option groups, filter/search, toggle active, and delete blocked by historical orders.
15. Tests cover controller/DTO/service/repository behavior for CRUD happy paths, assign/unassign option groups, toggle active, filter by category/search/active, cross-tenant isolation, not-found, category/option-group foreign tenant rejection, product-in-use delete 409, relation-model access safety under tenant scope, and menu-version bump only on successful mutations.
16. A seed-driven e2e test or demo script proves API contract can create a product with Size/Topping option groups and observes `menu_version` increment after create/update/toggle/delete-success paths.

## Tasks / Subtasks

- [x] Verify schema and migration assumptions (AC: 1, 11, 12)
  - [x] Inspect `pos-api/prisma/schema.prisma` and initial migration for `Product`, `ProductOptionGroup`, `OrderItem`, indexes, and FK delete behavior.
  - [x] Confirm no migration is needed; if drift is found, document before adding migration.
  - [x] Confirm snapshot fields `OrderItem.productNameSnapshot` and `unitPriceSnapshot` are never updated by menu code.
- [x] Add Products DTOs and validation (AC: 2, 5, 6, 7, 8, 14)
  - [x] Create `pos-api/src/menu/dto/create-product.dto.ts`, `update-product.dto.ts`, and toggle DTO if using payload-driven toggle.
  - [x] Use `class-validator`/`class-transformer` for primitive rules: strings, integers, booleans, UUID arrays, optional query filters.
  - [x] Add custom or service-level validation for resulting-state PATCH, duplicate optionGroupIds policy, same-tenant category existence, and same-tenant option group existence.
  - [x] Add Swagger examples for create, assign groups, filters, toggle, validation error, and delete-in-use 409.
- [x] Add Products repository (AC: 4, 5, 6, 8, 9, 10, 12)
  - [x] Create `pos-api/src/menu/repositories/products.repository.ts` following `CategoriesRepository` and `OptionGroupsRepository` patterns.
  - [x] Define `ProductRecord` response shape with category and option group assignment summary; keep API fields camelCase.
  - [x] Implement scoped `list`, `findById`, `createWithAssignments`, `updateWithAssignments`, `replaceAssignments`, `toggleActive`, `delete`, `countHistoricalOrderItems`, `categoryExists`, and `optionGroupsExist` helpers as needed.
  - [x] Avoid direct `tenantScopedClient(...).productOptionGroup` / `orderItem` access because these relation models are blocked by the tenant-scope extension; use nested writes/reads through scoped `Product` or explicitly scoped unextended transaction client operations with tenant-proven parent checks.
  - [x] Use UUID v7 for product IDs and set tenantId/storeId from `TenantContext`; never accept tenant/store from request body.
- [x] Add Products service (AC: 5, 6, 7, 8, 9, 10, 12, 13)
  - [x] Create `pos-api/src/menu/services/products.service.ts` with Controller → Service → Repository layering.
  - [x] Wrap every mutation in `prisma.$transaction` and call `menuVersion.bumpMenuVersion()` inside that transaction only after successful mutation.
  - [x] Validate category and option group IDs within same tenant/store before writes; return 400/404 Problem Details with stable type rather than raw Prisma errors.
  - [x] Block delete when historical `OrderItem` references exist; prefer returning 409 and guiding “Tạm tắt” rather than breaking FK/snapshot integrity.
- [x] Add controller and module wiring (AC: 2, 3, 4, 7, 14)
  - [x] Create `pos-api/src/menu/controllers/products.controller.ts` using `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('cashier','admin')` for GET, `@Roles('admin')` for mutations.
  - [x] Add controller/provider/repository to `MenuModule` without breaking `MenuSyncController`, `CategoriesController`, and `OptionGroupsController`.
  - [x] Use `@HttpCode(204)` for delete success and path param `:id`.
- [x] Add Problem Details constants (AC: 8, 9, 10)
  - [x] Extend `pos-api/src/common/errors/problem-types.ts` with `productInUse` and optionally product-specific validation/name conflict types if used.
  - [x] Keep all errors flowing through existing `ProblemDetailsFilter`; do not return ad-hoc `{ success, message }`.
- [x] Tests and demo (AC: 3, 4, 8, 12, 13, 15, 16)
  - [x] Add controller/DTO specs for valid/invalid body/query filters and cashier/admin access expectations.
  - [x] Add service specs for transaction usage, menu-version bump, create/update/toggle/delete, not-found, invalid category/group IDs, delete-in-use 409, and no bump on failures.
  - [x] Add repository/integration coverage for assignment replacement, list sorting/filtering, historical order reference count, and tenant scoping.
  - [x] Add seed-driven e2e or `.http` demo proving product creation with option groups and menu_version increments.
  - [x] Run smallest meaningful gates before moving to review: targeted Jest for products + existing menu/category/option-groups specs, and `npm run typecheck` in `pos-api` if available.

## Dev Notes

### Current State / Files to Read First

- `pos-api/prisma/schema.prisma`: `Product`, `ProductOptionGroup`, `Category`, `OptionGroup`, `OrderItem`, and `MenuVersion` already exist. `ProductOptionGroup` uses composite PK `(productId, optionGroupId)` and has `sortOrder`; `OrderItem.productId` is a restrictive FK, so deletes with historical orders are expected to be blocked.
- `pos-api/src/menu/controllers/categories.controller.ts`, `services/categories.service.ts`, `repositories/categories.repository.ts`: baseline CRUD pattern for guards/roles, `TenantContext`, scoped repository access, transaction-wrapped mutations, Swagger examples, and Problem Details payloads.
- `pos-api/src/menu/controllers/option-groups.controller.ts`, `services/option-groups.service.ts`, `repositories/option-groups.repository.ts`: latest backend CRUD pattern for nested/assignment-adjacent menu resources, UUID v7 creation, menu-version bumping, relation-count safety, and historical FK protection.
- `pos-api/src/menu/services/menu-version.service.ts`: reuse exactly; all product mutations must call `bumpMenuVersion()` in the same transaction.
- `pos-api/src/menu/repositories/menu.repository.ts` and `pos-api/src/menu/menu.service.ts`: existing POS menu snapshot already reads products and `productOptionGroups`. Product CRUD must preserve response compatibility for `/api/v1/menu` because POS cache and future menu sync depend on it.
- `pos-api/src/prisma/tenant-scope.extension.ts`: Product, Category, OptionGroup are scoped models. `ProductOptionGroup`, `OrderItem`, and `OrderItemOption` are blocked relation models under the extension; direct extended-client access will throw `MissingTenantContextError`. Follow Story 3.4’s resolved pattern and query through scoped parent models or explicitly scoped safe transaction-client operations after tenant-proven parent checks, never unscoped raw relation access.
- `pos-api/src/common/errors/problem-types.ts`: already has category and option-group problem types; add product-specific types here.
- `pos-api/src/orders/repositories/orders.repository.ts` and `pos-api/src/orders/orders.service.ts`: order sync writes immutable product snapshots. Product CRUD must not mutate these snapshots.

### Existing Code Behaviors to Preserve

- `MenuService.getMenuSnapshot()` returns products as `{ id, name, categoryId, priceVnd, isActive, sortOrder, optionGroupIds }`; changing this shape will break POS menu cache and Story 3.8/3.9 assumptions.
- `MenuRepository.findProducts()` sorts products by `sortOrder asc, name asc` and joins option groups sorted by join order, option group sort order, then name. Keep this ordering for products CRUD list unless the story explicitly documents a separate admin ordering.
- Categories delete currently blocks products via `countProducts`; do not create product code that bypasses category FK assumptions or allows cross-tenant category assignment.
- Option Groups delete currently blocks assigned products via scoped product count; assignment replacement must keep that count accurate by writing `product_option_groups` consistently.
- All existing menu mutation failures should leave `menu_version` unchanged. Product code must follow the same transaction/no-bump-on-failure rule.

### Architecture / Library Guardrails

- Backend stack: NestJS 11, Prisma 7, PostgreSQL 16, class-validator/class-transformer, Swagger, Jest. Keep TypeScript strict and existing module/DI conventions.
- Required layering: Controller → Service → Repository → PrismaService. Controller must not call repository; repository should not own business policy beyond DB-specific scoped queries/counts.
- API paths are kebab-case plural under global `/api/v1`; controller decorator should be `@Controller('products')`.
- Query param naming in architecture says snake_case, but epic explicitly names `categoryId` and `isActive`. For consistency with existing camelCase API fields and FE stories, implement the epic contract unless architecture has since been updated; document the choice in Swagger/tests.
- JSON fields are camelCase. Database remains snake_case through Prisma mapping.
- Multi-tenant scope is mandatory for all business DB access. Use `runWithTenantContext(context, () => tenantScopedClient(client)....)` for scoped models. For blocked relation models (`ProductOptionGroup`, `OrderItem`), do not call them through `tenantScopedClient`; instead perform nested writes via scoped `product.update/create` where possible, or validate scoped product existence first and use the transaction client with explicit parent IDs.
- No `prisma.$queryRaw`/`$executeRaw` for this story unless there is no safe Prisma alternative and tenant/store scope is explicit and reviewed.
- UUIDs must use `uuidv7()` from `uuid`, matching existing repository code.
- VND money is integer đồng; no floats/cents conversion.
- Snapshot immutability is non-negotiable: never update `OrderItem.productNameSnapshot`, `unitPriceSnapshot`, or option snapshot fields from product CRUD.

### API Contract Details

- Create body: `{ name: string, categoryId: string, priceVnd: number, isActive?: boolean, sortOrder: number, optionGroupIds?: string[] }`. Default `isActive=true`; default `optionGroupIds=[]` if omitted.
- Update body: partial product fields; `optionGroupIds` means replace assignments only when property is present. Empty array means unassign all option groups. Missing property means preserve assignments.
- Toggle contract recommendation: accept body `{ isActive: boolean }` for deterministic UI switches rather than implicit flip, but if implementing implicit flip, tests and Swagger must clearly document it.
- Response product item should include at minimum the fields Story 3.7 FE needs: `{ id, name, categoryId, category: { id, name }, priceVnd, isActive, sortOrder, optionGroupIds, optionGroups: [{ id, name, isRequired, minSelect, maxSelect, sortOrder }] }`.
- Delete success returns 204. Delete blocked by historical order items returns 409 with detail count and guidance to “Tạm tắt” product instead.
- Suggested business conflict type: `https://pos.example/errors/product-in-use`.

### Previous Story Intelligence

- Story 3.2 implemented Categories CRUD and established centralized `MenuVersionService` bumping pattern.
- Story 3.4 implemented Option Groups CRUD and fixed important review issues: avoid blocked relation-model access, validate PATCH against merged resulting state, reject wrong child IDs without bumping `menu_version`, and protect historical option references.
- Story 3.5 completed FE option groups admin. It relies on Story 3.4 API contract and uses `label` for child options. Product FE Story 3.7 will similarly expect stable, FE-friendly products responses and Problem Details for conflicts.
- Recent commits: `1973beb feat: complete story 3-5 option groups admin`, `0b3f6a3 feat(pos-api): implement option groups CRUD`, `a17a48a feat: complete story 3-3 admin categories`, `d539897 feat(pos-api): implement categories CRUD`, `00fd18d feat(pos-web): add admin layout foundation`.

### Testing Requirements

- Controller/DTO tests should prove validation rejects empty/too-long name, negative/non-integer price, negative/non-integer sortOrder, invalid UUID categoryId/optionGroupIds, invalid boolean query, and duplicate option groups if rejecting duplicates.
- Service tests should assert `prisma.$transaction` is used and `menuVersion.bumpMenuVersion()` receives the transaction client after successful create/update/toggle/delete only.
- Repository/integration tests should cover `GET /products` filters: by category, case-insensitive search, `isActive=true/false`, and combined filters.
- Assignment tests should cover create with multiple option groups, update preserving assignments when omitted, update replacing assignments when provided, update with empty array unassigning all, cross-tenant option group rejection, and no `MissingTenantContextError` from blocked relation-model access.
- Delete-in-use test should mock or create `OrderItem` references and assert 409 `product-in-use`, no delete, and no menu-version bump.
- Snapshot immutability test can create/mock existing `OrderItem.productNameSnapshot` and `unitPriceSnapshot`, update product name/price, then assert snapshots unchanged. Prefer integration/e2e if practical; otherwise service/repository test with explicit assertion that no order item update method is called.
- Run targeted commands from `pos-api`, for example `npm test -- products` plus existing `option-groups`, `categories`, `menu` tests and `npm run typecheck`. Inspect `pos-api/package.json` first for exact scripts.

### Project Structure Notes

Expected new/updated files:

- `pos-api/src/menu/controllers/products.controller.ts`
- `pos-api/src/menu/controllers/products.controller.spec.ts`
- `pos-api/src/menu/dto/create-product.dto.ts`
- `pos-api/src/menu/dto/update-product.dto.ts`
- `pos-api/src/menu/dto/list-products-query.dto.ts` (optional but recommended)
- `pos-api/src/menu/dto/toggle-product-active.dto.ts` (if payload-driven toggle)
- `pos-api/src/menu/repositories/products.repository.ts`
- `pos-api/src/menu/repositories/products.repository.spec.ts`
- `pos-api/src/menu/services/products.service.ts`
- `pos-api/src/menu/services/products.service.spec.ts`
- `pos-api/src/menu/menu.module.ts`
- `pos-api/src/common/errors/problem-types.ts`
- optional e2e/demo: `pos-api/test/products.e2e-spec.ts` or `pos-api/test/products-contract-demo.http`

Detected constraints/conflicts:

- Architecture says query params should be snake_case, while epic and FE story use `categoryId`/`isActive`. Use the epic/FE contract for MVP consistency unless product owner changes it; document in tests and Swagger.
- `Product.description` and `imageUrl` exist in schema but are not part of Story 3.6/3.7 MVP fields. Do not expose/edit them unless a later story asks.
- Hard delete is allowed only when no historical `OrderItem` references exist. Because schema uses restrictive FK, service should proactively count and return friendly 409 rather than letting Prisma leak P2003.
- `ProductOptionGroup.sortOrder` exists but story payload only provides `optionGroupIds`. Assign join `sortOrder` deterministically from submitted array order (e.g., `(index + 1) * 10`) or option group sort order; document chosen behavior in tests.

### References

- Story requirements: `_bmad-output/planning-artifacts/epics.md#Story 3.6`
- Epic 3 context and dependencies: `_bmad-output/planning-artifacts/epics.md#Epic 3`
- Architecture API/data decisions: `_bmad-output/planning-artifacts/architecture.md#API & Mẫu Giao tiếp`, `_bmad-output/planning-artifacts/architecture.md#Kiến trúc Dữ liệu`
- Project guardrails: `_bmad-output/project-context.md#2-Quy-tắc-Bắt-buộc-Thi-hành`, `_bmad-output/project-context.md#3-Naming-Convention`, `_bmad-output/project-context.md#4-Cấu-trúc-Module`
- Existing backend CRUD baselines: `pos-api/src/menu/controllers/categories.controller.ts`, `pos-api/src/menu/services/categories.service.ts`, `pos-api/src/menu/repositories/categories.repository.ts`
- Existing option-group backend baseline: `pos-api/src/menu/controllers/option-groups.controller.ts`, `pos-api/src/menu/services/option-groups.service.ts`, `pos-api/src/menu/repositories/option-groups.repository.ts`
- Existing menu snapshot contract: `pos-api/src/menu/menu.service.ts`, `pos-api/src/menu/repositories/menu.repository.ts`
- Schema source of truth: `pos-api/prisma/schema.prisma`
- Previous story context: `_bmad-output/implementation-artifacts/3-4-be-option-groups-options-crud-endpoints.md`, `_bmad-output/implementation-artifacts/3-5-fe-option-groups-admin-page-crud-inline-options-min-max.md`

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-16: First dev-story attempt only moved sprint status to in-progress; retry implemented backend products CRUD.
- 2026-05-16: Fixed TypeScript `readonly` Prisma select/orderBy issue in `products.repository.ts` after targeted tests passed but typecheck failed.
- 2026-05-16: Gates run from `pos-api`: `npm run typecheck` ✅; `npm test -- products --runInBand` ✅ 3 suites / 24 tests; `npm test -- menu categories option-groups products --runInBand` ✅ 11 suites / 61 tests.
- 2026-05-16: Review repair added repository/integration-style ProductsRepository coverage for AC15 gap; reran required gates successfully.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented backend Products CRUD under `/api/v1/products` with cashier/admin GET, admin-only mutations, payload-driven active toggle, many-to-many option group assignment replacement, deterministic join `sortOrder` from submitted array order, and menu-version bumps inside mutation transactions.
- Verified schema already contains `idx_products_category_id`, `idx_products_is_active`, `@@id([productId, optionGroupId])`; no migration required.
- Delete now blocks products with historical `orderItems` via `product-in-use` Problem Details and Vietnamese guidance to “Tạm tắt” with `isActive=false`; product CRUD does not update order snapshot fields.
- Added controller/service tests and seed-driven `.http` demo for create/update/toggle/delete-success and delete-in-use contract; existing menu/category/option-group regressions pass.
- ✅ Resolved review finding [Medium]: Added ProductsRepository repository/integration-style coverage for list sorting/filtering, assignment ordering/replacement, omitted-vs-empty assignment updates, cross-tenant non-match validation helpers, delete-in-use count support, and blocked relation-model access safety.

### File List

- `_bmad-output/implementation-artifacts/3-6-be-products-crud-option-groups-assignment.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-api/src/common/errors/problem-types.ts`
- `pos-api/src/menu/controllers/products.controller.ts`
- `pos-api/src/menu/controllers/products.controller.spec.ts`
- `pos-api/src/menu/dto/create-product.dto.ts`
- `pos-api/src/menu/dto/update-product.dto.ts`
- `pos-api/src/menu/dto/list-products-query.dto.ts`
- `pos-api/src/menu/dto/toggle-product-active.dto.ts`
- `pos-api/src/menu/repositories/products.repository.ts`
- `pos-api/src/menu/repositories/products.repository.spec.ts`
- `pos-api/src/menu/services/products.service.ts`
- `pos-api/src/menu/services/products.service.spec.ts`
- `pos-api/src/menu/menu.module.ts`
- `pos-api/test/products-contract-demo.http`

### Change Log

- 2026-05-16: Story context created and marked ready-for-dev.
- 2026-05-16: Implemented Products CRUD backend, option group assignments, validation, tests/demo, and marked ready-for-review after passing gates.
- 2026-05-16: Addressed code review coverage gap by adding ProductsRepository repository/integration-style tests; story returned to review.
