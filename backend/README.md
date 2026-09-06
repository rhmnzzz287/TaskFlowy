# TaskFlowy backend — standalone API + auth server (Hono + better-auth)

## Dev

```bash
npm install
npm run db:push     # create SQLite tables (first run only)
npm run dev         # http://localhost:8000
```

Frontend (in `../frontend`) proxies `/api/auth/*` and `/api/me` here via
`next.config.js` rewrites, so browsers stay same-origin and session cookies
just work. `TRUSTED_ORIGINS` in `.env` must list the frontend origin.

## Endpoints

| Method | Path            | Description                              |
| ------ | --------------- | ---------------------------------------- |
| GET    | `/health`       | liveness probe → `{ ok: true }`          |
| ALL    | `/api/auth/*`   | better-auth (sign-up/in/out, session…)   |
| GET    | `/api/me`       | session-guarded example (200 / 401)      |

## Scripts

- `npm run dev` — hot-reload server (tsx watch)
- `npm run build` / `npm start` — compile to `dist/` and run with node
- `npm run db:push` — apply `src/db-schema.ts` to the SQLite file
- `npm run auth:generate` — regenerate `src/db-schema.ts` after changing
  the `betterAuth({...})` config, then `npm run db:push`
