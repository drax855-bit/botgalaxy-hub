import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, buildOverview } from "./admin.server";

const rangeInput = z.object({ days: z.number().int().min(1).max(365).optional().default(30) });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => rangeInput.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return buildOverview(data.days);
  });

export const getAdminBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("pending"),
        q: z.string().trim().max(80).optional().default(""),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("bots")
      .select(
        "id, slug, name, avatar_url, short_description, status, verified, featured, premium, is_demo, owner_name, vote_count, server_count, rating, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminBotAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        botId: z.string().uuid(),
        action: z.enum([
          "approve",
          "reject",
          "delete",
          "feature",
          "unfeature",
          "verify",
          "unverify",
          "premium_on",
          "premium_off",
        ]),
        reason: z.string().trim().max(300).optional().default(""),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("bots").delete().eq("id", data.botId);
      if (error) throw new Error(error.message);
    } else {
      const patch: {
        updated_at: string;
        status?: "pending" | "approved" | "rejected";
        rejection_reason?: string;
        featured?: boolean;
        verified?: boolean;
        premium?: boolean;
      } = { updated_at: new Date().toISOString() };
      if (data.action === "approve") patch.status = "approved";
      if (data.action === "reject") {
        patch.status = "rejected";
        patch.rejection_reason = data.reason || "Does not meet directory guidelines";
      }
      if (data.action === "feature") patch.featured = true;
      if (data.action === "unfeature") patch.featured = false;
      if (data.action === "verify") patch.verified = true;
      if (data.action === "unverify") patch.verified = false;
      if (data.action === "premium_on") patch.premium = true;
      if (data.action === "premium_off") patch.premium = false;
      const { error } = await supabaseAdmin.from("bots").update(patch).eq("id", data.botId);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: actor,
      action: data.action,
      target_type: "bot",
      target_id: data.botId,
      meta: data.reason ? { reason: data.reason } : null,
    });
    return { ok: true };
  });

export const getAdminModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [reports, reviews, audit, users] = await Promise.all([
      supabaseAdmin
        .from("reports")
        .select("id, target_type, target_id, reason, details, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("reviews")
        .select("id, bot_id, rating, body, created_at, bots(name, slug)")
        .order("created_at", { ascending: false })
        .limit(60),
      supabaseAdmin
        .from("admin_audit_logs")
        .select("id, actor_name, action, target_type, target_id, meta, created_at")
        .order("created_at", { ascending: false })
        .limit(80),
      supabaseAdmin
        .from("profiles")
        .select("id, username, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return {
      reports: reports.data ?? [],
      reviews: reviews.data ?? [],
      audit: audit.data ?? [],
      users: (users.data ?? []).map((u) => ({
        ...u,
        roles: (roleRows ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
      })),
    };
  });

export const adminModerationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        action: z.enum([
          "resolve_report",
          "dismiss_report",
          "delete_review",
          "grant_admin",
          "revoke_admin",
          "grant_moderator",
          "revoke_moderator",
        ]),
        targetId: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    switch (data.action) {
      case "resolve_report":
        await supabaseAdmin.from("reports").update({ status: "resolved" }).eq("id", data.targetId);
        break;
      case "dismiss_report":
        await supabaseAdmin.from("reports").update({ status: "dismissed" }).eq("id", data.targetId);
        break;
      case "delete_review":
        await supabaseAdmin.from("reviews").delete().eq("id", data.targetId);
        break;
      case "grant_admin":
        await supabaseAdmin.from("user_roles").insert({ user_id: data.targetId, role: "admin" });
        break;
      case "revoke_admin":
        if (data.targetId === context.userId) throw new Error("You cannot revoke your own admin role");
        await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetId).eq("role", "admin");
        break;
      case "grant_moderator":
        await supabaseAdmin.from("user_roles").insert({ user_id: data.targetId, role: "moderator" });
        break;
      case "revoke_moderator":
        await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetId).eq("role", "moderator");
        break;
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: actor,
      action: data.action,
      target_type: "moderation",
      target_id: data.targetId,
    });
    return { ok: true };
  });

export const adminCategoryAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        action: z.enum(["create", "delete"]),
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(40).optional(),
        description: z.string().trim().max(160).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "create" && data.name) {
      await supabaseAdmin.from("categories").insert({
        name: data.name,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: data.description ?? null,
        sort_order: 99,
      });
    } else if (data.action === "delete" && data.id) {
      await supabaseAdmin.from("categories").delete().eq("id", data.id);
    }
    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: actor,
      action: `category_${data.action}`,
      target_type: "category",
      target_id: data.id ?? data.name ?? null,
    });
    return { ok: true };
  });
