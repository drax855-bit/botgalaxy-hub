import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAIL = "draxgaming855@gmail.com";

const requestInput = z.object({
  requestedEmail: z.string().trim().email().max(320),
});

async function sendAdminRequestEmail(
  requestedEmail: string,
  requestId: string,
) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing from Vercel.");
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

Granting administrator access will allow this account to manage sensitive parts of BotGalaxy, including bot approvals, moderation actions, user roles, categories, reports, and other administrative settings.

IMPORTANT SECURITY WARNING

Administrator access is powerful and can be dangerous if granted to the wrong person. An administrator may be able to approve or remove bots, change user permissions, access moderation tools, and make changes that affect the entire platform.

Only approve this request if:

- You personally know and trust the requested account.
- You were expecting this request.
- You have carefully verified the email address.
- You understand the permissions being granted.

Do not approve this request if you are unsure, busy, distracted, or unable to verify the person. It is safer to deny the request and review it later.

For security, this email cannot grant administrator access by itself. Sign in to the protected BotGalaxy admin area to approve or deny the request.

Admin area:
https://botgalaxy-hub-52g8.vercel.app/admin

Sincerely,
BotGalaxy Security Team`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#18181b;line-height:1.6">
          <div style="background:#111827;color:white;padding:18px 22px;border-radius:12px 12px 0 0">
            <strong>BOTGALAXY ADMIN ALERT</strong>
          </div>

          <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 12px 12px">
            <h2 style="margin-top:0">Administrator access request</h2>

            <p>A new administrator access request has been submitted.</p>

            <div style="background:#f4f4f5;padding:14px;border-radius:8px">
              <strong>Requested account:</strong><br />
              ${requestedEmail}
            </div>

            <p style="font-size:13px;color:#71717a">
              Request ID: ${requestId}
            </p>

            <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:8px;color:#991b1b">
              <strong>Important security warning</strong>
              <p style="margin-bottom:0">
                Administrator access is powerful and can be dangerous if
                granted to the wrong person. Verify the email carefully before
                taking any action.
              </p>
            </div>

            <p><strong>Only approve this request if:</strong></p>

            <ul>
              <li>You personally know and trust the requested account.</li>
              <li>You were expecting this request.</li>
              <li>You carefully verified the email address.</li>
              <li>You understand the permissions being granted.</li>
            </ul>

            <p>
              Do not approve while busy, distracted, or unsure. It is safer to
              deny the request and review it later.
            </p>

            <p>
              For security, replying to this email will not grant access.
              Approval must happen inside the protected BotGalaxy admin area.
            </p>

            <a
              href="https://botgalaxy-hub-52g8.vercel.app/admin"
              style="display:inline-block;background:#111827;color:white;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold"
            >
              Open BotGalaxy Admin
            </a>

            <p style="margin-top:24px">
              Sincerely,<br />
              <strong>BotGalaxy Security Team</strong>
            </p>
          </div>
        </div>
      `,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      result?.message ||
      result?.error ||
      "Resend could not send the administrator alert.";

    throw new Error(message);
  }
}

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

    try {
      await sendAdminRequestEmail(email, request.id);
    } catch (emailError) {
      await supabaseAdmin
        .from("admin_requests" as any)
        .delete()
        .eq("id", request.id);

      throw new Error(
        emailError instanceof Error
          ? `Request was not saved because the alert email failed: ${emailError.message}`
          : "Request was not saved because the alert email failed.",
      );
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
