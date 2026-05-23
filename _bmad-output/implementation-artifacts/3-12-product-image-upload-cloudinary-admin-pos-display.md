# Story 3.12: Product Image Upload via Cloudinary + Admin/POS Display

Status: done

## Story

As an admin,  
I want to upload optional product images and have them shown on the POS menu,  
so that cashiers can identify products visually while products without images keep the current placeholder UI.

## Acceptance Criteria

1. Given pos-api product model/API responses, when products are listed/read/created/updated, then `imageUrl` is included as optional nullable/string field without breaking existing clients.
2. Given Cloudinary configuration exists (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, optional upload folder), when admin uploads a supported image, then pos-api uploads it to Cloudinary using the signed Image Upload API/server SDK pattern from https://cloudinary.com/documentation/image_upload_api_reference and returns the secure URL plus public id metadata if useful.
3. Given configuration is missing or Cloudinary rejects upload, when admin uploads an image, then pos-api returns safe RFC 7807/problem-style errors without leaking secrets.
4. Given an authenticated admin, when calling the new upload API (for example `POST /api/v1/products/images` with multipart `file` or equivalent), then only admin can upload; cashier/unauthenticated requests are forbidden/unauthorized.
5. Given an uploaded image URL, when creating or editing a product, then admin can set/replace `imageUrl`; image is optional and products can be saved with no image.
6. Given product mutation changes `imageUrl`, then menu version is bumped consistently with other product mutations so POS menu sync receives updates.
7. Given admin product create/edit UI, when user selects an image, then it uploads via pos-api and shows preview; save payload includes `imageUrl`; removing/skipping image is supported.
8. Given admin product table/list, when product has image, then a small preview/thumbnail is shown where practical without breaking existing columns/actions.
9. Given POS menu data, when products sync/load, then `MenuProductRecord` includes optional `imageUrl` and IndexedDB/cache schema handles it safely.
10. Given POS product tile, when product has `imageUrl`, then show the image in the existing card-image area with accessible alt text and maintain current overlay/name/price styling; when missing or image fails, keep the existing initials placeholder UI.
11. Tests cover backend upload authorization/config/error behavior, product API `imageUrl` create/update/list/menu responses, frontend admin upload optional create/edit flow, POS tile image/fallback rendering, and menu cache compatibility.

## Tasks / Subtasks

- [x] Backend: Cloudinary upload support (AC: 2, 3, 4)
  - [x] Add Cloudinary dependency/config/service using signed server-side upload; never expose API secret to frontend.
  - [x] Add admin-only image upload endpoint accepting image multipart upload with size/type validation.
  - [x] Return safe response `{ imageUrl, publicId? }` and map Cloudinary/config failures to safe errors.
- [x] Backend: product `imageUrl` API support (AC: 1, 5, 6, 9)
  - [x] Verify Prisma `Product.imageUrl` exists; add migration only if real schema lacks it.
  - [x] Include `imageUrl` in product repository response mapping for list/create/update and menu sync responses.
  - [x] Add validation for optional URL/string on create/update DTOs.
  - [x] Ensure product mutations with imageUrl bump menu version.
- [x] Admin frontend upload UX (AC: 7, 8)
  - [x] Add API client helper for product image upload using `FormData`.
  - [x] Extend `ProductDto`/mutation types with optional `imageUrl`.
  - [x] Extend `ProductForm` create/edit with optional file input/upload button, preview, remove/clear behavior, and save payload support.
  - [x] Add thumbnail/preview in Products admin table where practical.
- [x] POS menu image display (AC: 9, 10)
  - [x] Extend menu API/client/IndexedDB schema/type `MenuProductRecord` with optional `imageUrl`.
  - [x] Update product tile to render image when present and fallback to existing initials placeholder when absent or image load fails.
- [x] Tests and gates (AC: 11)
  - [x] Add/extend backend unit/e2e tests for upload endpoint, product imageUrl persistence/responses, auth, and error handling.
  - [x] Add/extend frontend tests for admin upload optional create/edit and POS tile image/fallback rendering.
  - [x] Run targeted pos-api and pos-web tests/typecheck/lint as available and document results.

## Dev Notes

- Existing Story 3.6 explicitly noted `Product.description` and `imageUrl` exist in schema but were not exposed in MVP. This story exposes `imageUrl` only; do not introduce unrelated description editing unless needed.
- Existing Story 2.15 POS tile currently renders initials placeholder because `MenuProductRecord` has no image URL. Preserve that fallback exactly for products without images.
- Cloudinary docs reference: https://cloudinary.com/documentation/image_upload_api_reference. Use server-side signed upload or official Node SDK. Avoid unsigned client-side upload unless product owner explicitly chooses an upload preset approach.
- Do not store Cloudinary secrets in frontend. Environment variables belong in pos-api runtime config and docs/env examples only.
- Product images are optional. Existing products and demo seeds without images must continue working.

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-05-23 | 1.0 | Initial story for optional product image upload via Cloudinary and POS/admin display. | Bmad |
| 2026-05-23 | 1.1 | Implemented Cloudinary upload endpoint, imageUrl product/menu sync support, admin upload preview/table thumbnail, and POS tile display. | Bmad |
