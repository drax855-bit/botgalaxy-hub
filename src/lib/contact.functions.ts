import {
  createServerFn,
} from "@tanstack/react-start";
import {
  z,
} from "zod";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "Enter your name.",
    )
    .max(
      80,
      "Name is too long.",
    ),

  email: z
    .string()
    .trim()
    .email(
      "Enter a valid email address.",
    )
    .max(
      254,
      "Email address is too long.",
    ),

  issueType: z.enum([
    "general",
    "bot_ownership",
    "account",
    "report",
    "partnership",
    "other",
  ]),

  subject: z
    .string()
    .trim()
    .min(
      4,
      "Subject must contain at least 4 characters.",
    )
    .max(
      120,
      "Subject must contain 120 characters or fewer.",
    ),

  message: z
    .string()
    .trim()
    .min(
      20,
      "Message must contain at least 20 characters.",
    )
    .max(
      3000,
      "Message must contain 3000 characters or fewer.",
    ),

  website: z
    .string()
    .max(200)
    .optional()
    .default(""),

  startedAt: z
    .number()
    .int()
    .positive(),
});

export type ContactIssueType =
  z.infer<
    typeof contactSchema
  >["issueType"];

export const submitContactRequest =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (raw: unknown) =>
        contactSchema.parse(
          raw,
        ),
    )
    .handler(
      async ({
        data,
      }) => {
        /*
         * Hidden honeypot field.
         * Real users never fill this.
         */
        if (
          data.website.trim()
        ) {
          return {
            ok: true,
          };
        }

        const elapsed =
          Date.now() -
          data.startedAt;

        /*
         * Prevent instant automated
         * submissions and very old forms.
         */
        if (elapsed < 1500) {
          throw new Error(
            "Please wait a moment before submitting the form.",
          );
        }

        if (
          elapsed >
          2 * 60 * 60 * 1000
        ) {
          throw new Error(
            "This form has expired. Refresh the page and try again.",
          );
        }

        const {
          supabaseAdmin,
        } = await import(
          "@/integrations/supabase/client.server"
        );

        const email =
          data.email
            .trim()
            .toLowerCase();

        const oneHourAgo =
          new Date(
            Date.now() -
              60 *
                60 *
                1000,
          ).toISOString();

        /*
         * Maximum three requests from
         * the same email every hour.
         */
        const {
          count,
          error:
            rateLimitError,
        } =
          await supabaseAdmin
            .from(
              "contact_submissions",
            )
            .select(
              "id",
              {
                count: "exact",
                head: true,
              },
            )
            .eq(
              "email",
              email,
            )
            .gte(
              "created_at",
              oneHourAgo,
            );

        if (
          rateLimitError
        ) {
          throw new Error(
            "Could not check the request limit. Please try again.",
          );
        }

        if (
          (count ?? 0) >= 3
        ) {
          throw new Error(
            "Too many requests were submitted from this email. Please try again later.",
          );
        }

        const tenMinutesAgo =
          new Date(
            Date.now() -
              10 *
                60 *
                1000,
          ).toISOString();

        /*
         * Prevent accidental duplicate
         * submissions.
         */
        const {
          data:
            duplicateRows,
          error:
            duplicateError,
        } =
          await supabaseAdmin
            .from(
              "contact_submissions",
            )
            .select("id")
            .eq(
              "email",
              email,
            )
            .eq(
              "subject",
              data.subject,
            )
            .eq(
              "message",
              data.message,
            )
            .gte(
              "created_at",
              tenMinutesAgo,
            )
            .limit(1);

        if (
          duplicateError
        ) {
          throw new Error(
            "Could not verify the request. Please try again.",
          );
        }

        if (
          duplicateRows &&
          duplicateRows.length >
            0
        ) {
          return {
            ok: true,
          };
        }

        const {
          error:
            insertError,
        } =
          await supabaseAdmin
            .from(
              "contact_submissions",
            )
            .insert({
              name:
                data.name,
              email,
              issue_type:
                data.issueType,
              subject:
                data.subject,
              message:
                data.message,
              status:
                "open",
            });

        if (
          insertError
        ) {
          throw new Error(
            "Your message could not be submitted. Please try again.",
          );
        }

        return {
          ok: true,
        };
      },
    );
