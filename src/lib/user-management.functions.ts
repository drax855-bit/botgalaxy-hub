import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requirePermission(
  supabase: any,
  userId: string,
  permission: "view_users" | "ban_users",
) {
  const { data: allowed, error } = await supabase.rpc(
    "has_admin_permission",
    {
      target_user_id: userId,
      permission_name: permission,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!allowed) {
    throw new Error(
      `You do not have the required permission: ${permission}.`,
    );
  }
}

async function isOwnerAccount(
  supabase: any,
  userId: string,
) {
  const { data, error } = await supabase.rpc(
    "is_botgalaxy_owner",
    {
      target_user_id: userId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

const userSearchInput = z.object({
  q: z.string().trim().max(100).optional().default(""),
  page: z.number().int().min(1).max(1000).optional().default(1),
  perPage: z
    .number()
    .int()
    .min(10)
    .max(100)
    .optional()
    .default(50),
});

export const getManagedUsers = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    userSearchInput.parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(
      context.supabase,
      context.userId,
      "view_users",
    );

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const database = supabaseAdmin as any;

    const { data: authResult, error: authError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: data.page,
        perPage: data.perPage,
      });

    if (authError) {
      throw new Error(authError.message);
    }

    const authUsers = authResult.users ?? [];

    if (authUsers.length === 0) {
      return {
        users: [],
        page: data.page,
        perPage: data.perPage,
        hasMore: false,
      };
    }

    const userIds = authUsers.map((user) => user.id);

    const [
      profilesResult,
      rolesResult,
      bansResult,
    ] = await Promise.all([
      database
        .from("profiles")
        .select(
          `
            id,
            username,
            avatar_url,
            created_at
          `,
        )
        .in("id", userIds),

      database
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds),

      database
        .from("user_bans")
        .select(
          `
            user_id,
            reason,
            banned_at,
            banned_by,
            expires_at,
            active
          `,
        )
        .in("user_id", userIds),
    ]);

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    if (rolesResult.error) {
      throw new Error(rolesResult.error.message);
    }

    if (bansResult.error) {
      throw new Error(bansResult.error.message);
    }

    const profiles = profilesResult.data ?? [];
    const roles = rolesResult.data ?? [];
    const bans = bansResult.data ?? [];

    const query = data.q.toLowerCase();

    const users = authUsers
      .map((authUser) => {
        const profile = profiles.find(
          (item: { id: string }) =>
            item.id === authUser.id,
        );

        const userRoles = roles
          .filter(
            (item: { user_id: string }) =>
              item.user_id === authUser.id,
          )
          .map(
            (item: { role: string }) =>
              item.role,
          );

        const ban = bans.find(
          (item: { user_id: string }) =>
            item.user_id === authUser.id,
        );

        const banExpired =
          Boolean(ban?.expires_at) &&
          new Date(ban.expires_at).getTime() <=
            Date.now();

        const banned =
          Boolean(ban?.active) && !banExpired;

        return {
          id: authUser.id,
          email: authUser.email ?? "Unknown email",
          username:
            profile?.username ??
            authUser.user_metadata?.username ??
            authUser.user_metadata?.name ??
            "Unknown user",
          avatar_url:
            profile?.avatar_url ??
            authUser.user_metadata?.avatar_url ??
            null,
          created_at:
            profile?.created_at ??
            authUser.created_at,
          last_sign_in_at:
            authUser.last_sign_in_at ?? null,
          email_confirmed:
            Boolean(authUser.email_confirmed_at),
          roles: userRoles,
          is_owner:
            authUser.email?.toLowerCase() ===
            "draxgaming855@gmail.com",
          banned,
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
      .filter((user) => {
        if (!query) return true;

        return (
          user.email.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query) ||
          user.id.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (a.is_owner) return -1;
        if (b.is_owner) return 1;
        if (a.banned !== b.banned) {
          return a.banned ? -1 : 1;
        }

        return new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime();
      });

    return {
      users,
      page: data.page,
      perPage: data.perPage,
      hasMore:
        authUsers.length === data.perPage,
    };
  });

const banUserInput = z.object({
  userId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(3)
    .max(500),
  durationDays: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .nullable()
    .optional()
    .default(null),
});

export const banManagedUser = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    banUserInput.parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requirePermission(
      context.supabase,
      context.userId,
      "ban_users",
    );

    if (data.userId === context.userId) {
      throw new Error(
        "You cannot ban your own account.",
      );
    }

    const targetIsOwner = await isOwnerAccount(
      context.supabase,
      data.userId,
    );

    if (targetIsOwner) {
      throw new Error(
        "The BotGalaxy owner account cannot be banned.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const database = supabaseAdmin as any;

    const { data: targetUser, error: targetError } =
      await supabaseAdmin.auth.admin.getUserById(
        data.userId,
      );

    if (targetError || !targetUser.user) {
      throw new Error(
        targetError?.message ??
          "The selected user does not exist.",
      );
    }

    const targetRolesResult = await database
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    if (targetRolesResult.error) {
      throw new Error(
        targetRolesResult.error.message,
      );
    }

    const targetRoles = (
      targetRolesResult.data ?? []
    ).map(
      (item: { role: string }) => item.role,
    );

    if (targetRoles.includes("admin")) {
      const actorIsOwner = await isOwnerAccount(
        context.supabase,
        context.userId,
      );

      if (!actorIsOwner) {
        throw new Error(
          "Only the BotGalaxy owner can ban another administrator.",
        );
      }
    }

    const expiresAt =
      data.durationDays === null
        ? null
        : new Date(
            Date.now() +
              data.durationDays *
                24 *
                60 *
                60 *
                1000,
          ).toISOString();

    const { error: banError } = await database
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
        {
          onConflict: "user_id",
        },
      );

    if (banError) {
      throw new Error(banError.message);
    }

    const { error: logError } = await database
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

    await database
      .from("admin_audit_logs")
      .insert({
        actor_id: context.userId,
        actor_name: "BotGalaxy Administrator",
        action: "ban_user",
        target_type: "user",
        target_id: data.userId,
        meta: {
          reason: data.reason,
          duration_days: data.durationDays,
          expires_at: expiresAt,
        },
      });

    return {
      ok: true,
      expiresAt,
    };
  });

export const unbanManagedUser = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
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
    await requirePermission(
      context.supabase,
      context.userId,
      "ban_users",
    );

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const database = supabaseAdmin as any;

    const { error: banError } = await database
      .from("user_bans")
      .update({
        active: false,
      })
      .eq("user_id", data.userId);

    if (banError) {
      throw new Error(banError.message);
    }

    const { error: logError } = await database
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

    await database
      .from("admin_audit_logs")
      .insert({
        actor_id: context.userId,
        actor_name: "BotGalaxy Administrator",
        action: "unban_user",
        target_type: "user",
        target_id: data.userId,
        meta: {
          reason: data.reason,
        },
      });

    return {
      ok: true,
    };
  });

export const getUserModerationHistory =
  createServerFn({
    method: "GET",
  })
    .middleware([requireSupabaseAuth])
    .inputValidator((raw: unknown) =>
      z
        .object({
          userId: z.string().uuid(),
        })
        .parse(raw),
    )
    .handler(async ({ data, context }) => {
      await requirePermission(
        context.supabase,
        context.userId,
        "view_users",
      );

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const database = supabaseAdmin as any;

      const { data: logs, error } =
        await database
          .from("user_moderation_logs")
          .select(
            `
              id,
              actor_id,
              target_user_id,
              action,
              reason,
              created_at
            `,
          )
          .eq("target_user_id", data.userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(100);

      if (error) {
        throw new Error(error.message);
      }

      return logs ?? [];
    });
