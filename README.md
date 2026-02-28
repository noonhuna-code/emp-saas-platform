## LeaveFlow Monorepo (Dashboard + Firefox Extension)

This folder is the root of the LeaveFlow frontend:

- `apps/dashboard` — main SaaS web dashboard (React 18 + Vite + TS)
- `apps/extension` — Firefox MV3 extension popup + background
- `packages/*` — shared code (to be added in later phases)


## Supabase Migrations (Timestamped)
We use timestamped migration filenames to keep supabase db push compatible with the current CLI.

Rules:
- New migrations must be named YYYYMMDDHHMMSS_<name>.sql (UTC).
- Do not create numeric-only versions like 01_*.sql or 58_*.sql.
- Avoid UTF-8 BOM in migration files.
