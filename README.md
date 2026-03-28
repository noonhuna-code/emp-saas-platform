## EMP SaaS Platform Monorepo

This folder is the root of the EMP product workspace.

Current app split:

- `apps/web` - public site, launch pages, legal/trust pages, and public auth UX
- `apps/dashboard-v2` - internal Workforce OS product surface and default dashboard app
- `apps/extension` - browser extension

Shared-code guidance:

- Prefer `packages/*` when shared packages actually exist for the concern.
- If no relevant shared package exists yet, reuse app-local logic first and only extract shared code when duplication is real.

Default engineering instructions live in `AGENTS.md`. Task-specific prompts can narrow or override that default scope.

## Supabase Migrations (Timestamped)

We use timestamped migration filenames to keep `supabase db push` compatible with the current CLI.

Rules:
- New migrations must be named `YYYYMMDDHHMMSS_<name>.sql` (UTC).
- Do not create numeric-only versions like `01_*.sql` or `58_*.sql`.
- Avoid UTF-8 BOM in migration files.
