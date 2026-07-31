import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const permissionSchema = z.object({
  approve_bots: z.boolean(),
  delete_bots: z.boolean(),
  verify_bots: z.boolean(),
  feature_bots: z.boolean(),
  view_users: z.boolean(),
  ban_users: z.boolean(),
  manage_reports: z.boolean(),
  manage_reviews: z.boolean(),
  manage_categories: z.boolean(),
  manage_moderators: z.boolean(),
  view_audit_logs: z.boolean(),
});

const updatePermissionsInput = z.object({
  userId: z.string().uuid(),
  permissions: permissionSchema,
});

export type AdminPermissions = z.infer<typeof permissionSchema>;

const emptyPermissions: AdminPermissions = {
  approve_bots: false,
  delete_bots: false,
  verify_bots: false,
  feature_bots: false,
  view_users: false,
  ban_users: false,
  manage_reports: false,
  manage_reviews: false,
  manage_categories: false,
  manage_moderators: false,
  view_audit_logs: false,
};

async function requireOwner(
  supabase: any,
  userId: string,
) {
  const { data: isOwner, error } = await supabase.rpc(
    "is_botgalaxy_owner",
    {
      target_user_id: userId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!isOwner) {
    throw new Error(
      "Only the BotGalaxy owner can manage administrator permissions.",
    );
  }
}

export const getMyAdminPermissions = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: adminError } =
      await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });

    if (adminError) {
      throw new Error(adminError.message);
    }

    if (!isAdmin) {
      throw new Error("Administrator access is required.");
    }

    const { data: isOwner, error: ownerError } =
      await context.supabase.rpc("is_botgalaxy_owner", {
        target_user_id: context.userId,
      });

    if (ownerError) {
      throw new Error(ownerError.message);
    }

    if (isOwner) {
      return {
        isOwner: true,
        permissions: {
          approve_bots: true,
          delete_bots: true,
          verify_bots: true,
          feature_bots: true,
          view_users: true,
          ban_users: true,
          manage_reports: true,
          manage_reviews: true,
          manage_categories: true,
          manage_moderators: true,
          view_audit_logs: true,
        } satisfies AdminPermissions,
      };
    }

    const database = context.supabase as any;

    const { data, error } = await database
      .from("admin_permissions")
      .select(
        `
          approve_bots,
          delete_bots,
          verify_bots,
          feature_bots,
          view_users,
          ban_users,
          manage_reports,
          manage_reviews,
          manage_categories,
          manage_moderators,
          view_audit_logs
        `,
      )
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return {
      isOwner: false,
      permissions: data ?? emptyPermissions,
    };
  });

export const getAdminPermissionConsole = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const database = supabaseAdmin as any;

    const { data: adminRoles, error: roleError } = await database
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (roleError) {
      throw new Error(roleError.message);
    }

    const adminIds = [
      ...new Set(
        (adminRoles ?? []).map(
          (row: { user_id: string }) => row.user_id,
        ),
      ),
    ];

    if (adminIds.length === 0) {
      return [];
    }

    const [
      profilesResult,
      permissionsResult,
      usersResult,
    ] = await Promise.all([
      database
        .from("profiles")
        .select("id, username, avatar_url, created_at")
        .in("id", adminIds),

      database
        .from("admin_permissions")
        .select(
          `
            user_id,
            approve_bots,
            delete_bots,
            verify_bots,
            feature_bots,
            view_users,
            ban_users,
            manage_reports,
            manage_reviews,
            manage_categories,
            manage_moderators,
            view_audit_logs,
            updated_at,
            updated_by
          `,
        )
        .in("user_id", adminIds),

      supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ]);

    if (profilesResult.error) {
      throw new Error(profilesResult.error.message);
    }

    if (permissionsResult.error) {
      throw new Error(permissionsResult.error.message);
    }

    if (usersResult.error) {
      throw new Error(usersResult.error.message);
    }

    const profiles = profilesResult.data ?? [];
    const permissionRows = permissionsResult.data ?? [];
    const authUsers = usersResult.data.users ?? [];

    return adminIds.map((userId) => {
      const profile = profiles.find(
        (item: { id: string }) => item.id === userId,
      );

      const authUser = authUsers.find(
        (item) => item.id === userId,
      );

      const permissionRow = permissionRows.find(
        (item: { user_id: string }) =>
          item.user_id === userId,
      );

      const isOwner =
        authUser?.email?.toLowerCase() ===
        "draxgaming855@gmail.com";

      return {
        user_id: userId,
        email: authUser?.email ?? "Unknown email",
        username: profile?.username ?? "Unknown user",
        avatar_url: profile?.avatar_url ?? null,
        created_at:
          profile?.created_at ??
          authUser?.created_at ??
          null,
        is_owner: isOwner,
        permissions: isOwner
          ? {
              approve_bots: true,
              delete_bots: true,
              verify_bots: true,
              feature_bots: true,
              view_users: true,
              ban_users: true,
              manage_reports: true,
              manage_reviews: true,
              manage_categories: true,
              manage_moderators: true,
              view_audit_logs: true,
            }
          : {
              ...emptyPermissions,
              ...(permissionRow ?? {}),
            },
      };
    });
  });

export const updateAdminPermissions = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    updatePermissionsInput.parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireOwner(context.supabase, context.userId);

    if (data.userId === context.userId) {
      throw new Error(
        "The owner always has full permissions and cannot be restricted.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const database = supabaseAdmin as any;

    const { data: targetRole, error: roleError } =
      await database
        .from("user_roles")
        .select("id")
        .eq("user_id", data.userId)
        .eq("role", "admin")
        .maybeSingle();

    if (roleError) {
      throw new Error(roleError.message);
    }

    if (!targetRole) {
      throw new Error(
        "The selected account is not an administrator.",
      );
    }

    const { error } = await database
      .from("admin_permissions")
      .upsert(
        {
          user_id: data.userId,
          ...data.permissions,
          updated_at: new Date().toISOString(),
          updated_by: context.userId,
        },
        {
          onConflict: "user_id",
        },
      );

    if (error) {
      throw new Error(error.message);
    }

    await database.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: "BotGalaxy Owner",
      action: "update_admin_permissions",
      target_type: "admin",
      target_id: data.userId,
      meta: data.permissions,
    });

    return { ok: true };
  });

export const removeAdministrator = createServerFn({
  method: "POST",
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
    await requireOwner(context.supabase, context.userId);

    if (data.userId === context.userId) {
      throw new Error(
        "You cannot remove your own owner access.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const database = supabaseAdmin as any;

    const { error: roleError } = await database
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");

    if (roleError) {
      throw new Error(roleError.message);
    }

    const { error: permissionsError } = await database
      .from("admin_permissions")
      .delete()
      .eq("user_id", data.userId);

    if (permissionsError) {
      throw new Error(permissionsError.message);
    }

    await database.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: "BotGalaxy Owner",
      action: "remove_administrator",
      target_type: "admin",
      target_id: data.userId,
    });

    return { ok: true };
  });
