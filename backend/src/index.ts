import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "./auth.js";

const app = new Hono();

// The frontend talks to this server same-origin through Next.js rewrites,
// so CORS is only a fallback for direct cross-origin calls (e.g. preview
// deploys). Credentials enabled so session cookies work in both cases.
const frontendOrigins = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: frontendOrigins.length > 0 ? frontendOrigins : [],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "taskflowy-backend" }));

// better-auth: handles sign-up / sign-in / sign-out / session / etc.
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

/**
 * Example backend route guarded by better-auth.
 * GET /api/me → 200 { user } when signed in, 401 { error } otherwise.
 */
app.get("/api/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "UNAUTHORIZED" }, 401);
  }
  return c.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  });
});

const port = Number(process.env.PORT ?? 8000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`taskflowy-backend listening on http://localhost:${info.port}`);
});

export default app;
