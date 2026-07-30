# BotGalaxy Hub

Build a production-quality full-stack Discord bot directory named BotGalaxy with an original high-end dark design inspired by leading bot directories. Use TypeScript, Tailwind, shadcn/ui, responsive mobile-first layouts, and a PostgreSQL/Supabase-compatible backend.

Public site:
- Homepage instantly shows populated bot cards; no search required.
- Sections: Featured, Trending, Top Rated, Recently Added, Verified, and category rows.
- Instant search by name, description, tags, and category.
- Categories: Moderation, Music, AI, Economy, Gaming, Fun, Utility, Leveling, Tickets, Security, Giveaways, Social, Applications, Analytics, Automation, Invites, Community, Multipurpose, Notifications, Education, Roles, Support.
- Filters: verified, newest, popular, top rated, premium, category.
- Server-side pagination or infinite scrolling.
- Bot cards with avatar/logo, fallback initials, badges, server count, votes, rating, short description, tags.
- Seed 60+ realistic demo bot listings across all categories so the site is full immediately. Clearly treat them as seed/demo data where needed.
- Each bot opens a dedicated profile route.
- Bot profile: avatar, name, badges, owner, long description, tags, server count, votes, rating, invite, website, support server, commands/features tabs, reviews, similar bots, and report action.
- External links must open normally; never use alert popups.

Accounts and community:
- Authentication prepared for Discord OAuth, plus a working email login fallback if Discord OAuth needs credentials.
- User dashboard for bot submissions and edits.
- Submit form fields: bot name, client ID, avatar URL, short/long descriptions, tags, categories, invite URL, website, support server, ownership details.
- Submission statuses: pending, approved, rejected.
- Voting with one vote per user per voting period.
- Reviews with rating/text, edit/delete own review, and report flow.

Admin dashboard:
- Secure role-based admin-only area.
- Overview metrics: total visitors, unique visitors, pageviews, bot profile views, invite clicks, searches, signups, pending submissions, approved/rejected bots, votes, reviews.
- Date-range selector and charts for traffic over time, top pages, top bots, top search terms, referrers, devices, and countries when available.
- Admin controls to approve/reject/edit/delete submissions, feature/unfeature, verify/unverify, mark premium, manage categories, moderate reviews/reports, manage users/roles.
- Admin audit log.
- Secure first-owner bootstrap after signup; never expose admin access publicly.

Data and scale:
- Tables for users, roles, user_roles, bots, categories, bot_categories, submissions, votes, reviews, reports, analytics_events, admin_audit_logs.
- Sensible indexes for scalable search/filtering and server-side pagination.
- Analytics events for page view, bot profile view, invite click, search, signup, submission, vote.
- Privacy-conscious analytics without unnecessary personal data.
- Loading, empty, and error states; accessible UI; SEO, sitemap-ready routes, Open Graph metadata.
- Create a polished BotGalaxy SVG/CSS brand mark so no logo is missing.

Make all navigation, search, filters, cards, profile pages, submissions, dashboards, and admin controls functional. Verify desktop and mobile layouts.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ca9ce34d-d4c6-445b-9ec0-3b95e2dcecfd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
