import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveUser } from "@/lib/account-guard";
import { serverPublicClient, sel } from "./supabase-public.server";

const claimStatusSchema = z.enum([
  "open",
  "approved",
  "rejected",
  "cancelled",
]);

export type BotClaimStatus = z.infer<typeof claimStatusSchema>;

export const getClaimableBots = createServerFn({
  method: "GET",
}).handler(async () => {
  const supabase = serverPublicClient();

  const { data, error } = await supabase
    .from("bots")
    .select(sel("id, slug, name, avatar_url, short_description"))
    .eq("status", "approved")
    .is("owner_id", null)
    .order("name")
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data ?? []) as unknown as Array<{
      id: string;
      slug: string;
      name: string;
      avatar_url: string | null;
      short_description: string;
    }>
  );
});

export const getMyBotClaims = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    const { data, error } = await db
      .from("bot_claim_requests")
      .select(
        "id, bot_id, requester_id, discord_user_id, proof, status, review_note, created_at, updated_at, bots(name, slug, avatar_url)",
      )
      .eq("requester_id", context.userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });

export const submitBotClaim = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        botId: z.string().uuid(),
        discordUserId: z
          .string()
          .trim()
          .max(40)
          .optional()
          .default(""),
        proof: z.string().trim().min(20).max(2000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    const { data: bot, error: botError } = await supabaseAdmin
      .from("bots")
      .select("id, owner_id, status, name")
      .eq("id", data.botId)
      .maybeSingle();

    if (botError) {
      throw new Error(botError.message);
    }

    if (!bot || bot.status !== "approved") {
      throw new Error("This bot listing is unavailable.");
    }

    if (bot.owner_id) {
      throw new Error(
        "This bot listing already has a registered owner.",
      );
    }

    const { data: existing, error: existingError } = await db
      .from("bot_claim_requests")
      .select("id")
      .eq("bot_id", data.botId)
      .eq("requester_id", context.userId)
      .eq("status", "open")
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      throw new Error(
        "You already have an open claim for this bot.",
      );
    }

    const { error } = await db
      .from("bot_claim_requests")
      .insert({
        bot_id: data.botId,
        requester_id: context.userId,
        discord_user_id: data.discordUserId || null,
        proof: data.proof,
        status: "open",
      });

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "You already have an open claim for this bot.",
        );
      }

      throw new Error(error.message);
    }

    return { ok: true };
  });

export const cancelMyBotClaim = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    const { error } = await db
      .from("bot_claim_requests")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("requester_id", context.userId)
      .eq("status", "open");

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const getAdminBotClaims = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z
          .union([claimStatusSchema, z.literal("all")])
          .optional()
          .default("open"),
        q: z.string().trim().max(100).optional().default(""),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("@/lib/admin.server");

    await requireOwner(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    let query = db
      .from("bot_claim_requests")
      .select(
        "id, bot_id, requester_id, discord_user_id, proof, status, review_note, created_at, updated_at, bots(name, slug, avatar_url)",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const requesterIds = [
      ...new Set(
        (rows ?? []).map((row: any) => row.requester_id),
      ),
    ] as string[];

    let profiles: Array<{
      id: string;
      username: string;
      avatar_url: string | null;
    }> = [];

    if (requesterIds.length > 0) {
      const { data: profileRows, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", requesterIds);

      if (profileError) {
        throw new Error(profileError.message);
      }

      profiles = profileRows ?? [];
    }

    const enriched = (rows ?? []).map((row: any) => ({
      ...row,
      profiles:
        profiles.find(
          (profile) => profile.id === row.requester_id,
        ) ?? null,
    }));

    const term = data.q.toLowerCase();

    if (!term) {
      return enriched;
    }

    return enriched.filter((row: any) => {
      return (
        String(row.proof ?? "")
          .toLowerCase()
          .includes(term) ||
        String(row.discord_user_id ?? "")
          .toLowerCase()
          .includes(term) ||
        String(row.bots?.name ?? "")
          .toLowerCase()
          .includes(term) ||
        String(row.profiles?.username ?? "")
          .toLowerCase()
          .includes(term)
      );
    });
  });

export const adminBotClaimAction = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        note: z.string().trim().max(500).optional().default(""),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("@/lib/admin.server");

    await requireOwner(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    const { data: claim, error: claimError } = await db
      .from("bot_claim_requests")
      .select(
        "id, bot_id, requester_id, status, bots(name, owner_id)",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (!claim) {
      throw new Error("Claim request not found.");
    }

    if (claim.status !== "open") {
      throw new Error(
        "Only open claim requests can be reviewed.",
      );
    }

    const now = new Date().toISOString();

    if (data.action === "approve") {
      if (claim.bots?.owner_id) {
        throw new Error(
          "This bot already has a registered owner.",
        );
      }

      const { data: profile, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("username")
          .eq("id", claim.requester_id)
          .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message);
      }

      const username = profile?.username ?? "Bot owner";

      const { data: updatedBot, error: botUpdateError } =
        await supabaseAdmin
          .from("bots")
          .update({
            owner_id: claim.requester_id,
            owner_name: username,
            updated_at: now,
          })
          .eq("id", claim.bot_id)
          .is("owner_id", null)
          .select("id")
          .maybeSingle();

      if (botUpdateError) {
        throw new Error(botUpdateError.message);
      }

      if (!updatedBot) {
        throw new Error(
          "This bot was claimed by another user before the approval completed.",
        );
      }

      const { error: approveError } = await db
        .from("bot_claim_requests")
        .update({
          status: "approved",
          review_note: data.note || null,
          reviewed_at: now,
          reviewed_by: context.userId,
          updated_at: now,
        })
        .eq("id", data.id);

      if (approveError) {
        throw new Error(approveError.message);
      }

      await db
        .from("bot_claim_requests")
        .update({
          status: "rejected",
          review_note:
            "Another ownership claim for this bot was approved.",
          reviewed_at: now,
          reviewed_by: context.userId,
          updated_at: now,
        })
        .eq("bot_id", claim.bot_id)
        .eq("status", "open")
        .neq("id", data.id);
    } else {
      const { error } = await db
        .from("bot_claim_requests")
        .update({
          status: "rejected",
          review_note:
            data.note ||
            "The provided ownership evidence could not be verified.",
          reviewed_at: now,
          reviewed_by: context.userId,
          updated_at: now,
        })
        .eq("id", data.id);

      if (error) {
        throw new Error(error.message);
      }
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: "BotGalaxy Owner",
      action: `bot_claim_${data.action}`,
      target_type: "bot_claim",
      target_id: data.id,
      meta: data.note
        ? {
            note: data.note,
          }
        : null,
    });

    return { ok: true };
  });
