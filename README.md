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

## Kick auth / admin features

House games, chat, and admin tools need Kick OAuth credentials in `.env`:

- `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET`
- `KICK_BROADCASTER_USER_ID`
- `SESSION_SECRET`
- `ADMIN_KICK_USERNAMES=vzqie`

Without those, the public pages (home, watch embed, social links) still load; sign-in and coin features stay locked until credentials are set.

## What’s included

Same layout family as the reference site: house games, live Kick player, Discord/Kick links, community chat UI, giveaways, leaderboards, store, slot tools, and related API routes.
