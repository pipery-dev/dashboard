# Pipery Dashboard Monorepo

This repository now contains both Pipery surfaces:

- `app`, `components`, `lib`: the local-first Next.js dashboard
- `packages/pipery-cli`: the terminal CLI
- `packages/pipery-core`: shared GitHub artifact and JSONL logic

The dashboard signs in with GitHub, browses repositories and GitHub Actions artifacts, and opens `pipery.jsonl` files with search and entry inspection. The CLI uses the same artifact traversal and JSONL parsing flow for terminal use.

The dashboard consumes the shared GitHub Pipery auth session cookie from `auth.pipery.dev`; keep `PIPERY_AUTH_SESSION_COOKIE_PREFIX` aligned with the auth service and workflow generator.

## Features

- GitHub login via NextAuth for the dashboard
- GitHub device flow login for the CLI
- Repository, branch, workflow, run, and artifact selection
- Artifact ZIP inspection with automatic `.jsonl` extraction
- Preference for `pipery.jsonl` when present
- Local IndexedDB cache for offline re-open
- Shared JSONL parsing and GitHub artifact access across dashboard and CLI
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
   - `PIPERY_AUTH_SESSION_COOKIE_PREFIX`
   - `PIPERY_AUTH_CLIENT_ID`
   - `PIPERY_AUTH_STATE_SECRET`
   - `PIPERY_AUTH_URL`

4. Install dependencies for the monorepo:

   `npm install`

5. Start the dashboard:

   `npm run dev`

6. Run the CLI:

   `npm run cli -- help`

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

CLI packaging is handled separately:

- `.github/workflows/release-pipery-cli.yml`
- [docs/pipery-cli-releases.md](/Users/hamed/pipery-dashboard/docs/pipery-cli-releases.md)

This app is a good fit for Vercel because it uses server-side Next.js features such as `app/api` route handlers and NextAuth.
