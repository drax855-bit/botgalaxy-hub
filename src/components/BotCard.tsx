import { Link } from "@tanstack/react-router";
import { BadgeCheck, Crown, Server, Star, ArrowBigUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { compactNumber, initialsOf, type BotSummary } from "@/lib/directory";

export function BotAvatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "md" | "lg";
}) {
  const dims = size === "lg" ? "h-20 w-20 text-2xl rounded-2xl" : "h-12 w-12 text-sm rounded-xl";
  if (src) {
    return (
      <img
        src={src}
        alt={`${name} logo`}
        loading="lazy"
        className={cn(dims, "shrink-0 border border-border object-cover")}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        dims,
        "grid shrink-0 place-items-center border border-border bg-secondary font-display font-bold text-primary",
      )}
    >
      {initialsOf(name)}
    </div>
  );
}

export function StarRating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
      <span className="font-medium text-foreground">{Number(value).toFixed(1)}</span>
      {count !== undefined && <span>({count})</span>}
    </span>
  );
}

export function BotCard({ bot }: { bot: BotSummary }) {
  return (
    <Link
      to="/bots/$slug"
      params={{ slug: bot.slug }}
      className="card-glow group flex h-full flex-col rounded-2xl border border-border bg-card p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <BotAvatar name={bot.name} src={bot.avatar_url} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate font-display text-base font-semibold">{bot.name}</h3>
            {bot.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified" />}
            {bot.premium && <Crown className="h-4 w-4 shrink-0 text-accent" aria-label="Premium" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="h-3.5 w-3.5" aria-hidden />
              {compactNumber(bot.server_count)}
            </span>
            <span className="flex items-center gap-1">
              <ArrowBigUp className="h-3.5 w-3.5" aria-hidden />
              {compactNumber(bot.vote_count)}
            </span>
            <StarRating value={bot.rating} count={bot.rating_count} />
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{bot.short_description}</p>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
        {bot.featured && (
          <Badge className="gap-1 border-transparent bg-accent text-accent-foreground">
            <Sparkles className="h-3 w-3" aria-hidden /> Featured
          </Badge>
        )}
        {bot.tags.slice(0, 3).map((t) => (
          <Badge key={t} variant="secondary" className="font-normal">
            {t}
          </Badge>
        ))}
      </div>
    </Link>
  );
}

export function BotCardSkeleton() {
  return (
    <div className="h-[188px] animate-pulse rounded-2xl border border-border bg-card/60" aria-hidden />
  );
}
