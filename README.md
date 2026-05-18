# LifeOS

A minimalist personal operating system for managing projects, habits, fitness, finance, study, and more. Built with Next.js, IndexedDB (Dexie), and optional PostgreSQL (Prisma) for cloud sync.

## Quick start

```bash
cd LifeOS
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL and SESSION_SECRET for shared multi-user hosting
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) (use `127.0.0.1` instead of `localhost` for Spotify OAuth in development).

### First launch

1. **Create account** — name, email, and a **4-digit PIN**.
2. **Sign in** — enter your PIN. If someone else uses the same PIN, you’ll pick your account by name and masked email.
3. Add API keys under **Settings** (Gemini, GitHub, Spotify).

**Local-only mode** (no `DATABASE_URL`): accounts are stored in your browser. Fine for solo dev; use Postgres for production multi-user hosting.

## Cloud backup (optional)

For multi-device sync, connect a PostgreSQL database:

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` in `.env` to your Postgres connection string (Supabase, Neon, Railway, etc.).

3. Run migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. Restart the dev server.

5. In the app: **Settings → Cloud backup & sync** → enable the toggle (or use **One-time cloud migration** to upload existing local data).

Each self-hosted deployment is a single-user instance: one database per person/deployment. Data is not shared between different users on the same server unless you add your own authentication layer.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (hosted) | PostgreSQL URL for accounts & cloud sync |
| `SESSION_SECRET` | Yes (hosted) | Signs login session cookies |
| `APPLE_HEALTH_SECRET` | No | Secret for `/api/health-sync` (Apple Health shortcuts) |

See [.env.example](.env.example) for details.

## Integrations

- **Gemini** — AI copilot (API key in Settings)
- **GitHub** — activity & contributions (PAT + username in Settings)
- **Spotify** — playback widget ([developer dashboard](https://developer.spotify.com/dashboard); redirect URI shown in Settings)
- **Apple Health** — via iOS Shortcut to `/api/health-sync` (requires `DATABASE_URL` + `APPLE_HEALTH_SECRET`)

Setup notes: [public/integrations-setup-guide.md](public/integrations-setup-guide.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx prisma migrate deploy` | Apply database migrations |
| `npx prisma studio` | Open Prisma database GUI |

## Deploying

Deploy to Vercel, Railway, or any Node host that supports Next.js:

1. Set `DATABASE_URL` in the host environment (if using cloud sync).
2. Run `prisma migrate deploy` as part of your build or release step.
3. Users enable cloud backup in Settings after first login.

## Architecture

- **Client**: IndexedDB via Dexie (primary storage)
- **Server**: Next.js API routes + Prisma → PostgreSQL (optional cloud layer)
- **Sync**: Opt-in via `cloudBackupEnabled` in user settings; only runs when `DATABASE_URL` is configured

## License

Private / personal project — adjust as needed for your distribution.
