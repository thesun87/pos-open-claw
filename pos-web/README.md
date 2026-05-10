# pos-web

Frontend PWA cho Café POS MVP, dùng Vite + React + TypeScript strict.

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
npm run build
npm test
npm run lint
npm run typecheck
```

## Dev server

- Port mặc định: `5173`
- API backend mặc định trong `.env.example`: `VITE_API_BASE_URL=http://localhost:3000`

## Ghi chú bảo mật

- Không commit file `.env` thật.
- Không lưu token vào `localStorage` hoặc `sessionStorage`.
