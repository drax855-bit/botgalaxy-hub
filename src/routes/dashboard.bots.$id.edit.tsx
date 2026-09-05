import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  X,
} from "lucide-react";

import { useSession } from "@/hooks/useSession";
import { getCategories } from "@/lib/directory.functions";
import {
  getOwnedBotForEdit,
  updateOwnedBot,
} from "@/lib/bot-edit.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute(
  "/dashboard/bots/$id/edit",
)({
  component: EditBotPage,
});

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

function EditBotPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useSession();

  // Only the stable user ID is used in effect dependencies: session
  // refreshes can replace the full user object and would otherwise rerun
  // the loaders and overwrite unsaved form state.
  const userId = user?.id;

  const [categories, setCategories] = useState<
    Category[]
  >([]);

  const [loadingBot, setLoadingBot] = useState(true);
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [
    shortDescription,
    setShortDescription,
  ] = useState("");
  const [
    longDescription,
    setLongDescription,
  ] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [prefix, setPrefix] = useState("/");
  const [ownerName, setOwnerName] = useState("");

  const [
    selectedCategories,
    setSelectedCategories,
  ] = useState<string[]>([]);

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({
        to: "/auth",
        replace: true,
      });
    }
  }, [loading, userId, navigate]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    async function loadBot() {
      setLoadingBot(true);
      setError("");

      try {
        const bot = await getOwnedBotForEdit({
          data: {
            id,
          },
        });

        setName(bot.name);
        setClientId(bot.client_id);
        setAvatarUrl(bot.avatar_url ?? "");
        setShortDescription(
          bot.short_description,
        );
        setLongDescription(
          bot.long_description,
        );
        setInviteUrl(bot.invite_url);
        setWebsiteUrl(bot.website_url ?? "");
        setSupportUrl(bot.support_url ?? "");
        setPrefix(bot.prefix ?? "/");
        setOwnerName(bot.owner_name);
        setTags(bot.tags ?? []);
        setSelectedCategories(
          bot.categories ?? [],
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load the bot.",
        );
      } finally {
        setLoadingBot(false);
      }
    }

    void loadBot();
  }, [id, user]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();

        setCategories(
          data as Category[],
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load categories.",
        );
      } finally {
        setLoadingCategories(false);
      }
    }

    void loadCategories();
  }, []);

  function toggleCategory(
    categoryId: string,
  ) {
    setSelectedCategories((current) => {
      if (current.includes(categoryId)) {
        return current.filter(
          (item) => item !== categoryId,
        );
      }

      if (current.length >= 4) {
        setError(
          "You can select a maximum of 4 categories.",
        );

        return current;
      }

      setError("");

      return [
        ...current,
        categoryId,
      ];
    });
  }

  function addTag() {
    const cleaned = tagInput
      .trim()
      .toLowerCase();

    if (!cleaned) {
      return;
    }

    if (tags.length >= 8) {
      setError(
        "You can add a maximum of 8 tags.",
      );

      return;
    }

    if (tags.includes(cleaned)) {
      setTagInput("");
      return;
    }

    setTags((current) => [
      ...current,
      cleaned,
    ]);

    setTagInput("");
    setError("");
  }

  function removeTag(tag: string) {
    setTags((current) =>
      current.filter(
        (item) => item !== tag,
      ),
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (
      selectedCategories.length === 0
    ) {
      setError(
        "Select at least one category.",
      );

      return;
    }

    setSaving(true);

    try {
      await updateOwnedBot({
        data: {
          id,
          name,
          client_id: clientId,
          avatar_url: avatarUrl,
          short_description:
            shortDescription,
          long_description:
            longDescription,
          tags,
          categories:
            selectedCategories,
          invite_url: inviteUrl,
          website_url: websiteUrl,
          support_url: supportUrl,
          prefix,
          owner_name: ownerName,
        },
      });

      setSuccess(true);

      window.setTimeout(() => {
        void navigate({
          to: "/dashboard",
          replace: true,
        });
      }, 1800);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update the bot.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading ||
    !user ||
    loadingBot
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />

          <h1 className="mt-5 text-2xl font-bold">
            Bot updated successfully
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your bot is now pending staff
            review again.
          </p>

          <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-10">
      <Button
        asChild
        variant="ghost"
        className="mb-6"
      >
        <Link to="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-3xl font-bold">
          Edit bot
        </h1>

        <p className="mt-2 text-muted-foreground">
          Saving changes will send the
          bot back for staff review.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-8 rounded-2xl border border-border bg-card p-5 sm:p-8"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Basic information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bot name">
              <Input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                minLength={2}
                maxLength={60}
                required
              />
            </Field>

            <Field label="Discord Client ID">
              <Input
                value={clientId}
                onChange={(event) =>
                  setClientId(
                    event.target.value.replace(
                      /\D/g,
                      "",
                    ),
                  )
                }
                minLength={5}
                maxLength={25}
                inputMode="numeric"
                required
              />
            </Field>

            <Field label="Owner name">
              <Input
                value={ownerName}
                onChange={(event) =>
                  setOwnerName(
                    event.target.value,
                  )
                }
                minLength={2}
                maxLength={60}
                required
              />
            </Field>

            <Field label="Bot prefix">
              <Input
                value={prefix}
                onChange={(event) =>
                  setPrefix(
                    event.target.value,
                  )
                }
                maxLength={8}
              />
            </Field>
          </div>

          <Field label="Avatar URL">
            <Input
              type="url"
              value={avatarUrl}
              onChange={(event) =>
                setAvatarUrl(
                  event.target.value,
                )
              }
              placeholder="https://example.com/logo.png"
            />
          </Field>

          {avatarUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <img
                src={avatarUrl}
                alt="Bot avatar preview"
                className="h-16 w-16 rounded-xl object-cover"
              />

              <span className="text-sm text-muted-foreground">
                Avatar preview
              </span>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Description
          </h2>

          <Field
            label="Short description"
            description={`${shortDescription.length}/160 characters`}
          >
            <textarea
              value={shortDescription}
              onChange={(event) =>
                setShortDescription(
                  event.target.value,
                )
              }
              minLength={20}
              maxLength={160}
              required
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>

          <Field
            label="Full description"
            description={`${longDescription.length}/6000 characters`}
          >
            <textarea
              value={longDescription}
              onChange={(event) =>
                setLongDescription(
                  event.target.value,
                )
              }
              minLength={50}
              maxLength={6000}
              required
              className="min-h-44 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Categories
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Select between 1 and 4
              categories.
            </p>
          </div>

          {loadingCategories ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(
                (category) => {
                  const selected =
                    selectedCategories.includes(
                      category.id,
                    );

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        toggleCategory(
                          category.id,
                        )
                      }
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      <div className="font-medium">
                        {category.name}
                      </div>

                      {category.description && (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {
                            category.description
                          }
                        </div>
                      )}
                    </button>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">
              Tags
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Add up to 8 tags.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(event) =>
                setTagInput(
                  event.target.value,
                )
              }
              placeholder="moderation"
              maxLength={24}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  event.preventDefault();
                  addTag();
                }
              }}
            />

            <Button
              type="button"
              variant="secondary"
              onClick={addTag}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                >
                  {tag}

                  <button
                    type="button"
                    onClick={() =>
                      removeTag(tag)
                    }
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Links
          </h2>

          <Field label="Bot invite URL">
            <Input
              type="url"
              value={inviteUrl}
              onChange={(event) =>
                setInviteUrl(
                  event.target.value,
                )
              }
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website URL">
              <Input
                type="url"
                value={websiteUrl}
                onChange={(event) =>
                  setWebsiteUrl(
                    event.target.value,
                  )
                }
              />
            </Field>

            <Field label="Support server URL">
              <Input
                type="url"
                value={supportUrl}
                onChange={(event) =>
                  setSupportUrl(
                    event.target.value,
                  )
                }
              />
            </Field>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            asChild
            type="button"
            variant="secondary"
          >
            <Link to="/dashboard">
              Cancel
            </Link>
          </Button>

          <Button
            type="submit"
            disabled={
              saving ||
              loadingCategories
            }
          >
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {saving
              ? "Saving..."
              : "Save changes"}
          </Button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">
          {label}
        </span>

        {description && (
          <span className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>

      {children}
    </label>
  );
}
