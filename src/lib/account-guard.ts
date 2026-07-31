import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Authenticated + not banned.
 *
 * The ban row is readable by the account itself through RLS, so this stays on
 * the request-scoped client and never touches privileged credentials.
 */
export const requireActiveUser = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("user_bans")
      .select("active, expires_at, reason")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!error && data?.active) {
      const expired =
        Boolean(data.expires_at) &&
        new Date(data.expires_at as string).getTime() <= Date.now();

      if (!expired) {
        throw new Error(
          `Your BotGalaxy account is suspended: ${data.reason ?? "policy violation"}`,
        );
      }
    }

    return next();
  });
