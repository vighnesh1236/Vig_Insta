# Vig_Insta

Vig_Insta is an original social app foundation built with Expo, React Native, TypeScript, Express, Prisma, and PostgreSQL.

## Current implementation

- Expo Router mobile app with Home, Explore, Create, Reels, and Profile tabs, secure token storage, and account registration/login.
- Express API with health, account registration/login, and persistent feed/post endpoints.
- Prisma/PostgreSQL schema for accounts, follows, posts, media metadata, likes, comments, conversations, and messages.
- Password hashing and signed bearer tokens.
- Helmet security headers, origin allow-listing, and per-route rate limits.
- Persistent one-to-one conversations with recipient inbox visibility and near-live message refresh.
- Light/dark theme toggle, saved across app sessions.

The photo/video SDKs are installed, but actual uploads and media processing need a configured storage provider. Push delivery, realtime messaging, and live streaming also need their provider credentials and are not represented as working features yet.

## API endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (bearer token required)
- `GET /api/v1/posts`
- `POST /api/v1/posts` (bearer token required)
- `POST /api/v1/posts/:postId/like` (bearer token required)
- `POST /api/v1/posts/:postId/comments` (bearer token required)
- `POST /api/v1/users/:userId/follow` (bearer token required)
- `GET /api/v1/conversations` (bearer token required)
- `POST /api/v1/conversations` with `{ "username": "..." }` (bearer token required)
- `GET /api/v1/conversations/:conversationId/messages` (bearer token required)
- `POST /api/v1/conversations/:conversationId/messages` with `{ "body": "..." }` (bearer token required)

## Licensed F1 demo media

Run `npm run db:seed` to add three Max Verstappen photos and two short video posts from Wikimedia Commons. The app references the original hosted files and displays creator, source, and license details in each post; it does not redistribute downloaded copies. The media is shared under CC BY 2.0, CC BY-SA 2.0, and CC BY-SA 4.0 as credited in the post captions. Review the source and license before reusing or adapting any asset. The demo creator account uses a random inaccessible password and is only for sample posts.

## Requirements

- Node.js 22.13+
- npm 10+
- A Neon PostgreSQL database

The tested Node.js version is recorded in `.nvmrc`.

## Setup

1. Copy `.env.example` to `services/api/.env`. Set `DATABASE_URL` to Neon’s pooled connection URL, `DIRECT_URL` to its direct connection URL for migrations, and a strong `JWT_ACCESS_SECRET`.
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env`; set the API URL reachable from the device.
3. Install dependencies with `npm install`.
4. Generate Prisma Client and validate the schema:

   ```powershell
   npm run db:generate
   npm run db:validate
   ```

5. Create and apply a versioned migration after confirming the target database is the intended one:

   ```powershell
   npm run db:migrate
   ```

   For future schema changes, create migrations locally with `npm run db:migrate:dev -w @vig-insta/api -- --name descriptive_change`, review the generated SQL, and commit it before deployment.

6. Start the API with `npm run dev:api` and the Expo app with `npm run dev:mobile`.
7. For a physical phone, use the computer's LAN IP instead of `localhost`.

The API listens on port 4000 by default. Never commit `.env` or use a production database for development experiments.

The database URL supplied during setup has been used to apply the initial migration. Since credentials pasted into chat should be treated as exposed, rotate the Neon password and update both `DATABASE_URL` and `DIRECT_URL` in `services/api/.env` before continued use.
