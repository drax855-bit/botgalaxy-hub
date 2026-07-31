import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveUser } from "@/lib/account-guard";

const OWNER_EMAIL = "draxgaming855@gmail.com";
const ADMIN_AREA_URL = "https://botgalaxy-hub-52g8.vercel.app/admin";

const requestInput = z.object({
  requestedEmail: z.string().trim().email().max(320),
});

export type AdminRequestRow = {
  id: string;
  requested_email: string;
  requested_user_id: string | null;
  requested_by: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

/**
 * Best-effort owner alert. Returns false when email delivery is not
 * configured so the request itself still succeeds.
 */
async function sendAdminRequestEmail(
  requestedEmail: string,
  requestId: string,
): Promise<boolean> {
  const apiKey = process.env["RESEND_API_KEY"];

  if (!apiKey) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "BotGalaxy Security <onboarding@resend.dev>",
      to: [OWNER_EMAIL],
      subject: "[BOTGALAXY ADMIN ALERT] Administrator Access Request",
      text: `[BOTGALAXY ADMIN ALERT]

A new administrator access request has been submitted.

Requested account:
${requestedEmail}

Request ID:
${requestId}

IMPORTANT SECURITY WARNING

Administrator access is powerful. Only approve this request if you
personally know and trust the requested account, you were expecting the
request, and you have verified the email address carefully.

This email cannot grant administrator access by itself. Sign in to the
protected BotGalaxy admin area to approve or deny the request.

Admin area:
${ADMIN_AREA_URL}

Sincerely,
BotGalaxy Security Team`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#18181b;line-height:1.6">
          <div style="background:#111827;color:white;padding:18px 22px;border-radius:12px 12px 0 0">
            <strong>BOTGALAXY ADMIN ALERT</strong>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="margin-top:0">Administrator access request</h2>
            <div style="background:#f4f4f5;padding:14px;border-radius:8px">
              <strong>Requested account:</strong><br />${requestedEmail}
            </div>
            <p style="font-size:13px;color:#71717a">Request ID: ${requestId}</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;color:#991b1b">
              <strong>Important security warning</strong>
              <p style="margin-bottom:0">
                Administrator access is powerful and can be dangerous if granted
                to the wrong person. Verify the email carefully before acting.
              </p>
            </div>
            <p>Approval must happen inside the protected BotGalaxy admin area.</p>
            <a href="${ADMIN_AREA_URL}" style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold">Open BotGalaxy Admin</a>
            <p style="margin-top:24px">Sincerely,<br /><strong>BotGalaxy Security Team</strong></p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    throw new Error(
      result?.message ||
        result?.error ||
        "Resend could not send the administrator alert.",
    );
  }

  return true;
}

export const createAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) => requestInput.parse(raw))
  .handler(async ({ data, context }) => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireOwner(context.userId);

    const email = data.requestedEmail.toLowerCase();

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: usersData, error: userError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

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
      await supabaseAdmin
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

    const { data: request, error: requestError } = await supabaseAdmin
      .from("admin_requests")
      .insert({
        requested_email: email,
        requested_user_id: requestedUser.id,
        requested_by: context.userId,
        status: "pending",
      })
      .select(
        "id, requested_email, requested_user_id, requested_by, status, created_at, reviewed_by, reviewed_at",
      )
      .single();

    if (requestError) {
      if (requestError.code === "23505" || requestError.code === "23505") {
        throw new Error(
          "A pending administrator request already exists for this email.",
        );
      }

      throw new Error(
        requestError.code === "23505"
          ? "A pending administrator request already exists for this email."
          : requestError.message,
      );
    }

    let emailed = false;

    try {
      emailed = await sendAdminRequestEmail(email, request.id);
    } catch {
      emailed = false;
    }

    return { ...(request as AdminRequestRow), emailed };
  });

export const getAdminRequests = createServerFn({ method: "GET" })
  .middleware([requireActiveUser])
  .handler(async ({ context }): Promise<AdminRequestRow[]> => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireOwner(context.userId);

    const { data, error } = await context.supabase
      .from("admin_requests")
      .select(
        "id, requested_email, requested_user_id, requested_by, status, created_at, reviewed_by, reviewed_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as AdminRequestRow[];
  });

export const cancelAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z.object({ requestId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireOwner(context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: updatedRequest, error } = await supabaseAdmin
      .from("admin_requests")
      .update({
        status: "cancelled",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
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

export const reviewAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        action: z.enum(["approve", "deny"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const guards = await import("@/lib/admin-guards.server");
    await guards.requireOwner(context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { error } = await supabaseAdmin.rpc("review_admin_request", {
      p_request_id: data.requestId,
      p_action: data.action,
      p_reviewer: context.userId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true, action: data.action };
  });
