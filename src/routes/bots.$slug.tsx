import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowBigUp,
  BadgeCheck,
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  Server,
} from "lucide-react";

import { getBotBySlug } from "@/lib/directory.functions";
import {
  getVoteState,
  voteForBot,
} from "@/lib/account.functions";
import {
  BotAvatar,
  StarRating,
} from "@/components/BotCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compactNumber } from "@/lib/directory";
import {
  track,
  usePageView,
} from "@/lib/analytics";
import { useSession } from "@/hooks/useSession";

const botQuery = (slug: string) =>
  queryOptions({
    queryKey: ["bot", slug],

    queryFn: async () => {
      const result = await getBotBySlug({
        data: {
          slug,
        },
      });

      if (!result?.bot) {
        throw notFound();
      }

      return result;
    },
  });

export const Route = createFileRoute(
  "/bots/$slug",
)({
  loader: ({
    context,
    params,
  }) =>
    context.queryClient.ensureQueryData(
      botQuery(params.slug),
    ),

  head: ({ loaderData }) => {
    if (!loaderData?.bot) {
      return {
        meta: [
          {
            title:
              "Bot not found — BotGalaxy",
          },
          {
            name: "robots",
            content: "noindex",
          },
        ],
      };
    }

    const bot = loaderData.bot;

    const title = `${bot.name} — Discord bot on BotGalaxy`;

    return {
      meta: [
        {
          title,
        },
        {
          name: "description",
          content: bot.short_description,
        },
        {
          property: "og:title",
          content: title,
        },
        {
          property: "og:description",
          content: bot.short_description,
        },
      ],
    };
  },

  component: BotProfile,
  errorComponent: Missing,
  notFoundComponent: Missing,
});

function Missing() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">
        Bot unavailable
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        This listing may have been removed or is
        pending review.
      </p>

      <Button
        asChild
        className="mt-6"
      >
        <Link to="/bots">
          Back to directory
        </Link>
      </Button>
    </div>
  );
}

function BotProfile() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    user,
    loading: sessionLoading,
  } = useSession();

  const { data } = useSuspenseQuery(
    botQuery(slug),
  );

  const bot = data.bot;

  usePageView(
    `/bots/${slug}`,
    bot.id,
  );

  const voteState = useQuery({
    queryKey: [
      "vote-state",
      bot.id,
      user?.id,
    ],

    queryFn: () =>
      getVoteState({
        data: {
          botId: bot.id,
        },
      }),

    enabled: Boolean(user),
    retry: false,
    staleTime: 30_000,
  });

  const voteMutation = useMutation({
    mutationFn: () =>
      voteForBot({
        data: {
          botId: bot.id,
        },
      }),

    onSuccess: async (result) => {
      if (
        !result.ok &&
        result.reason ===
          "already_voted"
      ) {
        await queryClient.invalidateQueries({
          queryKey: [
            "vote-state",
            bot.id,
          ],
        });

        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "bot",
            slug,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "vote-state",
            bot.id,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: ["bots"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["home-feed"],
        }),
      ]);
    },
  });

  const alreadyVoted =
    voteState.data?.voted ||
    (voteMutation.data?.ok === false &&
      voteMutation.data.reason ===
        "already_voted");

  function handleVote() {
    if (!user) {
      void navigate({
        to: "/auth",
      });

      return;
    }

    if (
      alreadyVoted ||
      voteMutation.isPending
    ) {
      return;
    }

    voteMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <BotAvatar
          name={bot.name}
          src={bot.avatar_url}
          size="lg"
        />

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-3xl font-bold">
              {bot.name}
            </h1>

            {bot.verified && (
              <BadgeCheck
                className="h-5 w-5 shrink-0 text-primary"
                aria-label="Verified"
              />
            )}

            {bot.premium && (
              <Crown
                className="h-5 w-5 shrink-0 text-accent"
                aria-label="Premium"
              />
            )}
          </div>

          <p className="mt-2 text-muted-foreground">
            {bot.short_description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="h-4 w-4" />

              {compactNumber(
                bot.server_count,
              )}{" "}
              servers
            </span>

            <span className="flex items-center gap-1">
              <ArrowBigUp className="h-4 w-4" />

              {compactNumber(
                bot.vote_count,
              )}{" "}
              votes
            </span>

            <StarRating
              value={bot.rating}
              count={bot.rating_count}
            />
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        {bot.invite_url ? (
          <Button
            asChild
            size="lg"
          >
            <a
              href={bot.invite_url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() =>
                track(
                  "invite_click",
                  {
                    bot_id: bot.id,
                  },
                )
              }
            >
              Invite to server

              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button
            size="lg"
            disabled
          >
            Invite unavailable
          </Button>
        )}

        <Button
          type="button"
          size="lg"
          variant={
            alreadyVoted
              ? "secondary"
              : "default"
          }
          disabled={
            sessionLoading ||
            voteMutation.isPending ||
            Boolean(
              user &&
                voteState.isPending,
            ) ||
            alreadyVoted
          }
          onClick={handleVote}
        >
          {voteMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Voting...
            </>
          ) : alreadyVoted ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Voted this month
            </>
          ) : user &&
            voteState.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking vote...
            </>
          ) : (
            <>
              <ArrowBigUp className="h-4 w-4" />
              Vote for {bot.name}
            </>
          )}
        </Button>

        {bot.website_url && (
          <Button
            asChild
            size="lg"
            variant="secondary"
          >
            <a
              href={bot.website_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Website
            </a>
          </Button>
        )}

        {bot.support_url && (
          <Button
            asChild
            size="lg"
            variant="secondary"
          >
            <a
              href={bot.support_url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Support server
            </a>
          </Button>
        )}
      </div>

      {voteMutation.isSuccess &&
        voteMutation.data.ok && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Your vote was added successfully.
          </div>
        )}

      {voteMutation.isSuccess &&
        !voteMutation.data.ok &&
        voteMutation.data.reason ===
          "already_voted" && (
          <div className="mt-4 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
            You already voted for this bot
            during the current month.
          </div>
        )}

      {voteMutation.isError && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not add your vote. Please
          try again.
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {bot.tags.map(
          (tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
            >
              {tag}
            </Badge>
          ),
        )}
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-bold">
          About {bot.name}
        </h2>

        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {bot.long_description ??
            bot.short_description}
        </p>
      </section>
    </div>
  );
}
