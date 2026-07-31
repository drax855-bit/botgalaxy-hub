import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requestInput = z.object({
  requestedEmail: z.string().trim().email().max(320),
});

export const createAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => requestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const email = data.requestedEmail.toLowerCase();

    const { data: isAdmin, error: roleError } =
      await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });

    if (roleError) {
      throw new Error(roleError.message);
    }

    if (!isAdmin) {
      throw new Error(
        "Only administrators can create administrator requests.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: usersData, error: userError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      throw new Error(userError.message);
    }

    const requestedUser = usersData.users.find(
      (user) => user.email?.toLowerCase() === email,
    );

    if (!requestedUser) {
      throw new Error(
        "That email does not have a registered BotGalaxy account.",
      );
    }

    const { data: existingRole, error: existingRoleError } =
      await context.supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", requestedUser.id)
        .eq("role", "admin")
        .maybeSingle();

    if (existingRoleError) {
      throw new Error(existingRoleError.message);
    }

    if (existingRole) {
      throw new Error("This account is already an administrator.");
    }

    // admin_requests was added manually, so generated Supabase types
    // may not include it yet.
    const database = context.supabase as any;

    const { data: request, error: requestError } = await database
      .from("admin_requests")
      .insert({
        requested_email: email,
        requested_user_id: requestedUser.id,
        requested_by: context.userId,
        status: "pending",
      })
      .select(
        "id, requested_email, requested_user_id, requested_by, status, created_at",
      )
      .single();

    if (requestError) {
      if (requestError.code === "23505") {
        throw new Error(
          "A pending administrator request already exists for this email.",
        );
      }

      throw new Error(requestError.message);
    }

    return request;
  });

export const getAdminRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } =
      await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });

    if (roleError) {
      throw new Error(roleError.message);
    }

    if (!isAdmin) {
      throw new Error("Administrator access is required.");
    }

    const database = context.supabase as any;

    const { data, error } = await database
      .from("admin_requests")
      .select(
        `
          id,
          requested_email,
          requested_user_id,
          requested_by,
          status,
          created_at,
          reviewed_by,
          reviewed_at
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });

export const cancelAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } =
      await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });

    if (roleError) {
      throw new Error(roleError.message);
    }

    if (!isAdmin) {
      throw new Error("Administrator access is required.");
    }

    const database = context.supabase as any;

    const { data: updatedRequest, error } = await database
      .from("admin_requests")
      .update({
        status: "cancelled",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .eq("requested_by", context.userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!updatedRequest) {
      throw new Error(
        "The request was not found, was already reviewed, or cannot be cancelled.",
      );
    }

    return { ok: true };
  });
