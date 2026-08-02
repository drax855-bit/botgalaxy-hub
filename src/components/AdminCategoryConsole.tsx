import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FolderTree,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  getCategories,
} from "@/lib/directory.functions";
import {
  adminCategoryAction,
} from "@/lib/admin.functions";
import type {
  CategoryRow,
} from "@/lib/directory";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";

export function AdminCategoryConsole() {
  const [categories, setCategories] =
    useState<CategoryRow[]>([]);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [workingId, setWorkingId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    void loadCategories();
  }, []);

  const filteredCategories =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return categories;
      }

      return categories.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(term) ||
          category.slug
            .toLowerCase()
            .includes(term) ||
          (
            category.description ??
            ""
          )
            .toLowerCase()
            .includes(term),
      );
    }, [categories, search]);

  async function loadCategories() {
    setLoading(true);
    setError("");

    try {
      const rows =
        await getCategories();

      setCategories(rows);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load categories.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanName =
      name.trim();

    const cleanDescription =
      description.trim();

    setError("");
    setSuccess("");

    if (
      cleanName.length < 2 ||
      cleanName.length > 40
    ) {
      setError(
        "Category names must contain 2 to 40 characters.",
      );

      return;
    }

    if (
      cleanDescription.length > 160
    ) {
      setError(
        "Descriptions must contain 160 characters or fewer.",
      );

      return;
    }

    setCreating(true);

    try {
      await adminCategoryAction({
        data: {
          action: "create",
          name: cleanName,
          description:
            cleanDescription,
        },
      });

      setName("");
      setDescription("");

      setSuccess(
        `${cleanName} was created.`,
      );

      await loadCategories();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create the category.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteCategory(
    category: CategoryRow,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${category.name}"?\n\nBots assigned to this category may lose the category association. This action will be recorded in the audit log.`,
      );

    if (!confirmed) {
      return;
    }

    setWorkingId(category.id);
    setError("");
    setSuccess("");

    try {
      await adminCategoryAction({
        data: {
          action: "delete",
          id: category.id,
        },
      });

      setSuccess(
        `${category.name} was deleted.`,
      );

      await loadCategories();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete the category.",
      );
    } finally {
      setWorkingId("");
    }
  }

  const slugPreview =
    makeSlug(name);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <FolderTree className="h-5 w-5" />

            <span className="text-sm font-medium">
              Directory organization
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Category management
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create, search and remove the
            categories used to organize bots.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={loadCategories}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      <form
        onSubmit={createCategory}
        className="mt-6 rounded-xl border border-border bg-background p-4"
      >
        <h3 className="font-semibold">
          Create category
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="category-name"
              className="text-sm font-medium"
            >
              Category name
            </label>

            <Input
              id="category-name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Example: Productivity"
              minLength={2}
              maxLength={40}
              className="mt-2"
            />

            {slugPreview && (
              <p className="mt-2 text-xs text-muted-foreground">
                URL slug: {slugPreview}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="category-description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <span className="text-xs text-muted-foreground">
                {description.length}/160
              </span>
            </div>

            <Input
              id="category-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="What bots belong here?"
              maxLength={160}
              className="mt-2"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-4"
          disabled={
            creating ||
            name.trim().length < 2
          }
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}

          Create category
        </Button>
      </form>

      {error && (
        <Notice type="error">
          {error}
        </Notice>
      )}

      {success && (
        <Notice type="success">
          {success}
        </Notice>
      )}

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search categories"
          className="pl-10"
          maxLength={80}
        />
      </div>

      {loading ? (
        <div className="flex min-h-44 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : !filteredCategories.length ? (
        <div className="mt-6 rounded-xl border border-dashed border-border py-12 text-center">
          <FolderTree className="mx-auto h-8 w-8 text-muted-foreground" />

          <p className="mt-3 font-medium">
            No categories found
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Create a category or try another
            search.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {filteredCategories.map(
            (category) => {
              const working =
                workingId === category.id;

              return (
                <article
                  key={category.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {category.icon && (
                          <span
                            aria-hidden="true"
                            className="text-xl"
                          >
                            {category.icon}
                          </span>
                        )}

                        <h3 className="truncate font-semibold">
                          {category.name}
                        </h3>
                      </div>

                      <p className="mt-1 text-xs text-primary">
                        /{category.slug}
                      </p>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {category.description ||
                          "No description provided."}
                      </p>

                      <p className="mt-3 text-xs text-muted-foreground">
                        Sort order:{" "}
                        {category.sort_order}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={working}
                      onClick={() =>
                        void deleteCategory(
                          category,
                        )
                      }
                    >
                      {working ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}

                      Delete
                    </Button>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}

function Notice({
  type,
  children,
}: {
  type: "success" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {children}
    </div>
  );
}

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
