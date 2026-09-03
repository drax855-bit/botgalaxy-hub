import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serverPublicClient, sel } from "./supabase-public.server";
import { BOT_FIELDS, type BotSummary, type CategoryRow } from "./directory";

const listInput = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(60).optional().default(""),
  sort: z.enum(["popular", "newest", "top_rated", "servers", "votes"]).optional().default("popular"),
  verified: z.boolean().optional().default(false),
  premium: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  page: z.number().int().min(1).max(500).optional().default(1),
  pageSize: z.number().int().min(1).max(48).optional().default(24),
});

export const listBots = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => listInput.parse(raw ?? {}))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const from = (data.page - 1) * data.pageSize;

    let q = supabase
      .from("bots")
      .select(
        sel(data.category ? `${BOT_FIELDS}, bot_categories!inner(categories!inner(slug))` : BOT_FIELDS),
        { count: "exact" },
      )
      .eq("status", "approved");

    if (data.category) q = q.eq("bot_categories.categories.slug", data.category);
    if (data.verified) q = q.eq("verified", true);
    if (data.premium) q = q.eq("premium", true);
    if (data.featured) q = q.eq("featured", true);
    if (data.q) {
      const term = data.q.replace(/[%,()]/g, " ").trim();
      if (term) {
        q = q.or(
          `name.ilike.%${term}%,short_description.ilike.%${term}%,long_description.ilike.%${term}%,tags.cs.{${term.toLowerCase()}}`,
        );
      }
    }

    if (data.sort === "newest") q = q.order("created_at", { ascending: false });
    else if (data.sort === "top_rated")
      q = q.order("rating", { ascending: false }).order("rating_count", { ascending: false });
    else if (data.sort === "servers") q = q.order("server_count", { ascending: false });
    else if (data.sort === "votes") q = q.order("vote_count", { ascending: false });
    else q = q.order("featured", { ascending: false }).order("vote_count", { ascending: false });

    const { data: rows, count, error } = await q.range(from, from + data.pageSize - 1).returns<BotSummary[]>();
    if (error) throw new Error(error.message);
    return {
      items: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      hasMore: (count ?? 0) > from + (rows?.length ?? 0),
    };
  });

async function fetchPopulatedCategories(supabase: ReturnType<typeof serverPublicClient>): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(
      sel("id, slug, name, description, icon, sort_order, bot_categories!inner(bots!inner(status))"),
    )
    .eq("bot_categories.bots.status", "approved")
    .order("sort_order")
    .returns<CategoryRow[]>();

  if (error) throw new Error(error.message);

  return (data ?? []).map(({ id, slug, name, description, icon, sort_order }) => ({
    id,
    slug,
    name,
    description,
    icon,
    sort_order,
  }));
}

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  const base = () => supabase.from("bots").select(sel(BOT_FIELDS)).eq("status", "approved");

  const [featured, trending, topRated, recent, verified, categories] = await Promise.all([
    base().eq("featured", true).order("vote_count", { ascending: false }).limit(8).returns<BotSummary[]>(),
    base().order("vote_count", { ascending: false }).limit(8).returns<BotSummary[]>(),
    base()
      .gte("rating_count", 5)
      .order("rating", { ascending: false })
      .order("rating_count", { ascending: false })
      .limit(8)
      .returns<BotSummary[]>(),
    base().order("created_at", { ascending: false }).limit(8).returns<BotSummary[]>(),
    base().eq("verified", true).order("server_count", { ascending: false }).limit(8).returns<BotSummary[]>(),
    fetchPopulatedCategories(supabase),
  ]);

  const { count } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  return {
    featured: featured.data ?? [],
    trending: trending.data ?? [],
    topRated: topRated.data ?? [],
    recent: recent.data ?? [],
    verified: verified.data ?? [],
    categories,
    totalBots: count ?? 0,
  };
});

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  return fetchPopulatedCategories(supabase);
});

export const getBotBySlug = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();
    const { data: bot, error } = await supabase
      .from("bots")
      .select(
        sel(
          "id, slug, client_id, name, avatar_url, short_description, long_description, tags, invite_url, website_url, support_url, owner_name, owner_id, prefix, server_count, vote_count, rating, rating_count, verified, featured, premium, is_demo, created_at, bot_categories(categories(slug,name))",
        ),
      )
      .eq("slug", data.slug)
      .eq("status", "approved")
      .maybeSingle()
      .returns<{
        id: string;
        slug: string;
        client_id: string | null;
        name: string;
        avatar_url: string | null;
        short_description: string;
        long_description: string | null;
        tags: string[];
        invite_url: string | null;
        website_url: string | null;
        support_url: string | null;
        owner_name: string;
        owner_id: string | null;
        prefix: string | null;
        server_count: number;
        vote_count: number;
        rating: number;
        rating_count: number;
        verified: boolean;
        featured: boolean;
        premium: boolean;
        is_demo: boolean;
        created_at: string;
        bot_categories: { categories: { slug: string; name: string } | null }[];
      } | null>();

    if (error) throw new Error(error.message);
    if (!bot) return null;

    const cats = (bot.bot_categories ?? []).map((c) => c.categories).filter(Boolean) as {
      slug: string;
      name: string;
    }[];

    const [reviewsRes, similarRes] = await Promise.all([
      supabase
        .from("reviews")
        .select(sel("id, rating, body, created_at, user_id, profiles(username, avatar_url)"))
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<
          {
            id: string;
            rating: number;
            body: string | null;
            created_at: string;
            user_id: string;
            profiles: { username: string; avatar_url: string | null } | null;
          }[]
        >(),
      cats.length
        ? supabase
            .from("bots")
            .select(sel(`${"id, slug, name, avatar_url, short_description, tags, server_count, vote_count, rating, rating_count, verified, featured, premium, is_demo, created_at"}, bot_categories!inner(categories!inner(slug))`))
            .eq("status", "approved")
            .eq("bot_categories.categories.slug", cats[0]!.slug)
            .neq("id", bot.id)
            .order("vote_count", { ascending: false })
            .limit(4)
            .returns<
              {
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
              }[]
            >()
        : Promise.resolve({ data: [] }),
    ]);

    return {
      bot: { ...bot, categories: cats },
      reviews: reviewsRes.data ?? [],
      similar: similarRes.data ?? [],
    };
  });

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        event_type: z.enum([
          "page_view",
          "bot_profile_view",
          "invite_click",
          "search",
          "signup",
          "submission",
          "vote",
        ]),
        path: z.string().max(300).optional(),
        bot_id: z.string().uuid().optional(),
        search_term: z.string().max(120).optional(),
        referrer: z.string().max(200).optional(),
        device: z.enum(["mobile", "tablet", "desktop"]).optional(),
        visitor_hash: z.string().max(64).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("analytics_events").insert({
      event_type: data.event_type,
      path: data.path ?? null,
      bot_id: data.bot_id ?? null,
      search_term: data.search_term ?? null,
      referrer: data.referrer ?? null,
      device: data.device ?? null,
      visitor_hash: data.visitor_hash ?? null,
    });
    return { ok: true };
  });

export const getDirectoryAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  const approved = () =>
    supabase.from("bots").select("id", { count: "exact", head: true }).eq("status", "approved");

  const [verified, premium, featured, servers, ratings, votes] = await Promise.all([
    approved().eq("verified", true),
    approved().eq("premium", true),
    approved().eq("featured", true),
    approved().gt("server_count", 0),
    approved().gt("rating_count", 0),
    approved().gt("vote_count", 0),
  ]);

  const firstError =
    verified.error ??
    premium.error ??
    featured.error ??
    servers.error ??
    ratings.error ??
    votes.error;

  if (firstError) throw new Error(firstError.message);

  return {
    verified: (verified.count ?? 0) > 0,
    premium: (premium.count ?? 0) > 0,
    featured: (featured.count ?? 0) > 0,
    serverCountAvailable: servers.count ?? 0,
    ratingCountAvailable: ratings.count ?? 0,
    voteCountAvailable: votes.count ?? 0,
  };
});
