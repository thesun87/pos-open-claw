# Deferred Work

## Deferred from: code review of 6-2-be-areas-crud-endpoints (2026-05-25)

- Empty PATCH body trả HTTP 409 thay vì 400 — `ConflictException` trong `AreasService.update()` và `CategoriesService.update()` khi body rỗng nên là `BadRequestException` (400). Pre-existing pattern từ story 3.2 (`CategoriesService`). Cần refactor cả 2 service nếu muốn đúng spec HTTP.
- Repository `delete()` có redundant `findFirst` trong transaction — `AreasRepository.delete()` và `CategoriesRepository.delete()` tự check existence lại dù service đã check trước đó. Extra round-trip không gây bug; có thể simplify sau khi coverage test đảm bảo.
