import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Authenticated + not banned.
 *
 * Ban state is resolved through the public `is_user_banned` RPC on the
 * request-scoped client (never privileged credentials). Fails closed: any RPC
 * error blocks the action instead of silently allowing it.
 */
export const requireActiveUser = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: banned, error } = await context.supabase.rpc("is_user_banned", {
      target_user_id: context.userId,
    });

    if (error) {
      console.error("[account-guard] is_user_banned failed", error);
      throw new Error("We couldn't verify your account status. Please try again.");
    }

    if (banned) {
      const { data: ban } = await context.supabase
        .from("user_bans")
        .select("reason, expires_at")
        .eq("user_id", context.userId)
        .maybeSingle();

      const until = ban?.expires_at
        ? ` Suspension ends ${new Date(ban.expires_at as string).toLocaleString()}.`
        : " This suspension is permanent.";

      throw new Error(
        `Your BotGalaxy account is suspended: ${ban?.reason ?? "policy violation"}.${until}`,
      );
    }

    return next();
  });
