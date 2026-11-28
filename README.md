# CaptainBonk Website

Streamer site for **CaptainBonk**, based on the structure of [blakjac21-website](https://github.com/mikeconnally25/blakjac21-website) with your branding and links.

## Links

- Kick: https://kick.com/captainbonk
- Discord: https://discord.gg/akt6jhgCu

## Run locally

```bash
cd website
npm install
cp .env.example .env
npm run dev
```

Default port is **3848**. Open http://localhost:3848

On Vercel, static pages are served from the repo root and APIs from `/api/*`. `local-server.js` is for local development only (do not use Express as the Vercel framework preset — use **Other**).

## Kick auth / admin features

House games, chat, and admin tools need Kick OAuth credentials in `.env`.

### Create a Kick developer app

1. Log into Kick as **CaptainBonk** and enable **2FA** (required for the developer portal).
2. Open [kick.com/settings/developer](https://kick.com/settings/developer).
3. Create an app (name can be `CaptainBonk website`).
4. Set the **Redirect URL** to exactly one of:
   - Local: `http://localhost:3848/api/auth/callback`
   - Live (example): `https://website-captainbonk.vercel.app/api/auth/callback`
5. Copy the **Client ID** and **Client Secret**.

### Fill `.env` (local)

```env
KICK_CLIENT_ID=paste_client_id_here
KICK_CLIENT_SECRET=paste_client_secret_here
KICK_REDIRECT_URI=http://localhost:3848/api/auth/callback
SESSION_SECRET=any-long-random-string
ADMIN_KICK_USERNAMES=captainbonk,vzqie
```

Restart `npm run dev`, then open http://localhost:3848 and click **Sign in with Kick**.

### Production (Vercel)

Add the same vars in the Vercel project → Settings → Environment Variables, with:

```env
SITE_URL=https://www.captainbonk.com
KICK_REDIRECT_URI=https://www.captainbonk.com/api/auth/callback
```

Update the Kick app Redirect URL to that same production callback (Kick usually allows one redirect per app — switch it when you go live, or create a second Kick app for local).

Without real Client ID/Secret, public pages still load; sign-in stays broken.

## Affiliate roster (Roobet / code `CaptainBonk`)

AFF badges and auto-verify no longer use the old Stake Google Sheet. They look up Roobet usernames for affiliate code **CaptainBonk**.

Configure one of:

1. **Admin paste** — Accounts page → Roobet AFF roster (saved in Redis).
2. **Remote URL** — set `AFFILIATE_ROSTER_URL` to a public Google Sheet gviz URL or a JSON username list.
3. **Sheet id** — `AFFILIATE_SHEET_ID` + optional `AFFILIATE_SHEET_GID`.

Optional overrides: `AFFILIATE_SITE=roobet`, `AFFILIATE_CODE=CaptainBonk`. Weekly raffle wager sheets use `AFFILIATE_RAFFLE_ROSTER_URL` / `AFFILIATE_RAFFLE_SHEET_GID` (no hardcoded Stake sheet).

## What’s included

Same layout family as the reference site: house games, live Kick player, Discord/Kick links, community chat UI, giveaways, leaderboards, store, slot tools, and related API routes.
