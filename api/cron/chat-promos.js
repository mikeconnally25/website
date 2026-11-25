import { maybeSendDueChatPromos } from "../../lib/chat-promos.js";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function isAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  const auth = String(req.headers.authorization || "");
  const vercelCron = Boolean(req.headers["x-vercel-cron"]);

  // Production always requires a shared secret or a real Vercel cron invocation.
  if (process.env.VERCEL === "1") {
    if (secret && auth === `Bearer ${secret}`) return true;
    return vercelCron;
  }

  // Local/dev: require CRON_SECRET when configured; otherwise allow.
  if (secret) {
    return auth === `Bearer ${secret}`;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: "Unauthorized." });
  }

  try {
    const result = await maybeSendDueChatPromos({ force: false });
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("Chat promos cron failed:", error.message);
    sendJson(res, 500, {
      error: error.message || "Could not send chat promos.",
    });
  }
}
