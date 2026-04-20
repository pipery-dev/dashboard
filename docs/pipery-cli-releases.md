# Pipery CLI Releases

This repository now carries both the dashboard app and the CLI sources:

- `packages/pipery-core`: shared GitHub artifact and JSONL logic
- `packages/pipery-cli`: terminal CLI
- `packaging/homebrew/pipery-cli.rb`: Homebrew formula template

## Release workflow

Use a tag shaped like `pipery-cli-v0.1.0` to trigger `.github/workflows/release-pipery-cli.yml`.

The workflow is designed to publish:

- Linux `tar.gz`
- macOS `tar.gz`
- Windows standalone `exe`
- Debian `.deb`
- RPM `.rpm`
- `checksums.txt`
- Generated `pipery-cli.rb` formula artifact

## Homebrew core

Homebrew Core cannot be updated directly from this repository's CI. The practical path is:

1. Cut a tagged release so the workflow uploads versioned tarballs and checksums.
2. Take the generated `dist/pipery-cli.rb` formula and adapt it to Homebrew Core review requirements.
3. Open a PR against `Homebrew/homebrew-core` following https://docs.brew.sh/Adding-Software-to-Homebrew.

The formula in this repo is a bootstrap starting point. Homebrew Core may still require source-build changes, dependency vendoring, naming adjustments, or audit fixes before accepting the PR.
