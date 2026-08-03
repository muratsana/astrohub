# AstroHub GUI/Admin Implementation Report

Date: 2026-08-03

## Summary

Applied the implementable local UI/admin part of the GUI/Admin markdown plan without faking external services. The approved homepage layout was not redesigned.

## Status Table

| Work | Status | Files | Migration | Test | Live Evidence | Note |
|---|---|---|---|---|---|---|
| Public module filter/control consolidation | DONE | `src/components/ui/FilterBar.tsx`, gallery/events/news/articles/marketplace/forum pages | No | Local test/build/e2e in prior commit | Pending Vercel deploy | Active filters are shown by control color per latest product feedback, not a separate chip row. |
| Admin sidebar shell | DONE | `src/features/admin/AdminPage.tsx`, `src/app/router.tsx` | No | Typecheck, lint, build, admin tests | Not checked live in this edit pass | `/admin/*` now routes into one admin app with left navigation. |
| Admin route aliases | DONE | `src/app/router.tsx`, `src/features/admin/AdminPage.tsx`, `scripts/vercel-rewrites.mjs`, `vercel.json` | No | Typecheck, lint, build, admin/router tests | Not checked live in this edit pass | Supports paths such as `/admin/home`, `/admin/gallery`, `/admin/news`, `/admin/forum`, `/admin/users`, `/admin/settings`; Vercel gets `/admin` and `/admin/:path*`. |
| Forum redesign | PARTIAL | `src/features/forum/ForumPage.tsx` | No | Covered by existing forum/service tests in earlier pass | Pending Vercel deploy | Main forum list is compact and not a content card grid; detail/new-topic full redesign still open. |
| Admin CRUD surfaces | PARTIAL | Existing admin controls | No | Full unit suite passed | Not checked live in this edit pass | Existing controls are exposed under the sidebar; full data table/bulk drawer standard still open. |
| Document import | BLOCKED_EXTERNAL | Existing `SpecImportControl` only | No | Not run as live import | None | CKEditor Import from Word / Apryse require license/service choices. |
| Saha Bortle map provider | BLOCKED_EXTERNAL | Existing Saha surfaces unchanged | No | Not run | None | Licensed tile/geocoding/provider decision required; SQM is not introduced into UI here. |
| Radio backend control | BLOCKED_EXTERNAL | Existing `RadioControl` unchanged | No | Not run | None | AzuraCast/Icecast/VPS credentials required for real control. |
| TV backend control | BLOCKED_EXTERNAL | Existing `TvControl` unchanged | No | Not run | None | YouTube OAuth secrets and channel authorization required. |

## Verification Performed

- `npm run typecheck` passed after the admin shell changes.
- `npm run lint` passed.
- Targeted admin/router tests passed: `44 passed`.
- `npm test -- --reporter=dot` passed: `174` files, `2079` tests.
- `npm run build` passed and prerendered `492/492` routes.
- Build warning only: `VITE_SITE_URL` is not set, so `sitemap.xml` generation was skipped.
- `npm run check:rewrites` passed: `163` rewrites current.
- `npm run check:csp` passed: `7` routes, zero violations.
- `npm run check:budgets` passed: first-route JS `182.3 kB` gzip, CSS `15.5 kB` gzip.
- `npm run build:preview` passed.
- `npm run check:preview` passed: `7` modules visited.
- `npm run check:a11y` passed: `5` routes.
- `npm run check:viewports` passed: `2` pages x `11` resolutions.
- `npm run test:e2e` passed: `28` scenarios, no page errors.

## Remaining QA Before Release

- Live production check after Vercel finishes deploying the pushed commit.

## Open Items

- Convert admin record controls to a full `AdminDataTable` with bulk action bar and quick edit drawer.
- Add admin unsaved-changes guard and revision history where edit forms are used.
- Complete forum topic detail and new-topic wizard redesign.
- Plan Supabase migrations only after live schema/credential verification.
- Keep external integrations blocked until real credentials/licenses are available.
