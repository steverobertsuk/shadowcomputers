import type { APIRoute } from "astro";

import { version } from "../../package.json";

// Health endpoint for uptime monitoring (UptimeRobot keyword check on "ok").
// This is a fully static site, so the handler runs at build time and the
// response is served as a prerendered file — builtAt is the last deploy time.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      status: "ok",
      site: "shadowcomputers.uk",
      version,
      builtAt: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
