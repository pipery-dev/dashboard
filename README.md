# Pipery Dashboard Monorepo

This repository now contains both Pipery surfaces:

- `app`, `components`, `lib`: the local-first Next.js dashboard
- `packages/pipery-cli`: the terminal CLI
- `packages/pipery-core`: shared GitHub artifact and JSONL logic

The dashboard signs in with GitHub, browses repositories and GitHub Actions artifacts, and opens `pipery.jsonl` files with search and entry inspection. The CLI uses the same artifact traversal and JSONL parsing flow for terminal use.

The dashboard signs in directly with GitHub, GitLab, or Bitbucket Cloud so it can keep the provider access token needed for repository and pipeline APIs.

## Features

- GitHub, GitLab, and Bitbucket Cloud login via NextAuth
- GitHub device flow login for the CLI
- Repository, branch, workflow, run, and artifact selection
- Artifact ZIP inspection with automatic `.jsonl` extraction
- Preference for `pipery.jsonl` when present
- Local IndexedDB cache for offline re-open
- Shared JSONL parsing and GitHub artifact access across dashboard and CLI
- PWA manifest and service worker

## Setup

1. Copy `.env.example` to `.env.local`
2. Create OAuth apps for the providers you want to enable. For GitHub, set the redirect URL to:

   `http://localhost:3000/api/auth/callback/github`

   GitLab and Bitbucket Cloud use `/api/auth/callback/gitlab` and `/api/auth/callback/bitbucket`.

3. Fill in:

   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITLAB_CLIENT_ID`
   - `GITLAB_CLIENT_SECRET`
   - `BITBUCKET_CLIENT_ID`
   - `BITBUCKET_CLIENT_SECRET`
   - `PIPERY_AUTH_SESSION_COOKIE_PREFIX`
   - `PIPERY_CLI_GITHUB_CLIENT_ID` if you use the CLI login flow

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

This repository includes a Helm chart and a GitHub Actions workflow that runs `pipery-npm-ci`, publishes the Docker image to GHCR, and publishes the ArgoCD chart update to `pipery-dev/pipery-argocd`.

CLI packaging is handled separately:

- `.github/workflows/release-pipery-cli.yml`
- [docs/pipery-cli-releases.md](/Users/hamed/pipery-dashboard/docs/pipery-cli-releases.md)

This app is a good fit for Vercel because it uses server-side Next.js features such as `app/api` route handlers and NextAuth.
