import { getSession } from "./session.js";
import { awardPoints } from "./points.js";
import { verifyIpnSignature } from "./nowpayments.js";
import { constructStripeWebhookEvent, isStripeConfigured } from "./stripe.js";
import {
  getPurchaseById,
  markPurchasePaid,
  revertPurchasePaid,
} from "./points-purchases.js";

const CREDIT_STATUSES = new Set(["finished", "confirmed"]);

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString();
  if (!raw) return {};

  return JSON.parse(raw);
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.length) {
    return Buffer.from(req.body, "utf8");
  }
  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body), "utf8");
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function handlePointsBuyPackages(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  // Buying FunCoins is permanently disabled.
  sendJson(res, 200, {
    ok: true,
    configured: false,
    stripeConfigured: false,
    cryptoConfigured: false,
    enabled: false,
    packages: [],
  });
}

export async function handlePointsBuySettings(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const session = await getSession(req);
  if (!session?.isAdmin) {
    sendJson(res, 403, { error: "Admin only." });
    return;
  }

  sendJson(res, 410, {
    error: "Buying FunCoins has been removed.",
    enabled: false,
  });
}

export async function handlePointsBuy(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  sendJson(res, 410, {
    error: "Buying FunCoins has been removed.",
  });
}

export async function handlePointsBuyIpn(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "Invalid IPN body." });
    return;
  }

  const signature =
    req.headers["x-nowpayments-sig"] ||
    req.headers["X-Nowpayments-Sig"] ||
    "";

  if (!verifyIpnSignature(body, signature)) {
    sendJson(res, 401, { error: "Invalid IPN signature." });
    return;
  }

  const status = String(body.payment_status || body.status || "")
    .trim()
    .toLowerCase();
  const orderId = String(body.order_id || "").trim();
  const paymentId =
    body.payment_id != null
      ? String(body.payment_id).trim()
      : body.paymentId != null
        ? String(body.paymentId).trim()
        : "";

  if (!CREDIT_STATUSES.has(status)) {
    sendJson(res, 200, { ok: true, ignored: true, status });
    return;
  }

  if (!orderId || !paymentId) {
    sendJson(res, 400, { error: "Missing order_id or payment_id." });
    return;
  }

  const existing = await getPurchaseById(orderId);
  if (!existing) {
    sendJson(res, 404, { error: "Unknown purchase order." });
    return;
  }

  try {
    const result = await markPurchasePaid(orderId, paymentId);
    if (!result) {
      sendJson(res, 404, { error: "Unknown purchase order." });
      return;
    }

    if (result.awarded) {
      try {
        await awardPoints({
          kickUserId: result.order.kickUserId,
          username: result.order.username,
          amount: result.order.points,
          note: "Crypto purchase",
        });
      } catch (error) {
        await revertPurchasePaid(orderId, paymentId);
        throw error;
      }
    }

    sendJson(res, 200, {
      ok: true,
      awarded: result.awarded,
      orderId: result.order.id,
      paymentId,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Could not process IPN.",
    });
  }
}

async function fulfillStripeCheckoutSession(session) {
  if (!session || session.payment_status !== "paid") {
    return { ok: true, ignored: true, reason: "not_paid" };
  }

  const orderId = String(
    session.metadata?.orderId || session.client_reference_id || ""
  ).trim();
  const paymentId = String(
    session.payment_intent || session.id || ""
  ).trim();

  if (!orderId || !paymentId) {
    return { ok: false, error: "Missing orderId or payment id." };
  }

  const existing = await getPurchaseById(orderId);
  if (!existing) {
    return { ok: false, error: "Unknown purchase order." };
  }

  const result = await markPurchasePaid(orderId, paymentId);
  if (!result) {
    return { ok: false, error: "Unknown purchase order." };
  }

  if (result.awarded) {
    try {
      await awardPoints({
        kickUserId: result.order.kickUserId,
        username: result.order.username,
        amount: result.order.points,
        note: "Stripe purchase",
      });
    } catch (error) {
      await revertPurchasePaid(orderId, paymentId);
      throw error;
    }
  }

  return {
    ok: true,
    awarded: result.awarded,
    orderId: result.order.id,
    paymentId,
  };
}

export async function handlePointsBuyStripeWebhook(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isStripeConfigured()) {
    sendJson(res, 503, { error: "Stripe is not configured." });
    return;
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature =
      req.headers["stripe-signature"] || req.headers["Stripe-Signature"] || "";
    event = constructStripeWebhookEvent(rawBody, signature);
  } catch (error) {
    sendJson(res, 400, {
      error: error.message || "Invalid Stripe webhook signature.",
    });
    return;
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const outcome = await fulfillStripeCheckoutSession(event.data.object);
      if (!outcome.ok) {
        sendJson(res, 400, { error: outcome.error || "Fulfillment failed." });
        return;
      }
      sendJson(res, 200, outcome);
      return;
    }

    sendJson(res, 200, { ok: true, ignored: true, type: event.type });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Could not process Stripe webhook.",
    });
  }
}
