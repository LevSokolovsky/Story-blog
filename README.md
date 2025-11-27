# Story

Story is a modern, lightweight blogging shell built for Netlify-style hosting. It ships with a secure, dependency-free Node API for authentication plus a clean, light-green/light-blue interface for signup, login, and guest access. Explore, drafts, and profile views are scaffolded with 403 placeholders until they're ready.

## Features
- ✅ Secure signup & login using PBKDF2 password hashing and HMAC-signed tokens (no external packages required).
- ✅ Avatar selection gallery + custom image URL on signup.
- ✅ Guest login to explore Story without creating an account.
- ✅ Responsive, modern UI with a calming palette.
- 🚧 Explore, Drafts, and Profile routes are intentionally blocked with friendly 403 + cat imagery.

## Getting started
1. Make sure you have Node 18+ available.
2. Install dependencies (none are required) and start the local server:
   ```bash
   npm run start
   ```
3. Open the app at http://localhost:4000.

Environment variables (optional):
- `PORT`: override the default `4000` port.
- `HOST`: override the default `0.0.0.0` host.
- `STORY_TOKEN_SECRET`: set your own token signing secret.

User data is stored in `data/users.json` with salted+hashed passwords. The server adds CORS-friendly headers for Netlify deployments and serves the static UI from `public/`.
