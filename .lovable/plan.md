# Owner control panel for BotGalaxy

Turn `/admin` from a stack of consoles into a real owner control panel with sidebar navigation, an overview dashboard, analytics, audit log, site settings, and the missing bot/category/user controls. Everything stays wired to the live database with server-side permission checks.

## What already exists (reused, not rebuilt)

- `/admin` route with session check, redirect to `/auth`, access-denied state.
- Owner + admin permission guards (service-role only RPCs) in `src/lib/admin-guards.server.ts`.
- Bot moderation (approve/reject/delete/verify/feature/premium), categories CRUD, reviews/reports moderation, users + bans, admin requests + per-admin permission toggles, ownership claims, contact requests.
- Audit logging via `admin_audit_logs`, analytics aggregation in `buildOverview()`.

## Assumptions

- Owner stays `draxgaming855@gmail.com` (already the documented bootstrap value, enforced by `is_botgalaxy_owner`). The bootstrap doc will describe how to change it, since no public "become admin" path may exist.
- "Moderator role" means granting the existing `moderator` app_role; moderators get no admin console access unless also given `admin`.

## Database work (one migration)

1. `site_settings` — single-row settings table: site name, logo url, hero title/subtitle, announcement text + enabled, support/social links (discord, twitter, github, email), maintenance_mode, submissions_open, voting_open. Public `anon`/`authenticated` SELECT; writes only via service role. Seeded with current values.
2. `bots.featured_rank integer` — for featured ordering.
3. `categories.icon` / `description` — added only if missing.
4. Grants + RLS in the same migration, per project convention.

## Backend (server functions, all guarded)

- `src/lib/site-settings.functions.ts` — public `getSiteSettings()` (publishable client) and owner-only `updateSiteSettings()`; audited.
- `src/lib/admin.functions.ts` additions:
  - `adminCreateBot` (manual create, slug generation) and `adminUpdateBot` (every field: name, slug, descriptions, owner name/id, prefix, avatar, invite/support/website urls, tags, categories, server count, status).
  - `setFeaturedOrder` (reorder featured bots).
  - `getAuditLog` (paginated, filter by actor/action).
  - `getAnalytics({ from, to })` — extends `buildOverview` with a date range plus CSV-ready rows.
  - `assignUserRole` / `removeUserRole` for admin + moderator; owner role never removable, only the owner can grant admin.
- Every new mutation writes an `admin_audit_logs` row.

## Admin UI

- `src/routes/admin.tsx` becomes a shell: sticky top bar + slide-over sidebar (mobile-first, Android-friendly) with sections Overview, Bot Submissions, All Bots, Categories, Featured Content, Reviews & Reports, Users & Roles, Analytics, Audit Log, Site Settings. Section state in a URL search param so deep links work; non-permitted sections hidden and refused server-side.
- Header states plainly: "You own this site — manage every part of BotGalaxy from here."
- New components: `AdminOverviewPanel` (all nine stat cards), `AdminBotEditor` (create/edit dialog with full field set), `AdminFeaturedConsole` (drag-free up/down reorder for reliability on touch), `AdminAnalyticsConsole` (range filter, traffic chart via recharts, top pages/bots/searches/referrers/devices/countries, CSV export), `AdminAuditLogConsole`, `AdminSiteSettingsConsole`.
- Existing consoles (`BotManagementConsole`, `AdminCategoryConsole`, `AdminModerationConsole`, `UserManagementConsole`, `AdminPermissionConsole`, `AdminRequestsPanel`, claims, contact) are slotted into the matching sections; `UserManagementConsole` gains role assign/remove controls.
- Access handling: signed-out → `/auth`; signed-in non-admin → dedicated 403 panel with a link home.

## Public site

- Site settings consumed where they matter: site name/logo in header, hero text on the homepage, announcement banner, footer social/support links, and submissions/voting closed states respected in the account server functions. No redesign.

## Verification

Production build, then a browser pass over `/admin` at mobile width plus the public homepage.
