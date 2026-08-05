import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Flame, Star, Clock, BadgeCheck } from "lucide-react";
import { getHomeFeed } from "@/lib/directory.functions";
import { BotCard } from "@/components/BotCard";
import { Button } from "@/components/ui/button";
import { compactNumber } from "@/lib/directory";
import { usePageView } from "@/lib/analytics";

const homeQuery = queryOptions({
  queryKey: ["home-feed"],
  queryFn: () => getHomeFeed(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BotGalaxy — Discover the best Discord bots" },
      {
        name: "description",
        content:
          "Discover Discord bots across moderation, music, AI, economy and more. Explore independent listings, vote, review and invite in one click.",
      },
      { property: "og:title", content: "BotGalaxy — Discover the best Discord bots" },
      {
        property: "og:description",
        content: "An independent Discord bot directory with instant search, votes, reviews and ownership claims.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
});

function Row({
  title,
  icon,
  bots,
  to,
}: {
  title: string;
  icon: React.ReactNode;
  bots: React.ComponentProps<typeof BotCard>["bot"][];
  to: Record<string, unknown>;
}) {
  if (!bots.length) return null;
  return (
    <section className="mt-14">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-xl font-bold sm:text-2xl">
          <span className="text-primary">{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/bots" search={to as never}>
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bots.map((b) => (
          <BotCard key={b.id} bot={b} />
        ))}
      </div>
    </section>
  );
}

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  usePageView("/");

  return (
    <div>
      <section className="nebula starfield border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {compactNumber(data.totalBots)} bots · {data.categories.length} categories
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold sm:text-6xl">
            Find the <span className="brand-gradient-text">perfect Discord bot</span> for your server
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Moderation, music, AI, economy and everything in between — independent listings organized with community votes and reviews.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/bots">Explore the directory</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/dashboard/submit">Add your bot</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-6">
        <Row title="Featured" icon={<Sparkles className="h-5 w-5" />} bots={data.featured} to={{ featured: true }} />
        <Row title="Trending now" icon={<Flame className="h-5 w-5" />} bots={data.trending} to={{ sort: "votes" }} />
        <Row title="Top rated" icon={<Star className="h-5 w-5" />} bots={data.topRated} to={{ sort: "top_rated" }} />
        <Row title="Recently added" icon={<Clock className="h-5 w-5" />} bots={data.recent} to={{ sort: "newest" }} />
        <Row title="Verified bots" icon={<BadgeCheck className="h-5 w-5" />} bots={data.verified} to={{ verified: true }} />

        <section className="mt-16">
          <h2 className="font-display text-xl font-bold sm:text-2xl">Browse by category</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.categories.map((c) => (
              <Link
                key={c.id}
                to="/bots"
                search={{ category: c.slug }}
                className="card-glow rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="font-medium">{c.name}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.description}</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
