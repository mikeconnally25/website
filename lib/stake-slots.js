import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("data");
const CATALOG_FILE = path.join(DATA_DIR, "stake-slot-catalog.json");
const FALLBACK_CATALOG_FILE = path.resolve("catalog/stake-allowed-slots.json");
const THUMBNAIL_INDEX_FILE = path.resolve("catalog/stake-slot-thumbs.json");
const CATALOG_KEY = "bh:slot-catalog";
const THUMBNAIL_INDEX_KEY = "bh:slot-thumbs";

/** Featured tag filters (also stored on groupSlugs). */
export const FEATURED_SLOT_GROUPS = [
  {
    slug: "new-games",
    label: "New Games",
    url: "https://roobet.com/casino/category/new-games",
    tagSlug: "new-games",
  },
  {
    slug: "bonus-buys",
    label: "Bonus Buys",
    url: "https://roobet.com/casino/category/bonus-buys",
    tagSlug: "bonus-buys",
  },
  {
    slug: "live-games",
    label: "Live Games",
    url: "https://roobet.com/casino/category/live-games",
    tagSlug: "live-games",
  },
];

/**
 * Default category groups. Sync replaces these with every playable Roobet
 * category found in the essentials API (slots, live, game shows, etc.).
 */
export const ALLOWED_SLOT_GROUPS = [
  {
    slug: "slots",
    label: "Slots",
    url: "https://roobet.com/casino/category/slots",
  },
  {
    slug: "blackjack",
    label: "Blackjack",
    url: "https://roobet.com/casino/category/blackjack",
  },
  {
    slug: "baccarat",
    label: "Baccarat",
    url: "https://roobet.com/casino/category/baccarat",
  },
  {
    slug: "roulette",
    label: "Roulette",
    url: "https://roobet.com/casino/category/roulette",
  },
  {
    slug: "game-shows",
    label: "Game Shows",
    url: "https://roobet.com/casino/category/game-shows",
  },
  {
    slug: "poker",
    label: "Poker",
    url: "https://roobet.com/casino/category/poker",
  },
  {
    slug: "instant-win",
    label: "Instant Win",
    url: "https://roobet.com/casino/category/instant-win",
  },
  {
    slug: "scratch-cards",
    label: "Scratch Cards",
    url: "https://roobet.com/casino/category/scratch-cards",
  },
  {
    slug: "provably-fair",
    label: "Provably Fair",
    url: "https://roobet.com/casino/category/provably-fair",
  },
  ...FEATURED_SLOT_GROUPS,
];

const ROOBET_ESSENTIALS_URL = "https://roobet.com/_api/tp-games/essentials";
const ROOBET_CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ROOBET_CATALOG_SCOPE = "all-playable";
const EXCLUDED_ROOBET_CATEGORIES = new Set(["lobby"]);

const CATEGORY_SLUG_ALIASES = {
  "scratch cards": "scratch-cards",
  "instant win": "instant-win",
  "instant win games": "instant-win",
  "game shows": "game-shows",
  "other card": "other-card",
  "arcade games": "arcade-games",
  "live racing": "live-racing",
  "video poker": "video-poker",
  "provably fair": "provably-fair",
};

function slugifyCategory(category) {
  const raw = String(category || "")
    .trim()
    .toLowerCase();
  if (!raw) return "other";
  if (CATEGORY_SLUG_ALIASES[raw]) return CATEGORY_SLUG_ALIASES[raw];
  return (
    raw
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other"
  );
}

function labelFromCategory(category) {
  const raw = String(category || "").trim();
  if (!raw) return "Other";
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function categoryGroupUrl(slug) {
  return `https://roobet.com/casino/category/${slug}`;
}

function buildGroupFromCategory(category) {
  const slug = slugifyCategory(category);
  return {
    slug,
    label: labelFromCategory(category),
    url: categoryGroupUrl(slug),
  };
}

let knownGroupSlugs = new Set(ALLOWED_SLOT_GROUPS.map((group) => group.slug));

function registerGroupSlugs(groups) {
  for (const group of groups || []) {
    const slug = remapLegacyGroupSlug(group?.slug);
    if (slug) knownGroupSlugs.add(slug);
  }
}

export function remapLegacyGroupSlug(groupSlug) {
  const value = String(groupSlug || "").trim();
  if (value === "new-releases") return "new-games";
  if (value === "only-on-stake") return "bonus-buys";
  return value;
}

export function isAllowedSlotGroup(groupSlug) {
  const slug = remapLegacyGroupSlug(groupSlug);
  if (!slug) return false;
  // Accept any registered group, plus unknown category-style slugs from Roobet.
  return knownGroupSlugs.has(slug) || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function isAllowedSlot(slot) {
  return Boolean(
    slot?.slug && slot?.name && isAllowedSlotGroup(slot.groupSlug)
  );
}

function filterAllowedSlots(slots) {
  return (slots || []).filter(isAllowedSlot);
}

export function normalizeSlotThumbnailUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    return null;
  }

  const normalized = value.startsWith("//") ? `https:${value}` : value;
  // Stake/imgix thumbs accept resize params; Roobet S3 thumbs do not.
  if (!/imgix\.net|mediumrare\.imgix|stake\.com/i.test(normalized)) {
    return normalized;
  }
  const base = normalized.split("?")[0];
  return `${base}?w=150&h=200&fit=min&auto=format`;
}

export function getSlotCatalogThumbnailStats(slots) {
  const list = filterAllowedSlots(slots);
  const withThumbnails = list.filter((slot) => slot.thumbnailUrl).length;
  return {
    total: list.length,
    withThumbnails,
    missingThumbnails: Math.max(0, list.length - withThumbnails),
  };
}

function normalizeSlotNameKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mergeSlotRecords(existing, incoming) {
  if (!existing) {
    return { ...incoming };
  }

  return {
    ...existing,
    ...incoming,
    name: incoming.name || existing.name,
    slug: incoming.slug || existing.slug,
    groupSlug: incoming.groupSlug || existing.groupSlug,
    groupLabel: incoming.groupLabel || existing.groupLabel,
    groupUrl: incoming.groupUrl || existing.groupUrl,
    provider: incoming.provider || existing.provider || null,
    thumbnailUrl:
      normalizeSlotThumbnailUrl(incoming.thumbnailUrl) ||
      normalizeSlotThumbnailUrl(existing.thumbnailUrl),
  };
}

function findKnownGroup(slug) {
  const remapped = remapLegacyGroupSlug(slug);
  return (
    ALLOWED_SLOT_GROUPS.find((group) => group.slug === remapped) ||
    FEATURED_SLOT_GROUPS.find((group) => group.slug === remapped) ||
    (remapped
      ? {
          slug: remapped,
          label: labelFromCategory(remapped.replace(/-/g, " ")),
          url: categoryGroupUrl(remapped),
        }
      : null)
  );
}

function primaryAllowedGroup(groupSlugs) {
  const slugs = [...new Set((groupSlugs || []).map(remapLegacyGroupSlug).filter(isAllowedSlotGroup))];
  // Prefer the real casino category over featured tag filters.
  const featured = new Set(FEATURED_SLOT_GROUPS.map((group) => group.slug));
  const categorySlug = slugs.find((slug) => !featured.has(slug));
  if (categorySlug) {
    return findKnownGroup(categorySlug);
  }
  if (slugs.includes("bonus-buys")) {
    return findKnownGroup("bonus-buys");
  }
  if (slugs.includes("live-games")) {
    return findKnownGroup("live-games");
  }
  if (slugs.includes("new-games")) {
    return findKnownGroup("new-games");
  }
  return slugs.length ? findKnownGroup(slugs[0]) : null;
}

/**
 * Merge catalogs. When incoming slots include a group (e.g. new-releases), that
 * group's membership is replaced so stale/out-of-category games drop out.
 */
export function mergeSlotCatalogs(existingCatalog, incomingSlots) {
  const existingSlots = filterAllowedSlots(existingCatalog?.slots);
  const incoming = filterAllowedSlots(incomingSlots);
  const replacedGroups = new Set(
    incoming
      .map((slot) => String(slot.groupSlug || "").trim())
      .filter((slug) => isAllowedSlotGroup(slug))
  );

  const pruned = [];
  for (const slot of existingSlots) {
    const priorSlugs = [
      ...new Set(
        [...(slot.groupSlugs || []), slot.groupSlug]
          .map((slug) => String(slug || "").trim())
          .filter((slug) => isAllowedSlotGroup(slug))
      ),
    ];
    const remaining = priorSlugs.filter((slug) => !replacedGroups.has(slug));
    if (!remaining.length) {
      continue;
    }

    const group = primaryAllowedGroup(remaining);
    if (!group) {
      continue;
    }

    pruned.push({
      ...slot,
      groupSlugs: remaining,
      groupSlug: group.slug,
      groupLabel: group.label,
      groupUrl: group.url,
    });
  }

  const mergedBySlug = new Map();
  const nameIndex = new Map();

  for (const slot of pruned) {
    mergedBySlug.set(slot.slug, { ...slot });
    nameIndex.set(normalizeSlotNameKey(slot.name), slot.slug);
  }

  for (const slot of incoming) {
    const nameKey = normalizeSlotNameKey(slot.name);
    const existingSlug = mergedBySlug.has(slot.slug)
      ? slot.slug
      : nameIndex.get(nameKey);
    const existing = existingSlug ? mergedBySlug.get(existingSlug) : null;
    const next = mergeSlotRecords(existing, slot);

    if (existingSlug && existingSlug !== slot.slug) {
      mergedBySlug.delete(existingSlug);
      nameIndex.delete(normalizeSlotNameKey(existing?.name));
    }

    const groupSlugs = [
      ...new Set(
        [
          ...(existing?.groupSlugs || []),
          existing?.groupSlug,
          next.groupSlug,
          ...(slot.groupSlugs || []),
        ]
          .map((slug) => String(slug || "").trim())
          .filter((slug) => isAllowedSlotGroup(slug))
      ),
    ];
    const group = primaryAllowedGroup(groupSlugs) || primaryAllowedGroup([next.groupSlug]);
    if (!group) {
      continue;
    }

    mergedBySlug.set(next.slug, {
      ...next,
      groupSlugs,
      groupSlug: group.slug,
      groupLabel: group.label,
      groupUrl: group.url,
    });
    nameIndex.set(nameKey, next.slug);
  }

  return sanitizeCatalog({
    updatedAt: new Date().toISOString(),
    source: existingCatalog?.source || "import",
    slots: dedupeSlots([...mergedBySlug.values()]),
    groups: existingCatalog?.groups,
  });
}

let memoryCatalog = null;
let memoryThumbnailIndex = null;

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), token };
}

export function stripProviderFromSlotName(slotName, provider) {
  let name = String(slotName || "")
    .trim()
    .replace(/\s+/g, " ");
  const prov = String(provider || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!name || !prov) {
    return name;
  }

  const lower = name.toLowerCase();
  const provLower = prov.toLowerCase();
  if (lower === provLower) {
    return name;
  }

  if (lower.endsWith(` ${provLower}`)) {
    return name.slice(0, -(prov.length + 1)).trim();
  }

  return name;
}

function extractSlotProvider(raw) {
  for (const entry of raw?.groupGames || []) {
    const group = entry?.group;
    const type = String(group?.type || "").toLowerCase();
    if (type === "provider" || type === "gameprovider") {
      const label = String(group.translation || "").trim();
      if (label) {
        return label;
      }
    }
  }

  return "";
}

function normalizeSlot(raw, group) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const slug = String(raw.slug || "").trim().toLowerCase();
  const provider =
    String(raw.provider || "").trim() || extractSlotProvider(raw) || null;
  let name = stripProviderFromSlotName(raw.name, provider);
  if (!name) {
    name = String(raw.name || "").trim();
  }

  if (!name || !slug) {
    return null;
  }

  const thumbnailUrl = normalizeSlotThumbnailUrl(raw.thumbnailUrl);

  return {
    name,
    slug,
    groupSlug: group.slug,
    groupLabel: group.label,
    groupUrl: group.url,
    provider,
    thumbnailUrl,
  };
}

function dedupeSlots(slots) {
  const bySlug = new Map();

  for (const slot of slots) {
    if (!slot?.slug) {
      continue;
    }

    const existing = bySlug.get(slot.slug);
    if (!existing) {
      bySlug.set(slot.slug, {
        ...slot,
        groupSlugs: [
          ...new Set(
            [...(slot.groupSlugs || []), slot.groupSlug].filter(Boolean)
          ),
        ],
      });
      continue;
    }

    const groupSlugs = [
      ...new Set(
        [...(existing.groupSlugs || [existing.groupSlug]), slot.groupSlug].filter(
          Boolean
        )
      ),
    ];
    const merged = mergeSlotRecords(existing, slot);
    const primary = primaryAllowedGroup(groupSlugs);
    bySlug.set(slot.slug, {
      ...merged,
      groupSlugs,
      groupSlug: primary?.slug || merged.groupSlug || existing.groupSlug,
      groupLabel: primary?.label || merged.groupLabel || existing.groupLabel,
      groupUrl: primary?.url || merged.groupUrl || existing.groupUrl,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function slotBelongsToGroup(slot, groupSlug) {
  if (!slot || !groupSlug) {
    return false;
  }

  if (slot.groupSlug === groupSlug) {
    return true;
  }

  return Array.isArray(slot.groupSlugs) && slot.groupSlugs.includes(groupSlug);
}

export function formatStakeCatalogError(error) {
  return error?.message || "Could not load Roobet slot catalog.";
}

export function getCatalogSectionCounts(catalog) {
  const slots = filterAllowedSlots(catalog?.slots);
  const unique = new Set(slots.map((slot) => slot.slug).filter(Boolean)).size;
  const groups =
    Array.isArray(catalog?.groups) && catalog.groups.length
      ? catalog.groups
      : ALLOWED_SLOT_GROUPS;
  const sections = groups
    .map((group) => ({
      slug: group.slug,
      label: group.label,
      count: slots.filter((slot) => slotBelongsToGroup(slot, group.slug)).length,
    }))
    .filter((section) => section.count > 0);

  return { sections, unique, total: slots.length };
}

async function readFallbackCatalog() {
  try {
    const raw = await fs.readFile(FALLBACK_CATALOG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const catalog = sanitizeCatalog({
      updatedAt: parsed.updatedAt,
      source: parsed.source || "fallback",
      groups: parsed.groups,
      slots: parsed.slots,
    });

    return catalog.slots.length ? catalog : null;
  } catch {
    return null;
  }
}

async function readFileThumbnailIndex() {
  try {
    const raw = await fs.readFile(THUMBNAIL_INDEX_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.thumbs && typeof parsed.thumbs === "object" ? parsed.thumbs : {};
  } catch {
    return {};
  }
}

async function readRedisThumbnailIndex() {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/get/${THUMBNAIL_INDEX_KEY}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.result) return null;

  try {
    const parsed = JSON.parse(data.result);
    return parsed?.thumbs && typeof parsed.thumbs === "object" ? parsed.thumbs : null;
  } catch {
    return null;
  }
}

async function readThumbnailIndex() {
  if (memoryThumbnailIndex) {
    return memoryThumbnailIndex;
  }

  const fileIndex = await readFileThumbnailIndex();
  const redisIndex = (await readRedisThumbnailIndex()) || {};
  memoryThumbnailIndex = { ...fileIndex, ...redisIndex };
  return memoryThumbnailIndex;
}

async function writeRedisThumbnailIndex(thumbs) {
  const config = getRedisConfig();
  if (!config || !thumbs || !Object.keys(thumbs).length) {
    return false;
  }

  const value = JSON.stringify({
    updatedAt: new Date().toISOString(),
    thumbs,
  });

  // Official Upstash REST form (same as users.js) — KV-style { value } bodies do not persist.
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", THUMBNAIL_INDEX_KEY, value]),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      "Redis thumbnail index save failed:",
      response.status,
      detail.slice(0, 300)
    );
    return false;
  }

  const data = await response.json().catch(() => ({}));
  return data.result === "OK";
}

function enrichSlotsWithThumbnailIndex(slots, index) {
  if (!index || !Object.keys(index).length) {
    return slots;
  }

  return slots.map((slot) => {
    if (slot.thumbnailUrl) {
      return slot;
    }

    const thumbnailUrl = normalizeSlotThumbnailUrl(index[slot.slug]);
    if (!thumbnailUrl) {
      return slot;
    }

    return { ...slot, thumbnailUrl };
  });
}

export async function resolveSlotThumbnail(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const index = await readThumbnailIndex();
  return normalizeSlotThumbnailUrl(index[normalizedSlug]);
}

async function enrichCatalogWithThumbnails(catalog) {
  if (!catalog?.slots?.length) {
    return catalog;
  }

  const stats = getSlotCatalogThumbnailStats(catalog.slots);
  if (stats.withThumbnails >= stats.total) {
    return catalog;
  }

  let slots = catalog.slots;
  const fallback = await readFallbackCatalog();
  if (fallback?.slots?.length) {
    const logosBySlug = new Map();
    for (const slot of fallback.slots) {
      const thumbnailUrl = normalizeSlotThumbnailUrl(slot?.thumbnailUrl);
      if (slot?.slug && thumbnailUrl) {
        logosBySlug.set(slot.slug, thumbnailUrl);
      }
    }
    if (logosBySlug.size) {
      slots = slots.map((slot) => {
        if (slot.thumbnailUrl) return slot;
        const thumbnailUrl = logosBySlug.get(slot.slug);
        return thumbnailUrl ? { ...slot, thumbnailUrl } : slot;
      });
    }
  }

  const afterFallback = getSlotCatalogThumbnailStats(slots);
  if (afterFallback.withThumbnails < afterFallback.total) {
    const index = await readThumbnailIndex();
    slots = enrichSlotsWithThumbnailIndex(slots, index);
  }

  return sanitizeCatalog({ ...catalog, slots });
}

async function updateThumbnailIndexFromSlots(slots) {
  const index = await readThumbnailIndex();
  let changed = false;

  for (const slot of filterAllowedSlots(slots)) {
    if (!slot.thumbnailUrl) {
      continue;
    }

    const thumbnailUrl = normalizeSlotThumbnailUrl(slot.thumbnailUrl);
    if (!thumbnailUrl || index[slot.slug] === thumbnailUrl) {
      continue;
    }

    index[slot.slug] = thumbnailUrl;
    changed = true;
  }

  if (!changed) {
    return;
  }

  memoryThumbnailIndex = index;
  await writeRedisThumbnailIndex(index).catch(() => {});
}

async function writeFallbackCatalog(catalog) {
  if (!catalog?.slots?.length) {
    return;
  }

  await fs.mkdir(path.dirname(FALLBACK_CATALOG_FILE), { recursive: true });
  await fs.writeFile(
    FALLBACK_CATALOG_FILE,
    JSON.stringify(
      {
        updatedAt: catalog.updatedAt,
        source: catalog.source,
        slots: catalog.slots.map((slot) => ({
          name: slot.name,
          slug: slot.slug,
          groupSlug: slot.groupSlug,
          groupLabel: slot.groupLabel,
          groupUrl: slot.groupUrl,
          provider: slot.provider || null,
          thumbnailUrl: slot.thumbnailUrl || null,
        })),
      },
      null,
      2
    )
  );
}

async function readRedisCatalog() {
  const config = getRedisConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/get/${CATALOG_KEY}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.result) return null;

  try {
    const raw = data.result;
    if (typeof raw !== "string") {
      return raw;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return JSON.parse(decodeURIComponent(raw));
    }
  } catch {
    return null;
  }
}

async function writeRedisCatalog(catalog) {
  const config = getRedisConfig();
  if (!config) return false;

  const value = JSON.stringify(catalog);

  // Official Upstash REST form for large values (same as users.js).
  // Path /set/key with { value } is Vercel KV-only and silently fails on Upstash.
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", CATALOG_KEY, value]),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      "Redis catalog save failed:",
      response.status,
      detail.slice(0, 300)
    );
    return false;
  }

  const data = await response.json().catch(() => ({}));
  return data.result === "OK";
}

async function readFileCatalog() {
  try {
    const raw = await fs.readFile(CATALOG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return buildEmptyCatalog();
  }
}

function remapSlotGroups(slot) {
  if (!slot || typeof slot !== "object") return null;
  const groupSlug = remapLegacyGroupSlug(slot.groupSlug);
  const group = findKnownGroup(groupSlug);
  if (!group || !isAllowedSlotGroup(group.slug)) return null;
  const groupSlugs = [
    ...new Set(
      (Array.isArray(slot.groupSlugs) ? slot.groupSlugs : [groupSlug])
        .map(remapLegacyGroupSlug)
        .filter(isAllowedSlotGroup)
    ),
  ];
  const primary = primaryAllowedGroup(groupSlugs) || group;
  return {
    ...slot,
    groupSlug: primary.slug,
    groupLabel: primary.label,
    groupUrl: primary.url,
    groupSlugs: groupSlugs.length ? groupSlugs : [primary.slug],
  };
}

function buildGroupsForSlots(slots, existingGroups = []) {
  const bySlug = new Map();

  const ensure = (group) => {
    if (!group?.slug || !isAllowedSlotGroup(group.slug)) return;
    if (!bySlug.has(group.slug)) {
      bySlug.set(group.slug, {
        slug: group.slug,
        label: group.label || labelFromCategory(group.slug.replace(/-/g, " ")),
        url: group.url || categoryGroupUrl(group.slug),
        tagSlug: group.tagSlug || null,
        slots: [],
      });
    }
  };

  for (const group of FEATURED_SLOT_GROUPS) ensure(group);
  for (const group of ALLOWED_SLOT_GROUPS) ensure(group);
  for (const group of existingGroups || []) {
    ensure({
      ...group,
      slug: remapLegacyGroupSlug(group.slug),
    });
  }
  for (const slot of slots || []) {
    ensure({
      slug: slot.groupSlug,
      label: slot.groupLabel,
      url: slot.groupUrl,
    });
    for (const slug of slot.groupSlugs || []) {
      ensure({ slug });
    }
  }

  const groups = [...bySlug.values()]
    .map((group) => {
      const groupSlots = slots.filter((slot) =>
        slotBelongsToGroup(slot, group.slug)
      );
      return { ...group, slots: groupSlots };
    })
    .filter(
      (group) =>
        group.slots.length > 0 ||
        FEATURED_SLOT_GROUPS.some((featured) => featured.slug === group.slug)
    )
    .sort((a, b) => {
      const featuredOrder = FEATURED_SLOT_GROUPS.map((group) => group.slug);
      const aFeat = featuredOrder.indexOf(a.slug);
      const bFeat = featuredOrder.indexOf(b.slug);
      if (aFeat !== -1 || bFeat !== -1) {
        if (aFeat === -1) return 1;
        if (bFeat === -1) return -1;
        return aFeat - bFeat;
      }
      if (a.slug === "slots") return -1;
      if (b.slug === "slots") return 1;
      return a.label.localeCompare(b.label);
    });

  registerGroupSlugs(groups);
  return groups;
}

function sanitizeCatalog(catalog) {
  if (!catalog || typeof catalog !== "object") {
    return buildEmptyCatalog();
  }

  registerGroupSlugs(catalog.groups);
  const remapped = (catalog.slots || []).map(remapSlotGroups).filter(Boolean);
  const slots = filterAllowedSlots(dedupeSlots(remapped));
  const groups = buildGroupsForSlots(slots, catalog.groups);

  return {
    ...catalog,
    scope: catalog.scope || null,
    groups,
    slots,
  };
}

function buildEmptyCatalog() {
  return {
    updatedAt: null,
    source: "empty",
    scope: null,
    groups: ALLOWED_SLOT_GROUPS.map((group) => ({
      ...group,
      slots: [],
    })),
    slots: [],
  };
}

async function getCachedCatalog() {
  let catalog = null;

  // Redis is shared across serverless instances. In-memory copies go stale
  // after another instance saves a sync.
  const redisCatalog = await readRedisCatalog();
  if (redisCatalog?.slots?.length) {
    catalog = sanitizeCatalog(redisCatalog);
  } else if (memoryCatalog?.slots?.length) {
    catalog = sanitizeCatalog(memoryCatalog);
  } else {
    const fileCatalog = await readFileCatalog();
    if (fileCatalog?.slots?.length) {
      catalog = sanitizeCatalog(fileCatalog);
    } else {
      const fallbackCatalog = await readFallbackCatalog();
      if (fallbackCatalog?.slots?.length) {
        catalog = fallbackCatalog;
      }
    }
  }

  if (!catalog?.slots?.length) {
    return null;
  }

  const enriched = await enrichCatalogWithThumbnails(catalog);
  memoryCatalog = enriched;
  return enriched;
}

async function writeFileCatalog(catalog) {
  await fs.mkdir(path.dirname(CATALOG_FILE), { recursive: true });
  await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog, null, 2));
}

export function findAllowedSlot(catalog, { slug, name }) {
  const slots = filterAllowedSlots(catalog?.slots);
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim().toLowerCase();

  return slots.find((slot) => {
    if (!isAllowedSlot(slot)) {
      return false;
    }

    if (normalizedSlug && slot.slug === normalizedSlug) {
      return true;
    }

    return normalizedName && slot.name.toLowerCase() === normalizedName;
  });
}

export function findAllowedSlotByQuery(catalog, query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) {
    return { slot: null, matches: [] };
  }

  const direct = findAllowedSlot(catalog, { slug: trimmed, name: trimmed });
  if (direct) {
    return { slot: direct, matches: [direct] };
  }

  const normalized = trimmed.toLowerCase();
  const slugQuery = normalized.replace(/\s+/g, "-");
  const matches = filterAllowedSlots(catalog?.slots).filter((slot) => {
    const slotName = slot.name.toLowerCase();
    return (
      slotName.includes(normalized) ||
      slot.slug.includes(slugQuery) ||
      slotName === normalized
    );
  });

  if (matches.length === 1) {
    return { slot: matches[0], matches };
  }

  return { slot: null, matches };
}

function catalogNeedsRoobetSync(catalog) {
  if (!catalog?.slots?.length) return true;
  if (String(catalog.source || "") !== "roobet") return true;
  if (String(catalog.scope || "") !== ROOBET_CATALOG_SCOPE) return true;
  const updatedAt = Date.parse(catalog.updatedAt || "");
  if (!Number.isFinite(updatedAt)) return true;
  return Date.now() - updatedAt > ROOBET_CATALOG_MAX_AGE_MS;
}

function gameTagSlugs(game) {
  return (Array.isArray(game?.tags) ? game.tags : [])
    .map((tag) => String(tag?.slug || "").trim().toLowerCase())
    .filter(Boolean);
}

function mapRoobetGameToSlot(game) {
  if (!game || typeof game !== "object") return null;

  const category = String(game.category || "").trim().toLowerCase();
  if (!category || EXCLUDED_ROOBET_CATEGORIES.has(category)) {
    return null;
  }

  const group = buildGroupFromCategory(category);
  const tags = new Set(gameTagSlugs(game));
  const groupSlugs = new Set([group.slug]);

  for (const featured of FEATURED_SLOT_GROUPS) {
    if (featured.tagSlug && tags.has(featured.tagSlug)) {
      groupSlugs.add(featured.slug);
    }
  }
  if (game.live) {
    groupSlugs.add("live-games");
  }

  const slot = normalizeSlot(
    {
      name: game.title,
      slug: game.slug,
      provider: game.provider,
      thumbnailUrl: game.squareImage,
    },
    group
  );
  if (!slot) return null;

  return {
    ...slot,
    groupSlugs: [...groupSlugs],
    live: Boolean(game.live),
    category: group.label,
  };
}

export async function syncRoobetAllowedSlotCatalog({ light = false } = {}) {
  const response = await fetch(ROOBET_ESSENTIALS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "vzqie-website/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Could not fetch Roobet game list (HTTP ${response.status}).`
    );
  }

  const games = await response.json();
  if (!Array.isArray(games) || !games.length) {
    throw new Error("Roobet returned an empty game list.");
  }

  const slots = filterAllowedSlots(
    dedupeSlots(
      games.map((game) => mapRoobetGameToSlot(game)).filter(Boolean)
    )
  );

  if (!slots.length) {
    throw new Error("No playable Roobet games found in the catalog response.");
  }

  const groups = buildGroupsForSlots(slots, [
    ...ALLOWED_SLOT_GROUPS,
    ...FEATURED_SLOT_GROUPS,
  ]);

  const catalog = sanitizeCatalog({
    updatedAt: new Date().toISOString(),
    source: "roobet",
    scope: ROOBET_CATALOG_SCOPE,
    slots,
    groups,
  });

  return saveCatalog(catalog, { light });
}

export async function getAllowedSlotCatalog() {
  const cached = await getCachedCatalog();
  if (cached?.slots?.length && !catalogNeedsRoobetSync(cached)) {
    return cached;
  }

  try {
    return await syncRoobetAllowedSlotCatalog();
  } catch (error) {
    console.error("Roobet catalog sync failed:", error?.message || error);
    if (cached?.slots?.length) {
      return cached;
    }
  }

  const fallback = await readFallbackCatalog();
  if (fallback?.slots?.length) {
    return saveCatalog(fallback);
  }

  return cached || buildEmptyCatalog();
}

function slugFromName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slotsFromLineList(text) {
  const slots = [];
  let currentGroup = null;

  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (
      trimmed === "new-games" ||
      trimmed === "bonus-buys" ||
      trimmed === "new-releases" ||
      trimmed === "only-on-stake"
    ) {
      const mapped =
        trimmed === "new-releases"
          ? "new-games"
          : trimmed === "only-on-stake"
            ? "bonus-buys"
            : trimmed;
      currentGroup = ALLOWED_SLOT_GROUPS.find((group) => group.slug === mapped);
      continue;
    }

    if (!currentGroup) {
      continue;
    }

    const slot = normalizeSlot(
      { name: trimmed, slug: slugFromName(trimmed) },
      currentGroup
    );
    if (slot) {
      slots.push(slot);
    }
  }

  return slots;
}

function slotsFromSimpleObject(parsed) {
  const slots = [];

  for (const group of ALLOWED_SLOT_GROUPS) {
    const names = parsed[group.slug];
    if (!Array.isArray(names)) {
      continue;
    }

    for (const name of names) {
      const slot = normalizeSlot(
        { name: String(name).trim(), slug: slugFromName(name) },
        group
      );
      if (slot) {
        slots.push(slot);
      }
    }
  }

  return slots;
}

function resolveGroupFromLabel(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (
    normalized.includes("bonus buy") ||
    normalized.includes("only on stake")
  ) {
    return findKnownGroup("bonus-buys");
  }
  if (
    normalized.includes("new game") ||
    normalized.includes("new release")
  ) {
    return findKnownGroup("new-games");
  }
  if (normalized.includes("live")) {
    return findKnownGroup("live-games");
  }
  if (normalized.includes("game show")) {
    return findKnownGroup("game-shows");
  }
  if (normalized) {
    return buildGroupFromCategory(normalized);
  }
  return null;
}

function slotsFromGraphqlPayload(payload, fallbackGroupSlug) {
  const groupNode = payload?.data?.slugKuratorGroup;
  if (!groupNode) {
    return [];
  }

  const group =
    resolveGroupFromLabel(groupNode.name) ||
    ALLOWED_SLOT_GROUPS.find((entry) => entry.slug === fallbackGroupSlug);

  if (!group) {
    return [];
  }

  return (groupNode.groupGamesList || [])
    .map((entry) => normalizeSlot(entry?.game, group))
    .filter(Boolean);
}

function slotsFromRawList(list) {
  return list
    .map((raw) => {
      const group = ALLOWED_SLOT_GROUPS.find((entry) => entry.slug === raw.groupSlug);
      if (!group) {
        return null;
      }

      return normalizeSlot(raw, group);
    })
    .filter(Boolean);
}

export function extractSlotsFromImport(payload) {
  const slots = [];

  function addFromValue(value, fallbackGroupSlug) {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        addFromValue(item, fallbackGroupSlug);
      }
      return;
    }

    if (value?.data?.slugKuratorGroup) {
      slots.push(...slotsFromGraphqlPayload(value, fallbackGroupSlug));
      return;
    }

    if (Array.isArray(value.slots)) {
      slots.push(...slotsFromRawList(value.slots));
      return;
    }

    if (value.name && value.slug && value.groupSlug) {
      slots.push(...slotsFromRawList([value]));
    }
  }

  let parsed = payload;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      slots.push(...slotsFromLineList(parsed));
      return filterAllowedSlots(dedupeSlots(slots));
    }
  }

  if (parsed?.text) {
    slots.push(...slotsFromLineList(parsed.text));
  }

  if (
    parsed?.["new-games"] ||
    parsed?.["bonus-buys"] ||
    parsed?.["new-releases"] ||
    parsed?.["only-on-stake"]
  ) {
    const normalizedPayload = {
      ...parsed,
      "new-games": parsed["new-games"] || parsed["new-releases"],
      "bonus-buys": parsed["bonus-buys"] || parsed["only-on-stake"],
    };
    slots.push(...slotsFromSimpleObject(normalizedPayload));
  }

  if (parsed?.newReleases || parsed?.newGames) {
    addFromValue(parsed.newGames || parsed.newReleases, "new-games");
  }
  if (parsed?.onlyOnStake || parsed?.bonusBuys) {
    addFromValue(parsed.bonusBuys || parsed.onlyOnStake, "bonus-buys");
  }
  if (parsed?.imports) {
    addFromValue(parsed.imports);
  }
  if (parsed?.graphql) {
    addFromValue(parsed.graphql);
  }

  addFromValue(parsed);

  return filterAllowedSlots(dedupeSlots(slots));
}

async function saveCatalog(catalog, { light = false } = {}) {
  const enriched = light ? sanitizeCatalog(catalog) : await enrichCatalogWithThumbnails(catalog);
  memoryCatalog = enriched;

  const redisConfigured = Boolean(getRedisConfig());
  const redisOk = await writeRedisCatalog(enriched).catch((error) => {
    console.error("Redis catalog save error:", error?.message || error);
    return false;
  });

  if (redisConfigured && !redisOk) {
    throw new Error(
      "Could not save slot catalog to Redis. Check Upstash connection or quota, then sync again."
    );
  }

  if (!light) {
    await writeFileCatalog(enriched).catch(() => {});
    await writeFallbackCatalog(enriched).catch(() => {});
    await updateThumbnailIndexFromSlots(enriched.slots).catch(() => {});
  }
  return enriched;
}

export async function persistSlotCatalog(catalog) {
  return saveCatalog(sanitizeCatalog(catalog || buildEmptyCatalog()));
}

export async function importAllowedSlotCatalog(payload, { light = false } = {}) {
  let parsed = payload;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = { text: payload };
    }
  }

  const slots = extractSlotsFromImport(parsed);
  if (!slots.length) {
    throw new Error(
      "No valid games found. Sync from Roobet, or import playable Roobet games."
    );
  }

  const existing = light
    ? sanitizeCatalog((await readRedisCatalog()) || memoryCatalog || buildEmptyCatalog())
    : (await getCachedCatalog()) || buildEmptyCatalog();
  const catalog = mergeSlotCatalogs(existing, slots);

  if (!catalog.slots.length) {
    throw new Error(
      "Imported games must be playable titles from Roobet."
    );
  }

  catalog.updatedAt = new Date().toISOString();
  catalog.source = "import";

  return saveCatalog(catalog, { light });
}
