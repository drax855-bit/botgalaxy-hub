import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveUser } from "@/lib/account-guard";

const userSearchInput = z.object({
  q: z.string().trim().max(100).optional().default(""),
  page: z.number().int().min(1).max(1000).optional().default(1),
  perPage: z.number().int().min(10).max(100).optional().default(50),
});

export type ManagedUser = {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  roles: string[];
  is_owner: boolean;
  /** Derived: owns at least one approved bot. Read-only. */
  official_owner: boolean;
  banned: boolean;
  ban: {
    reason: string;
    banned_at: string;
    banned_by: string | null;
    expires_at: string | null;
    active: boolean;
  } | null;
};

const AUTH_PAGE_SIZE = 200;
const MAX_AUTH_PAGES = 50;

export const getManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => userSearchInput.parse(raw ?? {}))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      users: ManagedUser[];
      page: number;
      perPage: number;
      hasMore: boolean;
      total: number;
    }> => {
      const guards = await import("@/lib/admin-guards.server");
      await guards.requireAdminPermission(context.userId, "view_users");

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // Search must cover every registered account, so walk all auth pages.
      type AuthUser = Awaited<
        ReturnType<typeof supabaseAdmin.auth.admin.listUsers>
      >["data"]["users"][number];

      const authUsers: AuthUser[] = [];

      for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
        const { data: authResult, error: authError } =
          await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: AUTH_PAGE_SIZE,
          });

        if (authError) {
          throw new Error(authError.message);
        }

        const batch = authResult.users ?? [];
        authUsers.push(...batch);

        if (batch.length < AUTH_PAGE_SIZE) break;
      }

      const query = data.q.toLowerCase();

      const matching = authUsers.filter((authUser) => {
        if (!query) return true;

        const metadata = authUser.user_metadata ?? {};
        const haystack = [
          authUser.email ?? "",
          authUser.id,
          String(metadata["username"] ?? ""),
          String(metadata["name"] ?? ""),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });

      const total = matching.length;
      const start = (data.page - 1) * data.perPage;
      const pageUsers = matching.slice(start, start + data.perPage);

      if (pageUsers.length === 0) {
        return {
          users: [],
          page: data.page,
          perPage: data.perPage,
          hasMore: false,
          total,
        };
      }

      const userIds = pageUsers.map((user) => user.id);

      const [profilesResult, rolesResult, bansResult, ownedBotsResult] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, username, avatar_url, created_at")
          .in("id", userIds),

        supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds),

        supabaseAdmin
          .from("user_bans")
          .select(
            "user_id, reason, banned_at, banned_by, expires_at, active",
          )
          .in("user_id", userIds),

        supabaseAdmin
          .from("bots")
          .select("owner_id")
          .eq("status", "approved")
          .in("owner_id", userIds),
      ]);

      if (profilesResult.error) throw new Error(profilesResult.error.message);
      if (rolesResult.error) throw new Error(rolesResult.error.message);
      if (bansResult.error) throw new Error(bansResult.error.message);
      if (ownedBotsResult.error) throw new Error(ownedBotsResult.error.message);

      const profiles = profilesResult.data ?? [];
      const roles = rolesResult.data ?? [];
      const bans = bansResult.data ?? [];
      const officialOwnerIds = new Set(
        (ownedBotsResult.data ?? [])
          .map((row) => (row as { owner_id: string | null }).owner_id)
          .filter((id): id is string => Boolean(id)),
      );

      const users: ManagedUser[] = pageUsers
        .map((authUser) => {
          const profile = profiles.find((item) => item.id === authUser.id);
          const userRoles = roles
            .filter((item) => item.user_id === authUser.id)
            .map((item) => String(item.role));
          const ban = bans.find((item) => item.user_id === authUser.id);

          const banExpired =
            Boolean(ban?.expires_at) &&
            new Date(ban!.expires_at as string).getTime() <= Date.now();

          const metadata = authUser.user_metadata ?? {};

          return {
            id: authUser.id,
            email: authUser.email ?? "Unknown email",
            username:
              profile?.username ||
              String(metadata["username"] ?? metadata["name"] ?? "") ||
              "Unknown user",
            avatar_url:
              profile?.avatar_url ??
              (metadata["avatar_url"] as string | undefined) ??
              null,
            created_at: profile?.created_at ?? authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at ?? null,
            email_confirmed: Boolean(authUser.email_confirmed_at),
            roles: userRoles,
            official_owner: officialOwnerIds.has(authUser.id),
            is_owner:
              authUser.email?.toLowerCase() === guards.OWNER_EMAIL,
            banned: Boolean(ban?.active) && !banExpired,
            ban: ban
              ? {
                  reason: ban.reason,
                  banned_at: ban.banned_at,
                  banned_by: ban.banned_by,
                  expires_at: ban.expires_at,
                  active: ban.active,
                }
              : null,
          };
        })
        .sort((a, b) => {
          if (a.is_owner) return -1;
          if (b.is_owner) return 1;
          if (a.banned !== b.banned) return a.banned ? -1 : 1;
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
        });

      return {
        users,
        page: data.page,
        perPage: data.perPage,
        hasMore: start + pageUsers.length < total,
        total,
      };
    },
  );

const banUserInput = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
  durationDays: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .nullable()
    .optional()
    .default(null),
});

// Supabase Auth requires a duration string; permanent bans use ~100 years.
const PERMANENT_BAN_DURATION = "876000h";

export const banManagedUser = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => banUserInput.parse(raw))
  .handler(async ({ data, context }) => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireAdminPermission(context.userId, "ban_users");

    if (data.userId === context.userId) {
      throw new Error("You cannot ban your own account.");
    }

    if (await guards.isOwnerAccount(data.userId)) {
      throw new Error("The BotGalaxy owner account cannot be banned.");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: targetUser, error: targetError } =
      await supabaseAdmin.auth.admin.getUserById(data.userId);

    if (targetError || !targetUser.user) {
      throw new Error(
        targetError?.message ?? "The selected user does not exist.",
      );
    }

    if (await guards.hasAdminRole(data.userId)) {
      if (!(await guards.isOwnerAccount(context.userId))) {
        throw new Error(
          "Only the BotGalaxy owner can ban another administrator.",
        );
      }
    }

    const expiresAt =
      data.durationDays === null
        ? null
        : new Date(
            Date.now() + data.durationDays * 24 * 60 * 60 * 1000,
          ).toISOString();

    const banDuration =
      data.durationDays === null
        ? PERMANENT_BAN_DURATION
        : `${data.durationDays * 24}h`;

    const { error: authBanError } =
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ban_duration: banDuration,
      });

    if (authBanError) {
      throw new Error(authBanError.message);
    }

    const { error: banError } = await supabaseAdmin
      .from("user_bans")
      .upsert(
        {
          user_id: data.userId,
          reason: data.reason,
          banned_at: new Date().toISOString(),
          banned_by: context.userId,
          expires_at: expiresAt,
          active: true,
        },
        { onConflict: "user_id" },
      );

    if (banError) {
      throw new Error(banError.message);
    }

    const actorName = await guards.actorDisplayName(context.userId);

    const { error: logError } = await supabaseAdmin
      .from("user_moderation_logs")
      .insert({
        actor_id: context.userId,
        target_user_id: data.userId,
        action: "ban_user",
        reason: data.reason,
      });

    if (logError) {
      throw new Error(logError.message);
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: actorName,
      action: "ban_user",
      target_type: "user",
      target_id: data.userId,
      meta: {
        reason: data.reason,
        duration_days: data.durationDays,
        expires_at: expiresAt,
      },
    });

    return { ok: true, expiresAt };
  });

export const unbanManagedUser = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z
          .string()
          .trim()
          .max(500)
          .optional()
          .default("Ban removed by administrator"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireAdminPermission(context.userId, "ban_users");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ban_duration: "none",
      });

    if (authError) {
      throw new Error(authError.message);
    }

    const { error: banError } = await supabaseAdmin
      .from("user_bans")
      .update({ active: false })
      .eq("user_id", data.userId);

    if (banError) {
      throw new Error(banError.message);
    }

    const { error: logError } = await supabaseAdmin
      .from("user_moderation_logs")
      .insert({
        actor_id: context.userId,
        target_user_id: data.userId,
        action: "unban_user",
        reason: data.reason,
      });

    if (logError) {
      throw new Error(logError.message);
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: await guards.actorDisplayName(context.userId),
      action: "unban_user",
      target_type: "user",
      target_id: data.userId,
      meta: { reason: data.reason },
    });

    return { ok: true };
  });

export const getUserModerationHistory = createServerFn({ method: "GET" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireAdminPermission(context.userId, "view_users");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: logs, error } = await supabaseAdmin
      .from("user_moderation_logs")
      .select("id, actor_id, target_user_id, action, reason, created_at")
      .eq("target_user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return logs ?? [];
  });
