const ROSTER_CACHE_TTL_MS = 60 * 1000;
const ROSTER_REDIS_KEY = "bj:affiliate-roster-v2";
const LEADERBOARD_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=60";

let cachedRoster = null;
let cachedRosterAt = 0;
let rosterInFlight = null;

function cleanEnv(value) {
  return String(value || "").trim();
}

export function getAffiliateCode() {
  return cleanEnv(process.env.AFFILIATE_CODE) || "CaptainBonk";
}

export function getAffiliateSite() {
  return cleanEnv(process.env.AFFILIATE_SITE).toLowerCase() || "roobet";
}

function getConfiguredRosterUrl() {
  const direct = cleanEnv(process.env.AFFILIATE_ROSTER_URL);
  if (direct) return direct;

  const sheetId = cleanEnv(process.env.AFFILIATE_SHEET_ID);
  const sheetGid = cleanEnv(process.env.AFFILIATE_SHEET_GID) || "0";
  if (!sheetId) return null;

  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${sheetGid}`;
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), token };
}

async function redisCommand(config, command) {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Redis command failed.");
  }
  return data.result;
}

function sendJson(res, statusCode, payload, cacheControl = "no-store") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(payload));
}

function parseGvizResponse(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Invalid affiliate roster response.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

function cellValue(cell) {
  if (!cell) {
    return null;
  }

  if (cell.v !== null && cell.v !== undefined) {
    return cell.v;
  }

  return cell.f ?? null;
}

function cellLabel(cell) {
  if (!cell) {
    return "";
  }

  return cell.f ?? String(cell.v ?? "");
}

const SHEET_MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Sheet dates are Eastern wall times, including a trailing "12:00 am". */
export function parseLeaderboardSheetDate(value, timeZone = "America/New_York") {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})(?:\s+(\d{1,2}):(\d{2})\s*([ap]m))?/i);
  if (!match) return null;
  const month = SHEET_MONTHS[match[2].toLowerCase()];
  if (month === undefined) return null;

  const day = Number(match[1]);
  const year = 2000 + Number(match[3]);
  let hour = 0;
  let minute = 0;
  if (match[4]) {
    hour = Number(match[4]) % 12;
    if (String(match[6]).toLowerCase() === "pm") hour += 12;
    minute = Number(match[5]);
  }

  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0));
  const parts = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcDate)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return new Date(utcDate.getTime() - (asUTC - utcDate.getTime()));
}

function normalizeRosterEntry(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const username = String(
    raw.username || raw.name || raw.user || raw.player || ""
  ).trim();
  if (!username) return null;
  return {
    rank: Number(raw.rank) || index + 1,
    username,
    wagered: Number(raw.wagered) || 0,
    wageredLabel:
      raw.wageredLabel != null
        ? String(raw.wageredLabel)
        : Number(raw.wagered)
          ? String(raw.wagered)
          : "",
  };
}

function mapAffiliateRow(row, index) {
  const cells = row.c || [];
  // Support either Stake-style columns or a simple username-first sheet.
  const username =
    String(cellValue(cells[2]) || cellValue(cells[0]) || "").trim() ||
    String(cellLabel(cells[2]) || cellLabel(cells[0]) || "").trim();
  if (!username) return null;

  return {
    rank: Number(cellValue(cells[4]) || cellValue(cells[1])) || index + 1,
    username,
    wagered: Number(cellValue(cells[3]) || cellValue(cells[2])) || 0,
    wageredLabel: cellLabel(cells[3]) || cellLabel(cells[2]) || "",
  };
}

function emptyRoster(source = "empty") {
  return {
    entries: [],
    periodStart: null,
    periodEnd: null,
    updatedAt: new Date().toISOString(),
    source,
    affiliateCode: getAffiliateCode(),
    affiliateSite: getAffiliateSite(),
  };
}

function rosterAgeMs(roster) {
  const stamped = Date.parse(roster?.updatedAt || "");
  if (!Number.isFinite(stamped)) {
    return Number.POSITIVE_INFINITY;
  }
  return Date.now() - stamped;
}

function rememberRoster(roster) {
  cachedRoster = roster;
  const stamped = Date.parse(roster?.updatedAt || "");
  cachedRosterAt = Number.isFinite(stamped) ? stamped : Date.now();
  return roster;
}

async function readSharedRoster() {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const result = await redisCommand(config, ["GET", ROSTER_REDIS_KEY]);
    if (result === null || result === undefined) return null;
    const roster = typeof result === "string" ? JSON.parse(result) : result;
    if (!roster || !Array.isArray(roster.entries)) return null;
    return {
      ...emptyRoster(roster.source || "redis"),
      ...roster,
      entries: (roster.entries || [])
        .map((entry, index) => normalizeRosterEntry(entry, index))
        .filter(Boolean),
    };
  } catch {
    return null;
  }
}

async function writeSharedRoster(roster) {
  const config = getRedisConfig();
  if (!config) return false;

  try {
    await redisCommand(config, [
      "SET",
      ROSTER_REDIS_KEY,
      JSON.stringify(roster),
    ]);
    return true;
  } catch {
    return false;
  }
}

function parseRemoteRosterPayload(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return emptyRoster("remote-empty");
  }

  // Google Visualization JSONP/gviz.
  if (trimmed.includes("google.visualization") || trimmed.startsWith("/*")) {
    const data = parseGvizResponse(trimmed);
    const rows = data.table?.rows || [];
    const entries = rows
      .map((row, index) => mapAffiliateRow(row, index))
      .filter(Boolean);
    const firstRow = rows[0]?.c || [];
    return {
      ...emptyRoster("gviz"),
      entries,
      periodStart: cellLabel(firstRow[5]) || null,
      periodEnd: cellLabel(firstRow[6]) || null,
      updatedAt: new Date().toISOString(),
    };
  }

  const parsed = JSON.parse(trimmed);
  if (Array.isArray(parsed)) {
    const entries = parsed
      .map((entry, index) =>
        typeof entry === "string"
          ? normalizeRosterEntry({ username: entry }, index)
          : normalizeRosterEntry(entry, index)
      )
      .filter(Boolean);
    return {
      ...emptyRoster("json"),
      entries,
      updatedAt: new Date().toISOString(),
    };
  }

  if (parsed && typeof parsed === "object") {
    const list = Array.isArray(parsed.entries)
      ? parsed.entries
      : Array.isArray(parsed.users)
        ? parsed.users
        : Array.isArray(parsed.players)
          ? parsed.players
          : [];
    const entries = list
      .map((entry, index) =>
        typeof entry === "string"
          ? normalizeRosterEntry({ username: entry }, index)
          : normalizeRosterEntry(entry, index)
      )
      .filter(Boolean);
    return {
      ...emptyRoster("json"),
      entries,
      periodStart: parsed.periodStart || null,
      periodEnd: parsed.periodEnd || null,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  }

  throw new Error("Unsupported affiliate roster format.");
}

async function fetchRemoteRoster(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json,text/plain,*/*" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not load affiliate roster (HTTP ${response.status}).`
    );
  }

  const text = await response.text();
  return parseRemoteRosterPayload(text);
}

export async function saveAffiliateRoster(input = {}) {
  const list = Array.isArray(input.entries)
    ? input.entries
    : Array.isArray(input.usernames)
      ? input.usernames
      : [];

  const entries = list
    .map((entry, index) =>
      typeof entry === "string"
        ? normalizeRosterEntry({ username: entry }, index)
        : normalizeRosterEntry(entry, index)
    )
    .filter(Boolean);

  const roster = {
    ...emptyRoster("manual"),
    entries,
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    updatedAt: new Date().toISOString(),
  };

  rememberRoster(roster);
  const saved = await writeSharedRoster(roster);
  if (!saved && !getRedisConfig()) {
    // Local/dev without Redis still keeps the in-memory roster for this process.
    return roster;
  }
  if (!saved && getRedisConfig()) {
    throw new Error("Could not save affiliate roster to Redis.");
  }
  return roster;
}

export async function fetchAffiliateRoster() {
  const now = Date.now();
  if (cachedRoster && now - cachedRosterAt < ROSTER_CACHE_TTL_MS) {
    return cachedRoster;
  }

  if (rosterInFlight) {
    return rosterInFlight;
  }

  rosterInFlight = (async () => {
    const remoteUrl = getConfiguredRosterUrl();

    // Prefer a configured Roobet/new-site roster URL when present.
    if (remoteUrl) {
      try {
        const remote = await fetchRemoteRoster(remoteUrl);
        rememberRoster(remote);
        await writeSharedRoster(remote);
        return remote;
      } catch (error) {
        console.error("Affiliate roster remote fetch failed:", error.message);
        const shared = await readSharedRoster();
        if (shared?.entries?.length) {
          return rememberRoster(shared);
        }
        throw error;
      }
    }

    const shared = await readSharedRoster();
    if (shared) {
      return rememberRoster(shared);
    }

    return rememberRoster(emptyRoster("unconfigured"));
  })();

  try {
    return await rosterInFlight;
  } finally {
    rosterInFlight = null;
  }
}

export async function isUsernameOnAffiliateCode(username) {
  const target = String(username || "").trim().toLowerCase();
  if (!target) {
    return false;
  }

  const roster = await fetchAffiliateRoster();
  return (roster.entries || []).some(
    (entry) => String(entry.username || "").trim().toLowerCase() === target
  );
}

/** @deprecated Use isUsernameOnAffiliateCode — kept for call-site compatibility. */
export async function isStakeUsernameOnAffiliateCode(stakeUsername) {
  return isUsernameOnAffiliateCode(stakeUsername);
}

export async function fetchLeaderboardTop(limit = 10) {
  // Public wager standings stay disabled until a new competition source is wired.
  void limit;
  return {
    entries: [],
    periodStart: null,
    periodEnd: null,
    signature: "0",
    updatedAt: new Date().toISOString(),
    disabled: true,
    affiliateCode: getAffiliateCode(),
    affiliateSite: getAffiliateSite(),
  };
}

export async function handleLeaderboardGet(req, res) {
  try {
    const data = await fetchLeaderboardTop(10);
    sendJson(res, 200, data, LEADERBOARD_CACHE_CONTROL);
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Could not load leaderboard.",
    });
  }
}
