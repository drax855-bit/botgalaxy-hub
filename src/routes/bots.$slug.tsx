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
  Flag,
  Loader2,
  MessageSquare,
  Server,
  Star,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  getBotBySlug,
} from "@/lib/directory.functions";
import {
  deleteMyReview,
  getVoteState,
  submitReport,
  upsertReview,
  voteForBot,
} from "@/lib/account.functions";
import {
  BotAvatar,
  BotCard,
  StarRating,
} from "@/components/BotCard";
import { OfficialOwnerBadge } from "@/components/OfficialOwnerBadge";
import {
  Button,
} from "@/components/ui/button";
import {
  Badge,
} from "@/components/ui/badge";
import {
  compactNumber,
  timeAgo,
} from "@/lib/directory";
import {
  track,
  usePageView,
} from "@/lib/analytics";
import {
  useSession,
} from "@/hooks/useSession";

const REPORT_REASONS = [
  "Incorrect information",
  "Broken invite",
  "Scam or unsafe",
  "Impersonation",
  "Other",
] as const;

const botQuery = (
  slug: string,
) =>
  queryOptions({
    queryKey: [
      "bot",
      slug,
    ],

    queryFn: async () => {
      const result =
        await getBotBySlug({
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

export const Route =
  createFileRoute(
    "/bots/$slug",
  )({
    loader: ({
      context,
      params,
    }) =>
      context.queryClient
        .ensureQueryData(
          botQuery(
            params.slug,
          ),
        ),

    head: ({
      loaderData,
    }) => {
      if (
        !loaderData?.bot
      ) {
        return {
          meta: [
            {
              title:
                "Bot not found — BotGalaxy",
            },
            {
              name: "robots",
              content:
                "noindex",
            },
          ],
        };
      }

      const bot =
        loaderData.bot;

      const SEO_OVERRIDES: Record<
        string,
        { title: string; description: string }
      > = {
        "carl-bot": {
          title:
            "Carl-bot Discord Bot — Moderation, Reaction Roles & More | BotGalaxy",
          description:
            "Explore Carl-bot for Discord: reaction roles, moderation, automod, logging, embeds and custom commands. View the independent BotGalaxy listing.",
        },
        dyno: {
          title:
            "Dyno Discord Bot — Moderation, Automod & Dashboard | BotGalaxy",
          description:
            "Explore Dyno for Discord: moderation, automod, logs, roles, welcome messages and dashboard controls. View the independent BotGalaxy listing.",
        },
        yagpdb: {
          title:
            "YAGPDB Discord Bot — Automod, Roles & Custom Commands | BotGalaxy",
          description:
            "Explore YAGPDB for Discord: automod, moderation, role menus, self-assignable roles, custom commands and feeds. View the independent BotGalaxy listing.",
        },
        "dank-memer": {
          title:
            "Dank Memer Discord Bot — Economy, Pets & Trading | BotGalaxy",
          description:
            "Explore Dank Memer for Discord: economy gameplay, currency, items, pets, collecting, progression and trading. View the independent BotGalaxy listing.",
        },
      };

      const override =
        SEO_OVERRIDES[
          bot.slug
        ];

      const title =
        override?.title ??
        `${bot.name} — Discord bot on BotGalaxy`;

      const description =
        override?.description ??
        bot.short_description;

      return {
        meta: [
          {
            title,
          },
          {
            name:
              "description",
            content:
              description,
          },
          {
            property:
              "og:title",
            content: title,
          },
          {
            property:
              "og:description",
            content:
              description,
          },
        ],
      };
    },

    component:
      BotProfile,

    errorComponent:
      Missing,

    notFoundComponent:
      Missing,
  });

function Missing() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">
        Bot unavailable
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        This listing may
        have been removed or
        is pending review.
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
  const {
    slug,
  } = Route.useParams();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const {
    user,
    loading:
      sessionLoading,
  } = useSession();

  const {
    data,
  } = useSuspenseQuery(
    botQuery(slug),
  );

  const bot =
    data.bot;

  const reviews =
    data.reviews ?? [];

  const similar =
    data.similar ?? [];

  const ownReview =
    user
      ? reviews.find(
          (review) =>
            review.user_id ===
            user.id,
        )
      : undefined;

  const isTicketTool =
    bot.slug ===
    "ticket-tool";

  const [
    reviewRating,
    setReviewRating,
  ] = useState(0);

  const [
    reviewBody,
    setReviewBody,
  ] = useState("");

  const [
    reviewMessage,
    setReviewMessage,
  ] = useState("");

  const [
    reviewError,
    setReviewError,
  ] = useState("");

  const [
    showReport,
    setShowReport,
  ] = useState(false);

  const [
    reportReason,
    setReportReason,
  ] = useState<
    (typeof REPORT_REASONS)[number]
  >(
    "Incorrect information",
  );

  const [
    reportDetails,
    setReportDetails,
  ] = useState("");

  const [
    reportMessage,
    setReportMessage,
  ] = useState("");

  const [
    reportError,
    setReportError,
  ] = useState("");

  usePageView(
    `/bots/${slug}`,
    bot.id,
  );

  useEffect(() => {
    if (ownReview) {
      setReviewRating(
        ownReview.rating,
      );

      setReviewBody(
        ownReview.body ??
          "",
      );
    } else {
      setReviewRating(0);
      setReviewBody("");
    }
  }, [
    ownReview?.id,
    ownReview?.rating,
    ownReview?.body,
  ]);

  const voteState =
    useQuery({
      queryKey: [
        "vote-state",
        bot.id,
        user?.id,
      ],

      queryFn: () =>
        getVoteState({
          data: {
            botId:
              bot.id,
          },
        }),

      enabled:
        Boolean(user),

      retry: false,
      staleTime: 30_000,
    });

  const voteMutation =
    useMutation({
      mutationFn: () =>
        voteForBot({
          data: {
            botId:
              bot.id,
          },
        }),

      onSuccess:
        async () => {
          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "bot",
                  slug,
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "vote-state",
                  bot.id,
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "bots",
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "home-feed",
                ],
              }),
          ]);
        },
    });

  const reviewMutation =
    useMutation({
      mutationFn: () =>
        upsertReview({
          data: {
            botId:
              bot.id,

            rating:
              reviewRating,

            body:
              reviewBody
                .trim(),
          },
        }),

      onSuccess:
        async () => {
          setReviewMessage(
            ownReview
              ? "Your review was updated."
              : "Your review was submitted.",
          );

          setReviewError("");

          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "bot",
                  slug,
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "bots",
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "home-feed",
                ],
              }),
          ]);
        },

      onError: () => {
        setReviewMessage("");

        setReviewError(
          "Could not save your review. Please try again.",
        );
      },
    });

  const deleteReviewMutation =
    useMutation({
      mutationFn: () =>
        deleteMyReview({
          data: {
            botId:
              bot.id,
          },
        }),

      onSuccess:
        async () => {
          setReviewRating(0);
          setReviewBody("");

          setReviewMessage(
            "Your review was deleted.",
          );

          setReviewError("");

          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "bot",
                  slug,
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "bots",
                ],
              }),

            queryClient
              .invalidateQueries({
                queryKey: [
                  "home-feed",
                ],
              }),
          ]);
        },

      onError: () => {
        setReviewMessage("");

        setReviewError(
          "Could not delete your review.",
        );
      },
    });

  const reportMutation =
    useMutation({
      mutationFn: () =>
        submitReport({
          data: {
            targetType:
              "bot",

            targetId:
              bot.id,

            reason:
              reportReason,

            details:
              reportDetails
                .trim(),
          },
        }),

      onSuccess: () => {
        setReportMessage(
          "Report submitted. BotGalaxy staff will review it.",
        );

        setReportError("");
        setReportDetails("");
        setShowReport(false);
      },

      onError: () => {
        setReportMessage("");

        setReportError(
          "Could not submit your report. Please try again.",
        );
      },
    });

  const alreadyVoted =
    voteState.data
      ?.voted ||
    (
      voteMutation.data
        ?.ok === false &&
      voteMutation.data
        .reason ===
        "already_voted"
    );

  function handleVote() {
    if (!user) {
      void navigate({
        to: "/auth",
      });

      return;
    }

    if (
      alreadyVoted ||
      voteMutation
        .isPending
    ) {
      return;
    }

    voteMutation.mutate();
  }

  function handleReviewSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setReviewMessage("");
    setReviewError("");

    if (!user) {
      void navigate({
        to: "/auth",
      });

      return;
    }

    if (
      reviewRating <
        1 ||
      reviewRating >
        5
    ) {
      setReviewError(
        "Select a rating between 1 and 5 stars.",
      );

      return;
    }

    if (
      reviewBody.length >
      1500
    ) {
      setReviewError(
        "Review text must be 1500 characters or fewer.",
      );

      return;
    }

    reviewMutation.mutate();
  }

  function handleDeleteReview() {
    const confirmed =
      window.confirm(
        "Delete your review?",
      );

    if (!confirmed) {
      return;
    }

    deleteReviewMutation
      .mutate();
  }

  function openReport() {
    setReportMessage("");
    setReportError("");

    if (!user) {
      void navigate({
        to: "/auth",
      });

      return;
    }

    setShowReport(
      (current) =>
        !current,
    );
  }

  function handleReportSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setReportMessage("");
    setReportError("");

    if (!user) {
      void navigate({
        to: "/auth",
      });

      return;
    }

    if (
      reportDetails.length >
      1000
    ) {
      setReportError(
        "Report details must be 1000 characters or fewer.",
      );

      return;
    }

    reportMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
        <BotAvatar
          name={bot.name}
          src={
            bot.avatar_url
          }
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
                aria-label="Verified bot"
              />
            )}

            {bot.premium && (
              <Crown
                className="h-5 w-5 shrink-0 text-accent"
                aria-label="Premium bot"
              />
            )}
          </div>

          <p className="mt-2 text-muted-foreground">
            {
              bot.short_description
            }
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
              value={
                bot.rating
              }
              count={
                bot.rating_count
              }
            />
          </div>

          {bot.categories
            .length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {bot.categories.map(
                (
                  category,
                ) => (
                  <Link
                    key={
                      category.slug
                    }
                    to="/bots"
                    search={{
                      category:
                        category.slug,
                    }}
                  >
                    <Badge
                      variant="outline"
                      className="cursor-pointer transition hover:bg-secondary"
                    >
                      {
                        category.name
                      }
                    </Badge>
                  </Link>
                ),
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
      {isTicketTool ? (
        bot.website_url ? (
          <Button
            asChild
            size="lg"
          >
            <a
              href={
                bot.website_url
              }
              target="_blank"
              rel="noreferrer noopener"
            >
              Invite from Website

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
        )
      ) : bot.invite_url ? (
        <Button
          asChild
          size="lg"
        >
          <a
            href={
              bot.invite_url
            }
            target="_blank"
            rel="noreferrer noopener"
            onClick={() =>
              track(
                "invite_click",
                {
                  bot_id:
                    bot.id,
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
            voteMutation
              .isPending ||
            Boolean(
              user &&
                voteState
                  .isPending,
            ) ||
            Boolean(
              alreadyVoted,
            )
          }
          onClick={
            handleVote
          }
        >
          {voteMutation
            .isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Voting...
            </>
          ) : alreadyVoted ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Voted recently
            </>
          ) : user &&
            voteState
              .isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <ArrowBigUp className="h-4 w-4" />
              Vote for{" "}
              {bot.name}
            </>
          )}
        </Button>

        {bot.website_url &&
          !isTicketTool && (
          <Button
            asChild
            size="lg"
            variant="secondary"
          >
            <a
              href={
                bot.website_url
              }
              target="_blank"
              rel="noreferrer noopener"
            >
              Website

              <ExternalLink className="h-4 w-4" />
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
              href={
                bot.support_url
              }
              target="_blank"
              rel="noreferrer noopener"
            >
              Support server

              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}

        <Button
          type="button"
          size="lg"
          variant="ghost"
          onClick={
            openReport
          }
        >
          <Flag className="h-4 w-4" />
          Report listing
        </Button>
      </div>

      {voteMutation
        .isSuccess &&
        voteMutation.data
          .ok && (
          <Notice type="success">
            Your vote was
            added successfully.
          </Notice>
        )}

      {voteMutation
        .isSuccess &&
        !voteMutation.data
          .ok &&
        voteMutation.data
          .reason ===
          "already_voted" && (
          <Notice type="neutral">
            You already voted
            during the current
            voting period.
          </Notice>
        )}

      {voteMutation
        .isError && (
        <Notice type="error">
          Could not add
          your vote. Please
          try again.
        </Notice>
      )}

      {reportMessage && (
        <Notice type="success">
          {reportMessage}
        </Notice>
      )}

      {reportError && (
        <Notice type="error">
          {reportError}
        </Notice>
      )}

      {showReport && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />

            <h2 className="font-semibold">
              Report{" "}
              {bot.name}
            </h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Reports are visible
            only to BotGalaxy
            staff.
          </p>

          <form
            onSubmit={
              handleReportSubmit
            }
            className="mt-5 space-y-4"
          >
            <div>
              <label
                htmlFor="report-reason"
                className="text-sm font-medium"
              >
                Reason
              </label>

              <select
                id="report-reason"
                value={
                  reportReason
                }
                onChange={(
                  event,
                ) =>
                  setReportReason(
                    event
                      .target
                      .value as
                      (typeof REPORT_REASONS)[number],
                  )
                }
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {REPORT_REASONS.map(
                  (
                    reason,
                  ) => (
                    <option
                      key={
                        reason
                      }
                      value={
                        reason
                      }
                    >
                      {
                        reason
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="report-details"
                  className="text-sm font-medium"
                >
                  Details
                </label>

                <span className="text-xs text-muted-foreground">
                  {
                    reportDetails.length
                  }
                  /1000
                </span>
              </div>

              <textarea
                id="report-details"
                value={
                  reportDetails
                }
                onChange={(
                  event,
                ) =>
                  setReportDetails(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Explain what is wrong with this listing."
                maxLength={1000}
                className="mt-2 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={
                  reportMutation
                    .isPending
                }
              >
                {reportMutation
                  .isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Submit report
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setShowReport(
                    false,
                  )
                }
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {bot.tags.map(
          (
            tag: string,
          ) => (
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
          About{" "}
          {bot.name}
        </h2>

        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {bot.long_description ??
            bot.short_description}
        </p>

        <div className="mt-6 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">
              Owner
            </span>

            <p className="mt-1 flex flex-wrap items-center gap-2 font-medium">
              {
                bot.owner_name
              }

              {bot.owner_is_official && (
                <OfficialOwnerBadge />
              )}
            </p>
          </div>

          <div>
            <span className="text-muted-foreground">
              Prefix
            </span>

            <p className="mt-1 font-medium">
              {bot.prefix ??
                "/"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />

              <h2 className="font-display text-2xl font-bold">
                Reviews
              </h2>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <StarRating
                value={
                  bot.rating
                }
                count={
                  bot.rating_count
                }
              />

              <span className="text-sm text-muted-foreground">
                {
                  reviews.length
                }{" "}
                {reviews.length ===
                1
                  ? "review"
                  : "reviews"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          {user ? (
            <form
              onSubmit={
                handleReviewSubmit
              }
            >
              <h3 className="font-semibold">
                {ownReview
                  ? "Update your review"
                  : `Review ${bot.name}`}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Select a star
                rating and optionally
                write a review.
              </p>

              <div
                className="mt-4 flex gap-1"
                role="radiogroup"
                aria-label="Review rating"
              >
                {[
                  1,
                  2,
                  3,
                  4,
                  5,
                ].map(
                  (
                    value,
                  ) => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      role="radio"
                      aria-checked={
                        reviewRating ===
                        value
                      }
                      aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      onClick={() =>
                        setReviewRating(
                          value,
                        )
                      }
                      className="rounded-lg p-1.5 transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <Star
                        className={
                          reviewRating >=
                          value
                            ? "h-7 w-7 fill-accent text-accent"
                            : "h-7 w-7 text-muted-foreground"
                        }
                      />
                    </button>
                  ),
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="review-body"
                    className="text-sm font-medium"
                  >
                    Review
                    text
                  </label>

                  <span className="text-xs text-muted-foreground">
                    {
                      reviewBody.length
                    }
                    /1500
                  </span>
                </div>

                <textarea
                  id="review-body"
                  value={
                    reviewBody
                  }
                  onChange={(
                    event,
                  ) =>
                    setReviewBody(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="What do you think about this bot?"
                  maxLength={1500}
                  className="mt-2 min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {reviewMessage && (
                <Notice type="success">
                  {
                    reviewMessage
                  }
                </Notice>
              )}

              {reviewError && (
                <Notice type="error">
                  {
                    reviewError
                  }
                </Notice>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  type="submit"
                  disabled={
                    reviewMutation
                      .isPending ||
                    reviewRating ===
                      0
                  }
                >
                  {reviewMutation
                    .isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {ownReview
                    ? "Update review"
                    : "Submit review"}
                </Button>

                {ownReview && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      deleteReviewMutation
                        .isPending
                    }
                    onClick={
                      handleDeleteReview
                    }
                  >
                    {deleteReviewMutation
                      .isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    Delete review
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <div className="text-center">
              <h3 className="font-semibold">
                Share your experience
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to rate
                and review this bot.
              </p>

              <Button
                asChild
                className="mt-4"
              >
                <Link to="/auth">
                  Sign in to review
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {reviews.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />

              <h3 className="mt-3 font-semibold">
                No reviews yet
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Be the first
                person to review{" "}
                {bot.name}.
              </p>
            </div>
          ) : (
            reviews.map(
              (
                review,
              ) => {
                const username =
                  review
                    .profiles
                    ?.username ??
                  "BotGalaxy user";

                const avatar =
                  review
                    .profiles
                    ?.avatar_url ??
                  null;

                return (
                  <article
                    key={
                      review.id
                    }
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start gap-3">
                      <ProfileAvatar
                        username={
                          username
                        }
                        avatarUrl={
                          avatar
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-medium">
                              {
                                username
                              }
                            </h3>

                            <p className="text-xs text-muted-foreground">
                              {timeAgo(
                                review.created_at,
                              )}
                            </p>
                          </div>

                          <ReviewStars
                            rating={
                              review.rating
                            }
                          />
                        </div>

                        {review.body && (
                          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                            {
                              review.body
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              },
            )
          )}
        </div>
      </section>

      {similar.length >
        0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">
            Similar bots
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            More bots you
            may find useful.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map(
              (
                similarBot,
              ) => (
                <BotCard
                  key={
                    similarBot.id
                  }
                  bot={
                    similarBot
                  }
                />
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewStars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div
      className="flex gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[
        1,
        2,
        3,
        4,
        5,
      ].map(
        (
          value,
        ) => (
          <Star
            key={
              value
            }
            className={
              value <=
              rating
                ? "h-4 w-4 fill-accent text-accent"
                : "h-4 w-4 text-muted-foreground"
            }
          />
        ),
      )}
    </div>
  );
}

function ProfileAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl:
    | string
    | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={
          avatarUrl
        }
        alt={`${username} profile`}
        loading="lazy"
        className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-bold text-primary">
      {username
        .slice(
          0,
          2,
        )
        .toUpperCase()}
    </div>
  );
}

function Notice({
  type,
  children,
}: {
  type:
    | "success"
    | "error"
    | "neutral";

  children:
    React.ReactNode;
}) {
  const style =
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : type ===
          "error"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-secondary text-muted-foreground";

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${style}`}
    >
      {children}
    </div>
  );
}
