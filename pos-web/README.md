# Café POS Web

Frontend PWA shell for the Café POS product.

## Routes

- `/login` — Vietnamese placeholder only. Real auth form, token storage, and redirects arrive in Story 1.8.
- `/pos` — landscape-first POS shell with product/menu placeholder on the left and fixed cart/checkout placeholder on the right. Viewports under `768px` show the unsupported POS message.
- `/admin/*` — lazy-loaded Admin shell with sectioned navigation for Menu, Reports, and Users/Sessions.

## PWA behavior

`vite-plugin-pwa` builds the service worker and manifest for `Café POS`. The app registers through `virtual:pwa-register/react` and shows a small Vietnamese prompt when an update is available, plus offline-ready feedback when applicable.

## API client foundation

`src/shared/lib/api-client.ts` uses `import.meta.env.VITE_API_BASE_URL` and maps `application/problem+json` responses through `errorMapper`. It intentionally does not read `localStorage` or `sessionStorage`; Story 1.8 will wire IndexedDB-backed auth tokens.
