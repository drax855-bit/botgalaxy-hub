export type SortKey = "popular" | "newest" | "top_rated" | "servers" | "votes";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "votes", label: "Most votes" },
  { value: "newest", label: "Recently added" },
  { value: "top_rated", label: "Top rated" },
  { value: "servers", label: "Largest servers" },
];

export type BotSummary = {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  short_description: string;
  tags: string[];
  server_count: number;
  vote_count: number;
  rating: number;
  rating_count: number;
  verified: boolean;
  featured: boolean;
  premium: boolean;
  is_demo: boolean;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

export const BOT_FIELDS =
  "id, slug, name, avatar_url, short_description, tags, server_count, vote_count, rating, rating_count, verified, featured, premium, is_demo, created_at";

export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

export function initialsOf(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Voting period: one vote per user per bot every 12 hours. */
export function currentPeriodKey(d = new Date()): string {
  return `${d.toISOString().slice(0, 10)}-${d.getUTCHours() < 12 ? "A" : "B"}`;
}
