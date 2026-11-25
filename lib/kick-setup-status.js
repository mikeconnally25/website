import { cleanEnv, getKickConfig } from "./config.js";
import { getSession } from "./session.js";

function redisConfigured() {
  const url =
    cleanEnv(process.env.UPSTASH_REDIS_REST_URL) ||
    cleanEnv(process.env.KV_REST_API_URL);
  const token =
    cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN) ||
    cleanEnv(process.env.KV_REST_API_TOKEN);
  return Boolean(url && token);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export async function handleKickSetupStatus(req, res) {
  let session = null;
  try {
    session = await getSession(req);
  } catch {
    session = null;
  }

  if (!session?.isAdmin) {
    sendJson(res, 403, { error: "Admin access required." });
    return;
  }

  try {
    const config = getKickConfig(req);

    const payload = {
      clientId: config.clientId || null,
      redirectUri: config.redirectUri || null,
      credentialsConfigured: Boolean(config.clientId && config.clientSecret),
      redisConfigured: redisConfigured(),
      hint: null,
    };

    if (!payload.redisConfigured) {
      payload.hint =
        "Add Upstash Redis in Vercel Storage and reconnect it to this project, then redeploy.";
    } else if (!payload.credentialsConfigured) {
      payload.hint =
        "Set KICK_CLIENT_ID and KICK_CLIENT_SECRET in Vercel, then redeploy.";
    }

    // Do not call Kick with the client secret from this status route.
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 200, {
      clientId: cleanEnv(process.env.KICK_CLIENT_ID) || null,
      redirectUri: cleanEnv(process.env.KICK_REDIRECT_URI) || null,
      credentialsConfigured: false,
      redisConfigured: redisConfigured(),
      hint: error.message,
    });
  }
}
