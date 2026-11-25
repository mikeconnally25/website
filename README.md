# vzqie Website

Streamer site for **vzqie**, based on the structure of [blakjac21-website](https://github.com/mikeconnally25/blakjac21-website) with your branding and links.

## Links

- Kick: https://kick.com/vzqie
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

1. Log into Kick as **vzqie** and enable **2FA** (required for the developer portal).
2. Open [kick.com/settings/developer](https://kick.com/settings/developer).
3. Create an app (name can be `vzqie website`).
4. Set the **Redirect URL** to exactly one of:
   - Local: `http://localhost:3848/api/auth/callback`
   - Live (example): `https://website-vzqie.vercel.app/api/auth/callback`
5. Copy the **Client ID** and **Client Secret**.

### Fill `.env` (local)

```env
KICK_CLIENT_ID=paste_client_id_here
KICK_CLIENT_SECRET=paste_client_secret_here
KICK_REDIRECT_URI=http://localhost:3848/api/auth/callback
SESSION_SECRET=any-long-random-string
ADMIN_KICK_USERNAMES=vzqie
```

Restart `npm run dev`, then open http://localhost:3848 and click **Sign in with Kick**.

### Production (Vercel)

Add the same vars in the Vercel project → Settings → Environment Variables, with:

```env
KICK_REDIRECT_URI=https://YOUR-VERCEL-DOMAIN/api/auth/callback
```

Update the Kick app Redirect URL to that same production callback (Kick usually allows one redirect per app — switch it when you go live, or create a second Kick app for local).

Without real Client ID/Secret, public pages still load; sign-in stays broken.

## What’s included

Same layout family as the reference site: house games, live Kick player, Discord/Kick links, community chat UI, giveaways, leaderboards, store, slot tools, and related API routes.
