# Pipery Dashboard

A local-first Next.js dashboard for signing in with GitHub, browsing repositories and GitHub Actions artifacts, and opening `pipery.jsonl` files with search and entry inspection.

## Features

- GitHub login via NextAuth
- Repository, branch, workflow, run, and artifact selection
- Artifact ZIP inspection with automatic `.jsonl` extraction
- Preference for `pipery.jsonl` when present
- Local IndexedDB cache for offline re-open
- PWA manifest and service worker

## Setup

1. Copy `.env.example` to `.env.local`
2. Create a GitHub OAuth App and set the callback URL to:

   `http://localhost:3000/api/auth/callback/github`

3. Fill in:

   - `GITHUB_ID`
   - `GITHUB_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

4. Install dependencies:

   `npm install`

5. Start the app:

   `npm run dev`

## Notes

- The app requests GitHub OAuth scopes `read:user repo` so it can read repositories and GitHub Actions artifacts for repos the user can access.
- Artifact downloads are performed through the Next.js server using the signed-in user token, and opened JSONL content is then cached locally in the browser.
- The JSONL viewer is schema-agnostic so it can inspect varying Pipery line formats without hardcoding field names.

## Deployment

This repository includes a GitHub Actions workflow for deploying to Vercel:

- `.github/workflows/deploy-vercel.yml`

The workflow follows Vercel's CLI-based GitHub Actions pattern and expects these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

It creates:

- preview deployments for pull requests
- production deployments for pushes to `main`

This app is a good fit for Vercel because it uses server-side Next.js features such as `app/api` route handlers and NextAuth.
