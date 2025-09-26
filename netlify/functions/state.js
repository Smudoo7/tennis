
// netlify/functions/state.js (Netlify Functions v1 syntax - CommonJS)
const { getStore } = require("@netlify/blobs");

const STORE_NAME = "tennis-results";
const headersJSON = { "content-type": "application/json" };

function parseTournamentId(queryStringParameters) {
  const t = queryStringParameters && (queryStringParameters.t || queryStringParameters.T);
  return t || "default";
}

function ok(obj) {
  return { statusCode: 200, headers: headersJSON, body: JSON.stringify(obj) };
}

exports.handler = async (event, context) => {
  const method = event.httpMethod || "GET";
  const tId = parseTournamentId(event.queryStringParameters || {});
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const KEY = `${tId}/state.json`;

  // Minimal "auth"
  const expected = process.env.ADMIN_TOKEN;
  const hasAuth = !expected || event.headers["x-admin-token"] === expected;

  if (method === "GET") {
    const json = await store.get(KEY);
    return { statusCode: 200, headers: headersJSON, body: json || "{}" };
  }

  if (!hasAuth) return { statusCode: 401, body: "Unauthorized" };

  if (method === "PUT") {
    const body = event.body || "{}";
    await store.set(KEY, body);
    return ok({ ok: true });
  }

  if (method === "PATCH") {
    const patch = JSON.parse(event.body || "{}"); // { path:[], value:any }
    let current = {};
    const existing = await store.get(KEY);
    if (existing) current = JSON.parse(existing);

    const setDeep = (obj, path, value) => {
      let p = obj;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        if (!(k in p)) p[k] = {};
        p = p[k];
      }
      p[path[path.length - 1]] = value;
    };
    setDeep(current, patch.path || [], patch.value);
    await store.set(KEY, JSON.stringify(current));
    return ok({ ok: true });
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
