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

  if (process.env.VERCEL === "1") {
    if (secret && auth === `Bearer ${secret}`) return true;
    return vercelCron;
  }

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
    // Keep old path working; send whichever promos are due.
    const result = await maybeSendDueChatPromos({ force: false });
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error("Stake promo cron failed:", error.message);
    sendJson(res, 500, {
      error: error.message || "Could not send Stake promo.",
    });
  }
}
