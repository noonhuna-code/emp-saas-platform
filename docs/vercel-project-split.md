# Vercel project split

This repository uses two separate Vercel projects.

- `emp-saas-platform` serves the public site from `apps/web`
- `emp-workforce-os` serves the protected product from `apps/dashboard-v2`

## Domain decision

- Root public domain: `https://emp-saas-platform.vercel.app`
- Protected app domain: `https://emp-workforce-os.vercel.app`

The public site owns marketing pages, public sign-in, public sign-up, and redirects into the protected app.
The protected app owns `/app/*`, `/login`, and server-side auth actions.

## Deployment notes

- Deploy `emp-saas-platform` from the monorepo with the Vercel project root directory set to `apps/web`
- Deploy `emp-workforce-os` from the monorepo with the Vercel project root directory set to `apps/dashboard-v2`
- When a Vercel project already has `rootDirectory` configured, deploying from inside the app folder can cause Vercel to append the subpath twice

## Environment notes

- Public project should define `NEXT_PUBLIC_DASHBOARD_URL=https://emp-workforce-os.vercel.app`
- Protected project should define `NEXT_PUBLIC_SITE_URL=https://emp-saas-platform.vercel.app`

Both apps already have code fallbacks for these URLs, but explicit production envs keep redirects and canonical metadata stable.
