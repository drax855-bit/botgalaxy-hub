import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveUser } from "@/lib/account-guard";
import { currentPeriodKey } from "./directory";
import { sel } from "./supabase-public.server";

const botInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60),
  client_id: z.string().trim().regex(/^\d{5,25}$/, "Client ID must be numeric"),
  avatar_url: z.string().trim().url().max(400).or(z.literal("")).optional(),
  short_description: z.string().trim().min(20).max(160),
  long_description: z.string().trim().min(50).max(6000),
  tags: z.array(z.string().trim().min(1).max(24)).max(8),
  categories: z.array(z.string().uuid()).min(1).max(4),
  invite_url: z.string().trim().url().max(400),
  website_url: z.string().trim().url().max(400).or(z.literal("")).optional(),
  support_url: z.string().trim().url().max(400).or(z.literal("")).optional(),
  prefix: z.string().trim().max(8).optional(),
  owner_name: z.string().trim().min(2).max(60),
});

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireActiveUser])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, roles] = await Promise.all([
      supabase.from("profiles").select(sel("id, username, avatar_url, bio")).eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select(sel("role")).eq("user_id", userId),
    ]);
    return {
      userId,
      profile: profile.data as { id: string; username: string; avatar_url: string | null; bio: string | null } | null,
      roles: ((roles.data ?? []) as unknown as { role: string }[]).map((r) => r.role),
    };
  });

export const getMyBots = createServerFn({ method: "GET" })
  .middleware([requireActiveUser])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bots")
      .select(
        sel(
          "id, slug, name, avatar_url, short_description, status, rejection_reason, verified, featured, premium, vote_count, server_count, rating, rating_count, created_at",
        ),
      )
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as {
      id: string;
      slug: string;
      name: string;
      avatar_url: string | null;
      short_description: string;
      status: "pending" | "approved" | "rejected";
      rejection_reason: string | null;
      verified: boolean;
      featured: boolean;
      premium: boolean;
      vote_count: number;
      server_count: number;
      rating: number;
      rating_count: number;
      created_at: string;
    }[];
  });

export const submitBot = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => botInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slugBase = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const payload = {
      name: data.name,
      client_id: data.client_id,
      avatar_url: data.avatar_url || null,
      short_description: data.short_description,
      long_description: data.long_description,
      tags: data.tags,
      invite_url: data.invite_url,
      website_url: data.website_url || null,
      support_url: data.support_url || null,
      prefix: data.prefix || "/",
      owner_name: data.owner_name,
      owner_id: userId,
      status: "pending" as const,
      updated_at: new Date().toISOString(),
    };

    let botId = data.id;
    if (botId) {
      const { error } = await supabase.from("bots").update(payload).eq("id", botId).eq("owner_id", userId);
      if (error) throw new Error(error.message);
      await supabase.from("bot_categories").delete().eq("bot_id", botId);
    } else {
      const { data: inserted, error } = await supabase
        .from("bots")
        .insert({ ...payload, slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}` })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      botId = (inserted as { id: string }).id;
    }

    await supabase
      .from("bot_categories")
      .insert(data.categories.map((category_id) => ({ bot_id: botId!, category_id })));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("analytics_events").insert({ event_type: "submission", bot_id: botId });

    return { id: botId };
  });

export const deleteMyBot = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("bots")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const voteForBot = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => z.object({ botId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const period = currentPeriodKey();
    const { error } = await context.supabase
      .from("votes")
      .insert({ bot_id: data.botId, user_id: context.userId, period_key: period });
    if (error) {
      if (error.code === "23505") return { ok: false, reason: "already_voted" as const };
      throw new Error(error.message);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("analytics_events").insert({ event_type: "vote", bot_id: data.botId });
    return { ok: true, reason: null };
  });

export const getVoteState = createServerFn({ method: "GET" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => z.object({ botId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("votes")
      .select(sel("id"))
      .eq("bot_id", data.botId)
      .eq("user_id", context.userId)
      .eq("period_key", currentPeriodKey());
    return { voted: (rows ?? []).length > 0 };
  });

export const upsertReview = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        botId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().max(1500).optional().default(""),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").upsert(
      {
        bot_id: data.botId,
        user_id: context.userId,
        rating: data.rating,
        body: data.body || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bot_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyReview = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => z.object({ botId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reviews")
      .delete()
      .eq("bot_id", data.botId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        targetType: z.enum(["bot", "review"]),
        targetId: z.string().uuid(),
        reason: z.string().trim().min(3).max(80),
        details: z.string().trim().max(1000).optional().default(""),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reports").insert({
      target_type: data.targetType,
      target_id: data.targetId,
      reason: data.reason,
      details: data.details || null,
      reporter_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
