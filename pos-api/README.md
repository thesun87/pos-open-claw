# pos-api

Backend API cho Café POS MVP, dùng NestJS + TypeScript strict.

## Yêu cầu

- Node.js >=20
- npm
- Docker Desktop hoặc Docker Engine với Compose v2

## Cài đặt

```bash
npm install
cp .env.example .env
```

Không commit file `.env` thật.

## Commands

```bash
npm run dev
npm run start:dev
npm run build
npm test
npm run lint
npm run typecheck
npm run prisma:validate
npm run prisma:format
npm run prisma:generate
npm run migrate:dev -- --name init
```

## PostgreSQL local

Chạy PostgreSQL 16 cho môi trường dev:

```bash
docker compose up -d
docker compose ps
```

Compose tạo database `pos_dev` với user/password dev local theo `.env.example`:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_dev?schema=public"
```

Dữ liệu được lưu trong named volume `pos_api_postgres_data`.

## Prisma

Schema nguồn nằm ở `prisma/schema.prisma`; migration đầu tiên nằm trong `prisma/migrations/` và phải được commit.

Luồng local thường dùng:

```bash
cp .env.example .env
docker compose up -d
npx prisma migrate dev --name init
npx prisma generate
npx prisma validate
```

Dự án dùng UUID v7 theo kiến trúc, nhưng Prisma `uuid()` sinh UUID v4. Vì vậy các cột UUID trong schema **không đặt default `uuid()`**; seed/application layer ở các story sau phải tự truyền UUID v7 khi tạo bản ghi.

## Dev server

- Port mặc định: `3000`
- Entry point: `src/main.ts`

## Biến môi trường tối thiểu

Sao chép `.env.example` thành `.env` khi chạy local và thay placeholder bằng giá trị thật:

- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `CSRF_SECRET`
- `NODE_ENV`

## Ghi chú bảo mật & hygiene

- Không commit file `.env` thật.
- Không hard-code secret trong source code hoặc test fixtures.
- Không commit `node_modules/`, `dist/`, `coverage/`, hoặc generated Prisma client.
- Commit `prisma/schema.prisma` và migration SQL trong `prisma/migrations/`.
