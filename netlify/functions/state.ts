
// netlify/functions/state.ts
// Requires: npm i @netlify/blobs @netlify/functions
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

const STORE_NAME = "tennis-results";
const HEADER_JSON = { "content-type": "application/json" };

function ok(data: any){ return new Response(JSON.stringify(data), { headers: HEADER_JSON }); }

// Optional: minimal Auth
function requireAuth(req: Request){
  const expected = Deno.env.get("ADMIN_TOKEN") || process.env.ADMIN_TOKEN;
  if(!expected) return true; // no token set -> public write
  const token = req.headers.get("x-admin-token");
  return token === expected;
}

export default async (req: Request, _ctx: Context) => {
  const url = new URL(req.url);
  const tId = url.searchParams.get("t") || "default";
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const KEY = `${tId}/state.json`;

  if (req.method === "GET") {
    const json = await store.get(KEY);
    return new Response(json ?? "{}", { headers: HEADER_JSON });
  }

  if (!requireAuth(req)) return new Response("Unauthorized", { status: 401 });

  if (req.method === "PUT") {
    const body = await req.text();
    await store.set(KEY, body);
    return ok({ ok: true });
  }

  if (req.method === "PATCH") {
    const patch = await req.json(); // { path: string[], value: any }
    let current: any = {};
    const existing = await store.get(KEY);
    if (existing) current = JSON.parse(existing);
    // deep set
    const setDeep = (obj: any, path: string[], value: any) => {
      let p = obj;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (!(k in p)) p[k] = {};
        p = p[k];
      }
      p[path[path.length - 1]] = value;
    };
    setDeep(current, patch.path, patch.value);
    await store.set(KEY, JSON.stringify(current));
    return ok({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405 });
};
