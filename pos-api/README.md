# pos-api

Backend API cho Café POS MVP, dùng NestJS + TypeScript strict.

## Yêu cầu

- Node.js >=20
- npm

## Cài đặt

```bash
npm install
```

## Commands

```bash
npm run dev
npm run start:dev
npm run build
npm test
npm run lint
npm run typecheck
```

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

## Ghi chú bảo mật

- Không commit file `.env` thật.
- Không hard-code secret trong source code hoặc test fixtures.
