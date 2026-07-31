import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OWNER_EMAIL = "draxgaming855@gmail.com";

export const ADMIN_PERMISSION_KEYS = [
  "approve_bots",
  "delete_bots",
  "verify_bots",
  "feature_bots",
  "view_users",
  "ban_users",
  "manage_reports",
  "manage_reviews",
  "manage_categories",
  "manage_moderators",
  "view_audit_logs",
] as const;

export type AdminPermission =
  (typeof ADMIN_PERMISSION_KEYS)[number];

export async function isOwnerAccount(
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc(
    "is_botgalaxy_owner",
    { target_user_id: userId },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function requireOwner(userId: string) {
  if (!(await isOwnerAccount(userId))) {
    throw new Error(
      "Only the BotGalaxy owner can perform this action.",
    );
  }
}

export async function hasAdminRole(
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function requireAdminRole(userId: string) {
  if (!(await hasAdminRole(userId))) {
    throw new Error("Administrator access is required.");
  }
}

export async function hasAdminPermission(
  userId: string,
  permission: AdminPermission,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc(
    "has_admin_permission",
    {
      target_user_id: userId,
      permission_name: permission,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function requireAdminPermission(
  userId: string,
  permission: AdminPermission,
) {
  if (!(await hasAdminPermission(userId, permission))) {
    throw new Error(
      `You do not have the required permission: ${permission}.`,
    );
  }
}

export async function isUserBanned(
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc(
    "is_user_banned",
    { target_user_id: userId },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function actorDisplayName(
  userId: string,
): Promise<string> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  return data?.username ?? "BotGalaxy Administrator";
}
