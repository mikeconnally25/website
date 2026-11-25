import { handleKickWebhook } from "../../lib/kick-webhook.js";

// Keep the raw body for Kick RSA signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  return handleKickWebhook(req, res);
}
