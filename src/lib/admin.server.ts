import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertAdmin(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Unable to verify permissions");
  if (!data) throw new Error("Forbidden: admin access required");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  return (profile as { username?: string } | null)?.username ?? "admin";
}

type Bucket = { date: string; pageviews: number; visitors: number };

export async function buildOverview(days: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: events } = await supabaseAdmin
    .from("analytics_events")
    .select("event_type, path, bot_id, search_term, referrer, device, country, visitor_hash, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000);

  const rows = events ?? [];
  const count = (t: string) => rows.filter((r) => r.event_type === t).length;
  const uniq = new Set(rows.map((r) => r.visitor_hash).filter(Boolean)).size;

  const byDay = new Map<string, { pv: number; v: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDay.set(key, { pv: 0, v: new Set() });
  }
  for (const r of rows) {
    const key = String(r.created_at).slice(0, 10);
    const b = byDay.get(key);
    if (!b) continue;
    if (r.event_type === "page_view") b.pv++;
    if (r.visitor_hash) b.v.add(r.visitor_hash);
  }
  const traffic: Bucket[] = [...byDay.entries()].map(([date, b]) => ({
    date,
    pageviews: b.pv,
    visitors: b.v.size,
  }));

  const tally = (get: (r: (typeof rows)[number]) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = get(r);
      if (!k) continue;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  };

  const botViews = rows.filter((r) => r.event_type === "bot_profile_view" && r.bot_id);
  const botTally = new Map<string, number>();
  for (const r of botViews) botTally.set(r.bot_id!, (botTally.get(r.bot_id!) ?? 0) + 1);
  const topBotIds = [...botTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  let topBots: { label: string; value: number }[] = [];
  if (topBotIds.length) {
    const { data: names } = await supabaseAdmin
      .from("bots")
      .select("id, name")
      .in("id", topBotIds.map(([id]) => id));
    topBots = topBotIds.map(([id, value]) => ({
      label: (names ?? []).find((n) => n.id === id)?.name ?? "Unknown",
      value,
    }));
  }

  const [pending, approved, rejected, votes, reviews, reports, users] = await Promise.all([
    supabaseAdmin.from("bots").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("bots").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabaseAdmin.from("bots").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabaseAdmin.from("votes").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    days,
    metrics: {
      pageviews: count("page_view"),
      visitors: rows.length ? uniq : 0,
      uniqueVisitors: uniq,
      botViews: count("bot_profile_view"),
      inviteClicks: count("invite_click"),
      searches: count("search"),
      signups: count("signup"),
      submissions: count("submission"),
      pending: pending.count ?? 0,
      approved: approved.count ?? 0,
      rejected: rejected.count ?? 0,
      votes: votes.count ?? 0,
      reviews: reviews.count ?? 0,
      openReports: reports.count ?? 0,
      users: users.count ?? 0,
    },
    traffic,
    topPages: tally((r) => r.path),
    topSearches: tally((r) => r.search_term),
    referrers: tally((r) => r.referrer),
    devices: tally((r) => r.device),
    countries: tally((r) => r.country),
    topBots,
  };
}
