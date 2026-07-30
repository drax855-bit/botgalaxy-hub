import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { BadgeCheck, Crown, Server, ArrowBigUp, ExternalLink } from "lucide-react";
import { getBotBySlug } from "@/lib/directory.functions";
import { BotAvatar, StarRating } from "@/components/BotCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compactNumber } from "@/lib/directory";
import { track, usePageView } from "@/lib/analytics";

const botQuery = (slug: string) =>
  queryOptions({
    queryKey: ["bot", slug],
    queryFn: async () => {
      const bot = await getBotBySlug({ data: { slug } });
      if (!bot) throw notFound();
      return bot;
    },
  });

export const Route = createFileRoute("/bots/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(botQuery(params.slug)),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Bot not found — BotGalaxy" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.name} — Discord bot on BotGalaxy`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.short_description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.short_description },
      ],
    };
  },
  component: BotProfile,
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
});

function Missing() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Bot unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">This listing may have been removed or is pending review.</p>
      <Button asChild className="mt-6">
        <Link to="/bots">Back to directory</Link>
      </Button>
    </div>
  );
}

function BotProfile() {
  const { slug } = Route.useParams();
  const { data: bot } = useSuspenseQuery(botQuery(slug));
  usePageView(`/bots/${slug}`, bot.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <BotAvatar name={bot.name} src={bot.avatar_url} size="lg" />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-3xl font-bold">{bot.name}</h1>
            {bot.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verified" />}
            {bot.premium && <Crown className="h-5 w-5 shrink-0 text-accent" aria-label="Premium" />}
          </div>
          <p className="mt-2 text-muted-foreground">{bot.short_description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="h-4 w-4" /> {compactNumber(bot.server_count)} servers
            </span>
            <span className="flex items-center gap-1">
              <ArrowBigUp className="h-4 w-4" /> {compactNumber(bot.vote_count)} votes
            </span>
            <StarRating value={bot.rating} count={bot.rating_count} />
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg" onClick={() => track("invite_click", { bot_id: bot.id })}>
          <a href={bot.invite_url} target="_blank" rel="noreferrer noopener">
            Invite to server <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        {bot.website_url && (
          <Button asChild size="lg" variant="secondary">
            <a href={bot.website_url} target="_blank" rel="noreferrer noopener">
              Website
            </a>
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {bot.tags.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">About {bot.name}</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {bot.long_description ?? bot.short_description}
        </p>
      </section>
    </div>
  );
}
