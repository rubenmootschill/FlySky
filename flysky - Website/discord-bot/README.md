# Discord Bot

A standalone Discord bot for FlySky that handles:
- Pilot rank role syncing
- PIREP acceptance announcements  
- Live flight notifications
- Slash commands for pilot stats

## Setup

1. Create a Discord Application at https://discord.com/developers/applications
2. Add a Bot, copy the token
3. Set `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` in `.env.local`
4. Invite the bot to your server with `bot` + `applications.commands` scopes

## Run

```bash
node discord-bot/bot.js
```

Or use PM2 in production:
```bash
pm2 start discord-bot/bot.js --name flysky-bot
```
