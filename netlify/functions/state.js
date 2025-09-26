
// netlify/functions/state.js
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tennis-results";
const headersJSON = { "content-type": "application/json" };

const ok = (obj) => ({ statusCode: 200, headers: headersJSON, body: JSON.stringify(obj) });
const err = (statusCode, message) => ({ statusCode, headers: headersJSON, body: JSON.stringify({ error: message }) });

exports.handler = async (event) => {
  console.log("[state] incoming", { method: event.httpMethod, qs: event.queryStringParameters });
  try {
    const tId = (event.queryStringParameters && (event.queryStringParameters.t || event.queryStringParameters.T)) || "default";
    const method = event.httpMethod || "GET";
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const KEY = `${tId}/state.json`;

    const expected = process.env.ADMIN_TOKEN;
    const authed = !expected || event.headers["x-admin-token"] === expected;

    if (method === "GET") {
      const json = await store.get(KEY);
      return { statusCode: 200, headers: headersJSON, body: json || "{}" };
    }
    if (!authed) return err(401, "Unauthorized");

    if (method === "PUT") {
      await store.set(KEY, event.body || "{}");
      return ok({ ok: true });
    }
    if (method === "PATCH") {
      const patch = JSON.parse(event.body || "{}"); // {path:[], value:any}
      let current = {};
      const existing = await store.get(KEY);
      if (existing) current = JSON.parse(existing);
      const setDeep = (obj, path, value) => {
        let p = obj;
        for (let i=0;i<path.length-1;i++){ const k=path[i]; if(!(k in p)) p[k]={}; p=p[k]; }
        p[path[path.length-1]] = value;
      };
      setDeep(current, patch.path||[], patch.value);
      await store.set(KEY, JSON.stringify(current));
      return ok({ ok: true });
    }

    return err(405, "Method Not Allowed");
  } catch (e) {
    console.error("[state] error", e);
    return err(500, String(e && e.stack || e));
  }
};
