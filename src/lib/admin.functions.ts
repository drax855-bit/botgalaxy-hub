import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveUser } from "@/lib/account-guard";
import {
  assertAdmin,
  buildOverview,
  hasPermission,
  requireAdminPermission,
  requireOwner,
} from "./admin.server";

const rangeInput = z.object({
  days: z.number().int().min(1).max(365).optional().default(30),
});

export const getAdminOverview = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    rangeInput.parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(
      context.supabase,
      context.userId,
    );

    return buildOverview(data.days);
  });

export const getAdminBots = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z
          .enum([
            "pending",
            "approved",
            "rejected",
            "all",
          ])
          .optional()
          .default("pending"),

        q: z
          .string()
          .trim()
          .max(80)
          .optional()
          .default(""),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(
      context.supabase,
      context.userId,
    );

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let query = supabaseAdmin
      .from("bots")
      .select(
        `
          id,
          slug,
          name,
          avatar_url,
          short_description,
          status,
          verified,
          featured,
          premium,
          is_demo,
          owner_name,
          vote_count,
          server_count,
          rating,
          created_at
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data.q) {
      query = query.ilike(
        "name",
        `%${data.q}%`,
      );
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return rows ?? [];
  });

export const adminBotAction = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
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

        reason: z
          .string()
          .trim()
          .max(300)
          .optional()
          .default(""),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(
      context.supabase,
      context.userId,
    );

    if (
      data.action === "approve" ||
      data.action === "reject"
    ) {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "approve_bots",
      );
    }

    if (data.action === "delete") {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "delete_bots",
      );
    }

    if (
      data.action === "verify" ||
      data.action === "unverify"
    ) {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "verify_bots",
      );
    }

    if (
      data.action === "feature" ||
      data.action === "unfeature" ||
      data.action === "premium_on" ||
      data.action === "premium_off"
    ) {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "feature_bots",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    if (data.action === "delete") {
      const { error } = await supabaseAdmin
        .from("bots")
        .delete()
        .eq("id", data.botId);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const patch: {
        updated_at: string;
        status?:
          | "pending"
          | "approved"
          | "rejected";
        rejection_reason?: string | null;
        featured?: boolean;
        verified?: boolean;
        premium?: boolean;
      } = {
        updated_at: new Date().toISOString(),
      };

      if (data.action === "approve") {
        patch.status = "approved";
        patch.rejection_reason = null;
      }

      if (data.action === "reject") {
        patch.status = "rejected";
        patch.rejection_reason =
          data.reason ||
          "Does not meet directory guidelines";
      }

      if (data.action === "feature") {
        patch.featured = true;
      }

      if (data.action === "unfeature") {
        patch.featured = false;
      }

      if (data.action === "verify") {
        patch.verified = true;
      }

      if (data.action === "unverify") {
        patch.verified = false;
      }

      if (data.action === "premium_on") {
        patch.premium = true;
      }

      if (data.action === "premium_off") {
        patch.premium = false;
      }

      const { error } = await supabaseAdmin
        .from("bots")
        .update(patch)
        .eq("id", data.botId);

      if (error) {
        throw new Error(error.message);
      }
    }

    await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        actor_id: context.userId,
        actor_name: actor,
        action: data.action,
        target_type: "bot",
        target_id: data.botId,
        meta: data.reason
          ? {
              reason: data.reason,
            }
          : null,
      });

    return {
      ok: true,
    };
  });

export const getAdminModeration = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .handler(async ({ context }) => {
    await assertAdmin(
      context.supabase,
      context.userId,
    );

    const [
      canViewUsers,
      canManageReports,
      canManageReviews,
      canViewAuditLogs,
      canManageModerators,
    ] = await Promise.all([
      hasPermission(
        context.supabase,
        context.userId,
        "view_users",
      ),

      hasPermission(
        context.supabase,
        context.userId,
        "manage_reports",
      ),

      hasPermission(
        context.supabase,
        context.userId,
        "manage_reviews",
      ),

      hasPermission(
        context.supabase,
        context.userId,
        "view_audit_logs",
      ),

      hasPermission(
        context.supabase,
        context.userId,
        "manage_moderators",
      ),
    ]);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const reportsPromise = canManageReports
      ? supabaseAdmin
          .from("reports")
          .select(
            `
              id,
              target_type,
              target_id,
              reason,
              details,
              status,
              created_at
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100)
      : Promise.resolve({
          data: [],
          error: null,
        });

    const reviewsPromise = canManageReviews
      ? supabaseAdmin
          .from("reviews")
          .select(
            `
              id,
              bot_id,
              rating,
              body,
              created_at,
              bots(name, slug)
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(60)
      : Promise.resolve({
          data: [],
          error: null,
        });

    const auditPromise = canViewAuditLogs
      ? supabaseAdmin
          .from("admin_audit_logs")
          .select(
            `
              id,
              actor_name,
              action,
              target_type,
              target_id,
              meta,
              created_at
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(80)
      : Promise.resolve({
          data: [],
          error: null,
        });

    const shouldLoadUsers =
      canViewUsers || canManageModerators;

    const usersPromise = shouldLoadUsers
      ? supabaseAdmin
          .from("profiles")
          .select(
            `
              id,
              username,
              avatar_url,
              created_at
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100)
      : Promise.resolve({
          data: [],
          error: null,
        });

    const [
      reports,
      reviews,
      audit,
      users,
    ] = await Promise.all([
      reportsPromise,
      reviewsPromise,
      auditPromise,
      usersPromise,
    ]);

    if (reports.error) {
      throw new Error(reports.error.message);
    }

    if (reviews.error) {
      throw new Error(reviews.error.message);
    }

    if (audit.error) {
      throw new Error(audit.error.message);
    }

    if (users.error) {
      throw new Error(users.error.message);
    }

    let roleRows: Array<{
      user_id: string;
      role: string;
    }> = [];

    if (shouldLoadUsers) {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      if (error) {
        throw new Error(error.message);
      }

      roleRows = data ?? [];
    }

    return {
      permissions: {
        view_users: canViewUsers,
        manage_reports: canManageReports,
        manage_reviews: canManageReviews,
        view_audit_logs: canViewAuditLogs,
        manage_moderators: canManageModerators,
      },

      reports: reports.data ?? [],
      reviews: reviews.data ?? [],
      audit: audit.data ?? [],

      users: (users.data ?? []).map(
        (user) => ({
          ...user,

          roles: roleRows
            .filter(
              (role) =>
                role.user_id === user.id,
            )
            .map((role) => role.role),
        }),
      ),
    };
  });

export const adminModerationAction = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
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
    const actor = await assertAdmin(
      context.supabase,
      context.userId,
    );

    if (
      data.action === "resolve_report" ||
      data.action === "dismiss_report"
    ) {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "manage_reports",
      );
    }

    if (data.action === "delete_review") {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "manage_reviews",
      );
    }

    if (
      data.action === "grant_moderator" ||
      data.action === "revoke_moderator"
    ) {
      await requireAdminPermission(
        context.supabase,
        context.userId,
        "manage_moderators",
      );
    }

    if (
      data.action === "grant_admin" ||
      data.action === "revoke_admin"
    ) {
      await requireOwner(
        context.supabase,
        context.userId,
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    switch (data.action) {
      case "resolve_report": {
        const { error } = await supabaseAdmin
          .from("reports")
          .update({
            status: "resolved",
          })
          .eq("id", data.targetId);

        if (error) {
          throw new Error(error.message);
        }

        break;
      }

      case "dismiss_report": {
        const { error } = await supabaseAdmin
          .from("reports")
          .update({
            status: "dismissed",
          })
          .eq("id", data.targetId);

        if (error) {
          throw new Error(error.message);
        }

        break;
      }

      case "delete_review": {
        const { error } = await supabaseAdmin
          .from("reviews")
          .delete()
          .eq("id", data.targetId);

        if (error) {
          throw new Error(error.message);
        }

        break;
      }

      case "grant_admin": {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: data.targetId,
            role: "admin",
          });

        if (
          error &&
          error.code !== "23505"
        ) {
          throw new Error(error.message);
        }

        break;
      }

      case "revoke_admin": {
        if (data.targetId === context.userId) {
          throw new Error(
            "You cannot revoke your own owner role.",
          );
        }

        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.targetId)
          .eq("role", "admin");

        if (error) {
          throw new Error(error.message);
        }

        await (
          supabaseAdmin as any
        )
          .from("admin_permissions")
          .delete()
          .eq("user_id", data.targetId);

        break;
      }

      case "grant_moderator": {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: data.targetId,
            role: "moderator",
          });

        if (
          error &&
          error.code !== "23505"
        ) {
          throw new Error(error.message);
        }

        break;
      }

      case "revoke_moderator": {
        const { error } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.targetId)
          .eq("role", "moderator");

        if (error) {
          throw new Error(error.message);
        }

        break;
      }
    }

    await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        actor_id: context.userId,
        actor_name: actor,
        action: data.action,
        target_type: "moderation",
        target_id: data.targetId,
      });

    return {
      ok: true,
    };
  });

export const adminCategoryAction = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        action: z.enum([
          "create",
          "delete",
        ]),

        id: z.string().uuid().optional(),

        name: z
          .string()
          .trim()
          .min(2)
          .max(40)
          .optional(),

        description: z
          .string()
          .trim()
          .max(160)
          .optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(
      context.supabase,
      context.userId,
    );

    await requireAdminPermission(
      context.supabase,
      context.userId,
      "manage_categories",
    );

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    if (
      data.action === "create" &&
      data.name
    ) {
      const { error } = await supabaseAdmin
        .from("categories")
        .insert({
          name: data.name,

          slug: data.name
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-",
            )
            .replace(/^-|-$/g, ""),

          description:
            data.description ?? null,

          sort_order: 99,
        });

      if (error) {
        throw new Error(error.message);
      }
    } else if (
      data.action === "delete" &&
      data.id
    ) {
      const { error } = await supabaseAdmin
        .from("categories")
        .delete()
        .eq("id", data.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      throw new Error(
        "The category action is missing required information.",
      );
    }

    await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        actor_id: context.userId,
        actor_name: actor,
        action: `category_${data.action}`,
        target_type: "category",
        target_id:
          data.id ??
          data.name ??
          null,
      });

    return {
      ok: true,
    };
  });
