/** Roobet rewards ranks + vzqie streamer bonuses (mapped from prior Stake tiers). */
const ROOBET_LEVELS = [
  { id: "beginner", tier: "beginner", name: "Beginner", wager: 0 },
  { id: "silver-1", tier: "silver", name: "Silver I", wager: 1000, roman: "I" },
  { id: "silver-2", tier: "silver", name: "Silver II", wager: 2700, roman: "II" },
  { id: "silver-3", tier: "silver", name: "Silver III", wager: 5500, roman: "III" },
  {
    id: "silver-4",
    tier: "silver",
    name: "Silver IV",
    wager: 10000,
    roman: "IV",
    roobetBonus: 15,
    vzqieBonus: 15,
  },
  { id: "gold-1", tier: "gold", name: "Gold I", wager: 18500, roman: "I" },
  { id: "gold-2", tier: "gold", name: "Gold II", wager: 32000, roman: "II" },
  {
    id: "gold-3",
    tier: "gold",
    name: "Gold III",
    wager: 56000,
    roman: "III",
    roobetBonus: 50,
    vzqieBonus: 50,
  },
  {
    id: "gold-4",
    tier: "gold",
    name: "Gold IV",
    wager: 95000,
    roman: "IV",
    roobetBonus: 100,
    vzqieBonus: 75,
  },
  { id: "emerald-1", tier: "emerald", name: "Emerald I", wager: 160000, roman: "I" },
  {
    id: "emerald-2",
    tier: "emerald",
    name: "Emerald II",
    wager: 275000,
    roman: "II",
    roobetBonus: 200,
    vzqieBonus: 100,
  },
  {
    id: "emerald-3",
    tier: "emerald",
    name: "Emerald III",
    wager: 460000,
    roman: "III",
    roobetBonus: 400,
    vzqieBonus: 200,
  },
  {
    id: "ruby-1",
    tier: "ruby",
    name: "Ruby I",
    wager: 785000,
    roman: "I",
    roobetBonus: 800,
    vzqieBonus: 400,
  },
  { id: "ruby-2", tier: "ruby", name: "Ruby II", wager: 1300000, roman: "II" },
  {
    id: "ruby-3",
    tier: "ruby",
    name: "Ruby III",
    wager: 2250000,
    roman: "III",
    roobetBonus: 1600,
    vzqieBonus: 800,
    reload: true,
  },
  {
    id: "diamond-1",
    tier: "diamond",
    name: "Diamond I",
    wager: 3800000,
    roman: "I",
    roobetBonus: 3200,
    vzqieBonus: 1600,
    reload: true,
  },
  { id: "diamond-2", tier: "diamond", name: "Diamond II", wager: 6500000, roman: "II", reload: true },
  {
    id: "diamond-3",
    tier: "diamond",
    name: "Diamond III",
    wager: 10000000,
    roman: "III",
    roobetBonus: 6400,
    vzqieBonus: 3200,
    reload: true,
  },
  { id: "champion-1", tier: "champion", name: "Champion I", wager: 18000000, roman: "I", reload: true },
  {
    id: "champion-2",
    tier: "champion",
    name: "Champion II",
    wager: 30000000,
    roman: "II",
    roobetBonus: 12800,
    vzqieBonus: 6400,
    reload: true,
  },
  {
    id: "champion-3",
    tier: "champion",
    name: "Champion III",
    wager: 50000000,
    roman: "III",
    roobetBonus: 25600,
    vzqieBonus: 12800,
    reload: true,
  },
  {
    id: "legend-1",
    tier: "legend",
    name: "Legend I",
    wager: 88000000,
    roman: "I",
    roobetBonus: 51200,
    vzqieBonus: 20000,
    reload: true,
  },
  {
    id: "legend-2",
    tier: "legend",
    name: "Legend II",
    wager: 150000000,
    roman: "II",
    roobetBonus: 102400,
    vzqieBonus: 30000,
    reload: true,
  },
  {
    id: "legend-3",
    tier: "legend",
    name: "Legend III",
    wager: 250000000,
    roman: "III",
    roobetBonus: 204800,
    vzqieBonus: 40000,
    reload: true,
  },
  {
    id: "master-1",
    tier: "master",
    name: "Master I",
    wager: 425000000,
    roman: "I",
    roobetBonus: 409600,
    vzqieBonus: 80000,
    reload: true,
  },
  { id: "master-2", tier: "master", name: "Master II", wager: 720000000, roman: "II", reload: true },
  { id: "master-3", tier: "master", name: "Master III", wager: 1200000000, roman: "III", reload: true },
  {
    id: "grandmaster-1",
    tier: "grandmaster",
    name: "Grandmaster I",
    wager: 2000000000,
    roman: "I",
    reload: true,
  },
  {
    id: "grandmaster-2",
    tier: "grandmaster",
    name: "Grandmaster II",
    wager: 3500000000,
    roman: "II",
    reload: true,
  },
  {
    id: "grandmaster-3",
    tier: "grandmaster",
    name: "Grandmaster III",
    wager: 6000000000,
    roman: "III",
    reload: true,
  },
  { id: "immortal", tier: "immortal", name: "Immortal", wager: 10000000000, reload: true },
];

const TIER_COLORS = {
  beginner: { main: "#9aa3b2", glow: "#9aa3b2", deep: "#3a4250" },
  silver: { main: "#c8d4dc", glow: "#e8eef4", deep: "#6a7884" },
  gold: { main: "#f0c020", glow: "#ffe066", deep: "#a07810" },
  emerald: { main: "#2fd48a", glow: "#7dffc0", deep: "#0d6b45" },
  ruby: { main: "#f0456a", glow: "#ff8aa4", deep: "#8a1234" },
  diamond: { main: "#5ec8ff", glow: "#c5eeff", deep: "#1a6aa0" },
  champion: { main: "#ff8a2a", glow: "#ffc078", deep: "#9a4510" },
  legend: { main: "#b06cff", glow: "#d8b0ff", deep: "#5a28a0" },
  master: { main: "#4f7cff", glow: "#9cbcff", deep: "#1e3a9a" },
  grandmaster: { main: "#2ad4d4", glow: "#9af0f0", deep: "#0a6a6a" },
  immortal: { main: "#ffe9a0", glow: "#ffffff", deep: "#b08a20" },
};

function formatUsd(value) {
  if (!Number.isFinite(value) || value <= 0) return "$0";
  if (value >= 1_000_000_000) {
    const n = value / 1_000_000_000;
    return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    const n = value / 1_000_000;
    return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}M`;
  }
  return `$${value.toLocaleString("en-US")}`;
}

function formatMoney(value) {
  return `$${Number(value).toLocaleString("en-US")}`;
}

function rewardCopy(level) {
  if (level.roobetBonus != null && level.vzqieBonus != null) {
    const reload = level.reload
      ? " + recent gameplay bonus + daily reload bonus"
      : " + recent gameplay bonus";
    return `<strong>Roobet</strong> Gives <strong>${formatMoney(
      level.roobetBonus
    )}</strong>${reload} &amp; <strong>vzqie</strong> gives <strong>${formatMoney(
      level.vzqieBonus
    )}</strong> extra on top.`;
  }
  if (level.wager === 0) {
    return "Starting rank on Roobet. Keep wagering under code <strong>vzqie</strong> to climb.";
  }
  return "Roobet rank-up bonus varies by play. Open a Discord ticket when you hit this rank for the vzqie bonus.";
}

function iconSvg(level) {
  const c = TIER_COLORS[level.tier] || TIER_COLORS.beginner;
  const uid = level.id.replace(/[^a-z0-9]/gi, "");
  const roman = level.roman
    ? `<text x="32" y="37" text-anchor="middle" fill="#061018" font-size="13" font-weight="800" font-family="Inter,system-ui,sans-serif">${level.roman}</text>`
    : "";

  if (level.tier === "beginner") {
    return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill="${c.deep}" stroke="${c.main}" stroke-width="2"/>
      <circle cx="32" cy="32" r="10" fill="${c.main}" opacity=".35"/>
    </svg>`;
  }

  if (level.tier === "silver" || level.tier === "gold") {
    return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}-g" cx="32" cy="32" r="26" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}-f" x1="18" y1="10" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}"/><stop offset=".45" stop-color="${c.main}"/><stop offset="1" stop-color="${c.deep}"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#${uid}-g)"/>
      <path d="M32 8l6.4 13.2L54 23.2l-11 10.8 2.6 15.2L32 41.2 18.4 49.2l2.6-15.2-11-10.8 15.6-2L32 8z" fill="url(#${uid}-f)" stroke="${c.glow}" stroke-width="1.2" stroke-linejoin="round"/>
      ${roman}
    </svg>`;
  }

  if (level.tier === "emerald" || level.tier === "ruby" || level.tier === "grandmaster") {
    return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}-g" cx="32" cy="30" r="26" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}" stop-opacity=".5"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}-f" x1="32" y1="10" x2="32" y2="54" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}"/><stop offset=".4" stop-color="${c.main}"/><stop offset="1" stop-color="${c.deep}"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#${uid}-g)"/>
      <path d="M32 8 L52 24 L44 52 L20 52 L12 24 Z" fill="url(#${uid}-f)" stroke="${c.glow}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M32 8 L40 24 L24 24 Z" fill="#fff" opacity=".28"/>
      ${roman}
    </svg>`;
  }

  if (level.tier === "diamond") {
    return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}-g" cx="32" cy="30" r="26" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}" stop-opacity=".45"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}-f" x1="32" y1="8" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop stop-color="#f7fbff"/><stop offset=".4" stop-color="${c.main}"/><stop offset="1" stop-color="${c.deep}"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#${uid}-g)"/>
      <path d="M18 24L24.5 15.5 28.5 9.5 31 14.5 36.5 13.5 46 24 32 55.5Z" fill="url(#${uid}-f)" stroke="${c.glow}" stroke-width="1" stroke-linejoin="round"/>
      <path d="M24.5 15.5 28.5 9.5 31 14.5 36.5 13.5 28.8 24.2Z" fill="#fff" opacity=".4"/>
      ${roman}
    </svg>`;
  }

  if (level.tier === "champion") {
    return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}-g" cx="32" cy="32" r="26" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}-f" x1="20" y1="12" x2="44" y2="52" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}"/><stop offset=".5" stop-color="${c.main}"/><stop offset="1" stop-color="${c.deep}"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#${uid}-g)"/>
      <path d="M32 10l4 10 10.5 1.5-7.5 7.3 1.8 10.7L32 34.2 23.2 39.5l1.8-10.7-7.5-7.3L28 20z" fill="url(#${uid}-f)" stroke="${c.glow}" stroke-width="1.2"/>
      <path d="M22 44h20v4H22z" fill="${c.main}"/><path d="M26 48h12v4H26z" fill="${c.deep}"/>
      ${roman}
    </svg>`;
  }

  if (level.tier === "legend" || level.tier === "master") {
    return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="${uid}-g" cx="32" cy="28" r="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}" stop-opacity=".5"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${uid}-f" x1="18" y1="12" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop stop-color="${c.glow}"/><stop offset=".4" stop-color="${c.main}"/><stop offset="1" stop-color="${c.deep}"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#${uid}-g)"/>
      <path d="M32 9l7 11 13 2-9 9 2 13-13-7-13 7 2-13-9-9 13-2z" fill="url(#${uid}-f)" stroke="${c.glow}" stroke-width="1.2" stroke-linejoin="round"/>
      ${roman}
    </svg>`;
  }

  // immortal
  return `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="${uid}-g" cx="32" cy="32" r="28" gradientUnits="userSpaceOnUse">
        <stop stop-color="${c.glow}" stop-opacity=".7"/><stop offset=".55" stop-color="${c.main}" stop-opacity=".25"/><stop offset="1" stop-color="${c.main}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${uid}-f" x1="20" y1="12" x2="44" y2="52" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff"/><stop offset=".45" stop-color="${c.main}"/><stop offset="1" stop-color="${c.deep}"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#${uid}-g)"/>
    <path d="M32 6l3.2 14.2L49 14l-8.2 12.2L55 32l-14.2 2.2L49 50l-13.8-6.2L32 58l-3.2-14.2L15 50l8.2-12.2L9 32l14.2-2.2L15 14l13.8 6.2z" fill="url(#${uid}-f)" stroke="#fff" stroke-width="1"/>
  </svg>`;
}

function renderLevels() {
  const grid = document.getElementById("level-up-grid");
  if (!grid) return;

  grid.replaceChildren();
  for (const level of ROOBET_LEVELS) {
    const card = document.createElement("article");
    card.className = "level-up-card";
    card.dataset.tier = level.tier;
    card.innerHTML = `
      <div class="level-up-card-top">
        <span class="level-up-icon" aria-hidden="true">${iconSvg(level)}</span>
        <div class="level-up-card-meta">
          <span class="level-up-badge">${level.name}</span>
          <p class="level-up-wager">${formatUsd(level.wager)} Wagered</p>
        </div>
      </div>
      <p class="level-up-copy">${rewardCopy(level)}</p>
    `;
    grid.append(card);
  }
}

renderLevels();
