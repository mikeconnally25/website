import {
  handleAffiliateRosterGet,
  handleAffiliateRosterSave,
} from "../../lib/user-handlers.js";

export default function handler(req, res) {
  if (req.method === "GET") {
    return handleAffiliateRosterGet(req, res);
  }

  if (req.method === "POST") {
    return handleAffiliateRosterSave(req, res);
  }

  res.statusCode = 405;
  return res.end("Method not allowed");
}
