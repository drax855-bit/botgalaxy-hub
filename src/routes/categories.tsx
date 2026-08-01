import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Loader2,
} from "lucide-react";

import { getCategories } from "@/lib/directory.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      {
        title: "Discord bot categories — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Browse Discord bots by category, including moderation, music, gaming, economy and utilities.",
      },
      {
        property: "og:title",
        content: "Discord bot categories — BotGalaxy",
      },
      {
        property: "og:description",
        content:
          "Find Discord bots by category on BotGalaxy.",
      },
    ],
  }),

  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 300_000,
  });

  if (categories.isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (categories.isError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">
          Categories unavailable
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          We could not load the categories. Please try again.
        </p>

        <Button
          asChild
          className="mt-6"
        >
          <Link to="/bots">
            Explore bots
          </Link>
        </Button>
      </main>
    );
  }

  const rows = categories.data ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <div className="flex items-center gap-2 text-primary">
          <Bot className="h-5 w-5" />

          <span className="text-sm font-medium">
            Bot directory
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Browse categories
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Find Discord bots for moderation, music, gaming,
          economy, security and more.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold">
            No categories found
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Categories have not been added yet.
          </p>
        </div>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((category) => (
            <Link
              key={category.id}
              to="/bots"
              search={{
                category: category.slug,
              }}
              className="group flex min-h-44 flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                  {category.icon || "🤖"}
                </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                {category.name}
              </h2>

              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {category.description ||
                  `Explore Discord bots in the ${category.name} category.`}
              </p>

              <span className="mt-auto pt-5 text-sm font-medium text-primary">
                View bots
              </span>
            </Link>
          ))}
        </section>
      )}

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="text-xl font-semibold">
          Looking for every bot?
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Open the complete directory and use search and filters.
        </p>

        <Button
          asChild
          className="mt-5"
        >
          <Link to="/bots">
            Explore all bots
          </Link>
        </Button>
      </div>
    </main>
  );
}
