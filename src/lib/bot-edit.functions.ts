import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireActiveUser } from "@/lib/account-guard";
import { sel } from "@/lib/supabase-public.server";

const botIdInput = z.object({
  id: z.string().uuid(),
});

const updateBotInput = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(60),

  client_id: z
    .string()
    .trim()
    .regex(/^\d{5,25}$/, "Client ID must be numeric"),

  avatar_url: z
    .string()
    .trim()
    .url()
    .max(400)
    .or(z.literal(""))
    .optional(),

  short_description: z
    .string()
    .trim()
    .min(20)
    .max(160),

  long_description: z
    .string()
    .trim()
    .min(50)
    .max(6000),

  tags: z
    .array(
      z.string().trim().min(1).max(24),
    )
    .max(8),

  categories: z
    .array(z.string().uuid())
    .min(1)
    .max(4),

  invite_url: z
    .string()
    .trim()
    .url()
    .max(400),

  website_url: z
    .string()
    .trim()
    .url()
    .max(400)
    .or(z.literal(""))
    .optional(),

  support_url: z
    .string()
    .trim()
    .url()
    .max(400)
    .or(z.literal(""))
    .optional(),

  prefix: z
    .string()
    .trim()
    .max(8)
    .optional(),

  owner_name: z
    .string()
    .trim()
    .min(2)
    .max(60),
});

export const getOwnedBotForEdit = createServerFn({
  method: "GET",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    botIdInput.parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: bot, error } = await supabase
      .from("bots")
      .select(
        sel(`
          id,
          name,
          client_id,
          avatar_url,
          short_description,
          long_description,
          tags,
          invite_url,
          website_url,
          support_url,
          prefix,
          owner_name,
          status
        `),
      )
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!bot) {
      throw new Error(
        "Bot not found or you do not own this bot.",
      );
    }

    const { data: categoryRows, error: categoryError } =
      await supabase
        .from("bot_categories")
        .select(sel("category_id"))
        .eq("bot_id", data.id);

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    return {
      ...(bot as unknown as {
        id: string;
        name: string;
        client_id: string;
        avatar_url: string | null;
        short_description: string;
        long_description: string;
        tags: string[];
        invite_url: string;
        website_url: string | null;
        support_url: string | null;
        prefix: string | null;
        owner_name: string;
        status: "pending" | "approved" | "rejected";
      }),

      categories: (
        (categoryRows ?? []) as unknown as {
          category_id: string;
        }[]
      ).map((row) => row.category_id),
    };
  });

export const updateOwnedBot = createServerFn({
  method: "POST",
})
  .middleware([requireActiveUser])
  .inputValidator((raw: unknown) =>
    updateBotInput.parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existingBot, error: existingError } =
      await supabase
        .from("bots")
        .select(sel("id"))
        .eq("id", data.id)
        .eq("owner_id", userId)
        .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (!existingBot) {
      throw new Error(
        "Bot not found or you do not own this bot.",
      );
    }

    const { error: updateError } = await supabase
      .from("bots")
      .update({
        name: data.name,
        client_id: data.client_id,
        avatar_url: data.avatar_url || null,
        short_description: data.short_description,
        long_description: data.long_description,
        tags: data.tags,
        invite_url: data.invite_url,
        website_url: data.website_url || null,
        support_url: data.support_url || null,
        prefix: data.prefix || "/",
        owner_name: data.owner_name,

        status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("owner_id", userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: deleteCategoriesError } =
      await supabase
        .from("bot_categories")
        .delete()
        .eq("bot_id", data.id);

    if (deleteCategoriesError) {
      throw new Error(
        deleteCategoriesError.message,
      );
    }

    const { error: categoryInsertError } =
      await supabase
        .from("bot_categories")
        .insert(
          data.categories.map((categoryId) => ({
            bot_id: data.id,
            category_id: categoryId,
          })),
        );

    if (categoryInsertError) {
      throw new Error(
        categoryInsertError.message,
      );
    }

    return {
      ok: true,
      id: data.id,
      status: "pending" as const,
    };
  });
