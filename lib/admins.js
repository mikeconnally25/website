const DEFAULT_ADMIN_USERNAMES = ["captainbonk", "vzqie"];
const DEFAULT_ADMIN_USER_IDS = ["18635"];

function getAdminUsernames() {
  const fromEnv = String(process.env.ADMIN_KICK_USERNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ADMIN_USERNAMES, ...fromEnv])];
}

function getAdminUserIds() {
  const fromEnv = String(process.env.ADMIN_KICK_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const broadcaster = String(process.env.KICK_BROADCASTER_USER_ID || "").trim();

  return [
    ...new Set([
      ...DEFAULT_ADMIN_USER_IDS,
      ...fromEnv,
      ...(broadcaster ? [broadcaster] : []),
    ]),
  ];
}

export function isKickAdmin(kickProfile) {
  if (!kickProfile || typeof kickProfile !== "object") return false;

  const username = String(
    kickProfile.name || kickProfile.username || ""
  )
    .trim()
    .toLowerCase();
  const userId = String(
    kickProfile.user_id ||
      kickProfile.kickUserId ||
      kickProfile.id ||
      kickProfile.userId ||
      ""
  ).trim();

  return (
    (userId && getAdminUserIds().includes(userId)) ||
    (username && getAdminUsernames().includes(username))
  );
}
