import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { z } from "zod";

import {
  listBots,
  getCategories,
  getDirectoryAvailability,
} from "@/lib/directory.functions";

import {
  BotCard,
  BotCardSkeleton,
} from "@/components/BotCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SORT_OPTIONS } from "@/lib/directory";
import {
  track,
  usePageView,
} from "@/lib/analytics";

type BotSearch = z.infer<typeof searchSchema>;

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z
    .enum([
      "popular",
      "newest",
      "top_rated",
      "servers",
      "votes",
    ])
    .optional(),
  verified: z.boolean().optional(),
  premium: z.boolean().optional(),
  featured: z.boolean().optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute("/bots")({
  validateSearch: searchSchema,

  head: () => ({
    meta: [
      {
        title: "Explore Discord bots — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Search and filter every Discord bot in the BotGalaxy directory by category, rating and votes.",
      },
      {
        property: "og:title",
        content: "Explore Discord bots — BotGalaxy",
      },
      {
        property: "og:description",
        content:
          "Instant search across Discord bot categories.",
      },

    ],
  }),

  component: BotsRoute,
});

function BotsRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  if (pathname !== "/bots" && pathname !== "/bots/") {
    return <Outlet />;
  }

  return <Browse />;
}

function Browse() {
  const search = Route.useSearch();

  const navigate = useNavigate({
    from: "/bots",
  });

  const [term, setTerm] = useState(
    search.q ?? "",
  );

  usePageView("/bots");

  useEffect(() => {
    setTerm(search.q ?? "");
  }, [search.q]);

  useEffect(() => {
    const id = setTimeout(() => {
      if ((search.q ?? "") === term) {
        return;
      }

      navigate({
        search: (previous: BotSearch) => ({
          ...previous,
          q: term || undefined,
          page: undefined,
        }),
      });

      if (term.trim()) {
        track("search", {
          search_term: term.trim(),
        });
      }
    }, 350);

    return () => {
      clearTimeout(id);
    };
  }, [
    term,
    search.q,
    navigate,
  ]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 300_000,
  });

  const availability = useQuery({
    queryKey: ["directory-availability"],
    queryFn: () => getDirectoryAvailability(),
    staleTime: 300_000,
  });

  const counts = availability.data;

  const visibleSortOptions =
    SORT_OPTIONS.filter((option) => {
      if (option.value === "top_rated") {
        return (counts?.ratingCountAvailable ?? 0) > 0;
      }

      if (option.value === "servers") {
        return (counts?.serverCountAvailable ?? 0) > 0;
      }

      if (option.value === "votes") {
        return (counts?.voteCountAvailable ?? 0) > 0;
      }

      return true;
    });

  const visibleFlagFilters = (
    [
      ["verified", counts?.verifiedCount ?? 0],
      ["premium", counts?.premiumCount ?? 0],
      ["featured", counts?.featuredCount ?? 0],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([key]) => key);



  const page = search.page ?? 1;

  const params = {
    q: search.q ?? "",
    category: search.category ?? "",
    sort:
      search.sort ??
      ("popular" as const),
    verified: Boolean(search.verified),
    premium: Boolean(search.premium),
    featured: Boolean(search.featured),
    page,
    pageSize: 24,
  };

  const list = useQuery({
    queryKey: [
      "bots",
      params,
    ],

    queryFn: () =>
      listBots({
        data: params,
      }),

    placeholderData: keepPreviousData,
  });

  const toggle = (
    key:
      | "verified"
      | "premium"
      | "featured",
  ) => {
    navigate({
      search: (previous: BotSearch) => ({
        ...previous,
        [key]: previous[key]
          ? undefined
          : true,
        page: undefined,
      }),
    });
  };

  const totalPages = list.data
    ? Math.max(
        1,
        Math.ceil(
          list.data.total /
            list.data.pageSize,
        ),
      )
    : 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">
        Explore bots
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        {list.data
          ? `${list.data.total} bots match your filters`
          : "Loading directory…"}
      </p>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={term}
          onChange={(event) =>
            setTerm(event.target.value)
          }
          placeholder="Search by name, description, tag or category…"
          aria-label="Search bots"
          className="h-12 rounded-xl pl-9"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidersHorizontal
          className="h-4 w-4 text-muted-foreground"
          aria-hidden
        />

        {visibleSortOptions.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={
              (search.sort ?? "popular") ===
              option.value
                ? "default"
                : "secondary"
            }
            onClick={() =>
              navigate({
                search: (
                  previous: BotSearch,
                ) => ({
                  ...previous,
                  sort: option.value,
                  page: undefined,
                }),
              })
            }
          >
            {option.label}
          </Button>
        ))}

        {visibleFlagFilters.length > 0 && (
          <span className="mx-1 h-5 w-px bg-border" />
        )}

        {visibleFlagFilters.map((key) => (

          <Button
            key={key}
            size="sm"
            variant={
              search[key]
                ? "default"
                : "secondary"
            }
            onClick={() =>
              toggle(key)
            }
          >
            {key[0]!.toUpperCase() +
              key.slice(1)}
          </Button>
        ))}
      </div>

      <div className="scrollbar-thin mt-4 flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={
            !search.category
              ? "default"
              : "secondary"
          }
          onClick={() =>
            navigate({
              search: (
                previous: BotSearch,
              ) => ({
                ...previous,
                category: undefined,
                page: undefined,
              }),
            })
          }
        >
          All
        </Button>

        {(categories.data ?? []).map(
          (category) => (
            <Button
              key={category.id}
              size="sm"
              variant={
                search.category ===
                category.slug
                  ? "default"
                  : "secondary"
              }
              className="shrink-0"
              onClick={() =>
                navigate({
                  search: (
                    previous: BotSearch,
                  ) => ({
                    ...previous,
                    category:
                      category.slug,
                    page: undefined,
                  }),
                })
              }
            >
              {category.name}
            </Button>
          ),
        )}
      </div>

      {list.isError && (
        <p className="mt-10 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          We couldn't load the directory.
          Please try again.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.isPending
          ? Array.from({
              length: 8,
            }).map((_, index) => (
              <BotCardSkeleton
                key={index}
              />
            ))
          : (
              list.data?.items ?? []
            ).map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
              />
            ))}
      </div>

      {list.data &&
        list.data.items.length === 0 && (
          <div className="mt-16 text-center">
            <h2 className="font-display text-xl font-semibold">
              No bots found
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search term
              or clear your filters.
            </p>

            <Button
              asChild
              className="mt-4"
              variant="secondary"
            >
              <Link to="/bots">
                Reset filters
              </Link>
            </Button>
          </div>
        )}

      {list.data &&
        list.data.total >
          list.data.pageSize && (
          <nav
            className="mt-10 flex items-center justify-center gap-3"
            aria-label="Pagination"
          >
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() =>
                navigate({
                  search: (
                    previous: BotSearch,
                  ) => ({
                    ...previous,
                    page: page - 1,
                  }),
                })
              }
            >
              Previous
            </Button>

            <Badge variant="secondary">
              Page {page} of{" "}
              {totalPages}
            </Badge>

            <Button
              variant="secondary"
              disabled={
                !list.data.hasMore
              }
              onClick={() =>
                navigate({
                  search: (
                    previous: BotSearch,
                  ) => ({
                    ...previous,
                    page: page + 1,
                  }),
                })
              }
            >
              Next
            </Button>
          </nav>
        )}
    </div>
  );
}
