# Vig_Insta

Vig_Insta is an original social app foundation built with Expo, React Native, TypeScript, Express, Prisma, and PostgreSQL.

## Current implementation

- Expo Router mobile app with Home, Explore, Create, Reels, and Profile tabs, secure token storage, and account registration/login.
- Express API with health, account registration/login, authenticated user discovery, and persistent feed/post endpoints.
- Prisma/PostgreSQL schema for accounts, follows, posts, media metadata, likes, comments, conversations, and messages.
- Password hashing and signed bearer tokens.
- Helmet security headers, origin allow-listing, and per-route rate limits.
- Persistent one-to-one conversations with recipient inbox visibility, authenticated Socket.IO live updates, and polling fallback (2.5 seconds when disconnected, 5 seconds for inbox previews).
- Light/dark theme toggle, saved across app sessions.

The photo/video SDKs are installed, but actual uploads and media processing need a configured storage provider. Incoming messages show an in-app popup while the app is open; no operating-system or push notifications are sent. Live streaming needs provider credentials and is not represented as a working feature yet.

## API endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` (bearer token required)
- `GET /api/v1/users?search=...` (bearer token required; searches usernames and display names)
- `GET /api/v1/posts`
- `POST /api/v1/posts` (bearer token required)
- `POST /api/v1/posts/:postId/like` (bearer token required)
- `POST /api/v1/posts/:postId/comments` (bearer token required)
- `POST /api/v1/users/:userId/follow` (bearer token required)
- `GET /api/v1/conversations` (bearer token required)
- `POST /api/v1/conversations` with `{ "username": "..." }` (bearer token required)
- `GET /api/v1/conversations/:conversationId/messages` (bearer token required)
- `POST /api/v1/conversations/:conversationId/messages` with `{ "body": "..." }` (bearer token required)

## Licensed demo media

Run `npm run db:seed` to add five F1 media posts and four film/TV actor photos from Wikimedia Commons, including the Avengers: Age of Ultron cast, Bryan Cranston and Aaron Paul (Breaking Bad), and Michael C. Hall (Dexter). Each caption credits the photographer and links to the source file and license (CC BY 2.0, CC BY 4.0, CC BY-SA 2.0, or CC BY-SA 3.0). The app references the original hosted files and does not redistribute downloaded copies. Review the linked terms before reusing or adapting any asset. The demo creator account uses a random inaccessible password and is only for sample posts.

## Deploy to Render

The root `render.yaml` deploys the Expo web export and Express API together as one Render web service. On web, the Profile QR code automatically points to the current app URL. For native builds, set `EXPO_PUBLIC_APP_URL` to the deployed app URL. Start the Render Blueprint flow here:

**[Deploy Vig_Insta with Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fvighnesh1236%2FVig_Insta)**

Sign in to Render, connect the GitHub repository if prompted, review the blueprint, and provide these secret values when prompted:

- `DATABASE_URL`: Neon pooled PostgreSQL connection URL.
- `DIRECT_URL`: Neon direct PostgreSQL connection URL for migrations.

Render generates `JWT_ACCESS_SECRET`. The build exports the web app with `/api/v1` as its API base, so the browser uses the same Render host. The start command applies committed Prisma migrations before launching the server. After the first successful deploy, seed sample posts from a trusted local machine configured with the same database using `npm run db:seed`.

For native iOS/Android builds, set `EXPO_PUBLIC_API_BASE_URL` to the deployed Render API URL plus `/api/v1` in the mobile build environment; `/api/v1` by itself is for the colocated web build.

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
