import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveUser } from "@/lib/account-guard";

const issueTypeSchema = z.enum([
  "general",
  "bot_ownership",
  "account",
  "report",
  "partnership",
  "other",
]);

const contactStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

const contactInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  issueType: issueTypeSchema,
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(20).max(3000),
  website: z.string().max(200).optional().default(""),
  startedAt: z.number().int().positive(),
});

export type ContactIssueType = z.infer<typeof issueTypeSchema>;
export type ContactStatus = z.infer<typeof contactStatusSchema>;

export const submitContactRequest = createServerFn({
  method: "POST",
})
  .inputValidator((raw: unknown) => contactInput.parse(raw))
  .handler(async ({ data }) => {
    /*
     * Hidden honeypot. A real visitor never sees or fills this field.
     * Return success instead of revealing that the spam was detected.
     */
    if (data.website.trim()) {
      return { ok: true };
    }

    const elapsed = Date.now() - data.startedAt;

    if (elapsed < 1_500) {
      throw new Error(
        "Please wait a moment before submitting the form.",
      );
    }

    if (elapsed > 2 * 60 * 60 * 1_000) {
      throw new Error(
        "This form has expired. Refresh the page and try again.",
      );
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    const email = data.email.toLowerCase();
    const oneHourAgo = new Date(
      Date.now() - 60 * 60 * 1_000,
    ).toISOString();

    const { count, error: rateLimitError } = await db
      .from("contact_submissions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if (rateLimitError) {
      throw new Error(
        "Could not check the request limit. Please try again.",
      );
    }

    if ((count ?? 0) >= 3) {
      throw new Error(
        "Too many requests were submitted from this email. Please try again later.",
      );
    }

    const tenMinutesAgo = new Date(
      Date.now() - 10 * 60 * 1_000,
    ).toISOString();

    const { data: duplicateRows, error: duplicateError } =
      await db
        .from("contact_submissions")
        .select("id")
        .eq("email", email)
        .eq("subject", data.subject)
        .eq("message", data.message)
        .gte("created_at", tenMinutesAgo)
        .limit(1);

    if (duplicateError) {
      throw new Error(
        "Could not verify the request. Please try again.",
      );
    }

    if ((duplicateRows ?? []).length > 0) {
      return { ok: true };
    }

    const { error: insertError } = await db
      .from("contact_submissions")
      .insert({
        name: data.name,
        email,
        issue_type: data.issueType,
        subject: data.subject,
        message: data.message,
        status: "open",
      });

    if (insertError) {
      throw new Error(
        "Your message could not be submitted. Please try again.",
      );
    }

    return { ok: true };
  });

export const getAdminContactSubmissions = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: z
          .union([contactStatusSchema, z.literal("all")])
          .optional()
          .default("open"),
        q: z.string().trim().max(100).optional().default(""),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("@/lib/admin.server");

    await requireOwner(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    let query = db
      .from("contact_submissions")
      .select(
        "id, user_id, name, email, issue_type, subject, message, status, created_at, updated_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    if (data.q) {
      const term = data.q.replace(/[%,()]/g, " ").trim();

      if (term) {
        query = query.or(
          `name.ilike.%${term}%,email.ilike.%${term}%,subject.ilike.%${term}%,message.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return rows ?? [];
  });

export const adminContactAction = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum([
          "start",
          "resolve",
          "close",
          "reopen",
          "delete",
        ]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("@/lib/admin.server");

    await requireOwner(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as any;

    if (data.action === "delete") {
      const { error } = await db
        .from("contact_submissions")
        .delete()
        .eq("id", data.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const status: ContactStatus =
        data.action === "start"
          ? "in_progress"
          : data.action === "resolve"
            ? "resolved"
            : data.action === "close"
              ? "closed"
              : "open";

      const { error } = await db
        .from("contact_submissions")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (error) {
        throw new Error(error.message);
      }
    }

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_name: "BotGalaxy Owner",
      action: `contact_${data.action}`,
      target_type: "contact_submission",
      target_id: data.id,
    });

    return { ok: true };
  });
