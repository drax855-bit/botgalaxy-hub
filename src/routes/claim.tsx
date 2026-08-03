import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  cancelMyBotClaim,
  getClaimableBots,
  getMyBotClaims,
  submitBotClaim,
  type BotClaimStatus,
} from "@/lib/claim.functions";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClaimableBot = {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  short_description: string;
};

type MyClaim = {
  id: string;
  bot_id: string;
  requester_id: string;
  discord_user_id: string | null;
  proof: string;
  status: BotClaimStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  bots: {
    name: string;
    slug: string;
    avatar_url: string | null;
  } | null;
};

export const Route = createFileRoute("/claim")({
  head: () => ({
    meta: [
      {
        title: "Claim a bot listing — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Request ownership of an existing unowned Discord bot listing on BotGalaxy.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),

  component: ClaimPage,
});

function ClaimPage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const [bots, setBots] = useState<ClaimableBot[]>([]);
  const [claims, setClaims] = useState<MyClaim[]>([]);

  const [botId, setBotId] = useState("");
  const [discordUserId, setDiscordUserId] =
    useState("");
  const [proof, setProof] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [workingId, setWorkingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    void loadData();
  }, [user, sessionLoading]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [botRows, claimRows] = await Promise.all([
        getClaimableBots(),
        getMyBotClaims(),
      ]);

      setBots(botRows as ClaimableBot[]);
      setClaims(claimRows as MyClaim[]);

      if (!botId && botRows.length > 0) {
        setBotId(botRows[0]!.id);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load ownership claims.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      void navigate({
        to: "/auth",
      });

      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await submitBotClaim({
        data: {
          botId,
          discordUserId,
          proof,
        },
      });

      setDiscordUserId("");
      setProof("");
      setSuccess(
        "Your ownership claim was submitted for review.",
      );

      await loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not submit the ownership claim.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelClaim(claim: MyClaim) {
    if (
      !window.confirm(
        `Cancel your ownership claim for ${
          claim.bots?.name ?? "this bot"
        }?`,
      )
    ) {
      return;
    }

    setWorkingId(claim.id);
    setError("");
    setSuccess("");

    try {
      await cancelMyBotClaim({
        data: {
          id: claim.id,
        },
      });

      setSuccess("Your ownership claim was cancelled.");
      await loadData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not cancel the claim.",
      );
    } finally {
      setWorkingId("");
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-3xl font-bold">
          Sign in to claim a bot
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Ownership claims are linked to your BotGalaxy
          account and reviewed by the site owner.
        </p>

        <Button
          type="button"
          className="mt-6"
          onClick={() =>
            void navigate({
              to: "/auth",
            })
          }
        >
          Sign in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bot className="h-6 w-6" />
        </div>

        <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl">
          Claim a bot listing
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Use this form only when you own or officially manage
          the Discord bot. Explain how BotGalaxy staff can verify
          your ownership.
        </p>
      </header>

      {error && (
        <Notice type="error">{error}</Notice>
      )}

      {success && (
        <Notice type="success">{success}</Notice>
      )}

      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <form
            onSubmit={submit}
            className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-7"
          >
            <h2 className="text-xl font-bold">
              New ownership claim
            </h2>

            {bots.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <p className="font-medium">
                  No unowned listings are available
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Submit a new bot from your dashboard or{" "}
                  <Link
                    to="/contact"
                    className="text-primary hover:underline"
                  >
                    contact support
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <label
                    htmlFor="claim-bot"
                    className="text-sm font-medium"
                  >
                    Bot listing
                  </label>

                  <select
                    id="claim-bot"
                    value={botId}
                    onChange={(event) =>
                      setBotId(event.target.value)
                    }
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    {bots.map((bot) => (
                      <option
                        key={bot.id}
                        value={bot.id}
                      >
                        {bot.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="claim-discord-id"
                    className="text-sm font-medium"
                  >
                    Discord user ID{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>

                  <Input
                    id="claim-discord-id"
                    value={discordUserId}
                    onChange={(event) =>
                      setDiscordUserId(
                        event.target.value,
                      )
                    }
                    placeholder="Your numeric Discord user ID"
                    maxLength={40}
                    className="mt-2"
                  />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="claim-proof"
                      className="text-sm font-medium"
                    >
                      Ownership evidence
                    </label>

                    <span className="text-xs text-muted-foreground">
                      {proof.length}/2000
                    </span>
                  </div>

                  <textarea
                    id="claim-proof"
                    value={proof}
                    onChange={(event) =>
                      setProof(event.target.value)
                    }
                    placeholder="Explain your role and how staff can verify it. You can mention the official bot website, support server, developer account or another safe proof method. Do not share tokens or passwords."
                    minLength={20}
                    maxLength={2000}
                    required
                    className="mt-2 min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-6"
                  disabled={
                    submitting ||
                    !botId ||
                    proof.trim().length < 20
                  }
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Submit ownership claim
                </Button>
              </>
            )}
          </form>

          <section className="mt-10">
            <h2 className="text-2xl font-bold">
              Your claim history
            </h2>

            {claims.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border py-12 text-center">
                <Clock3 className="mx-auto h-8 w-8 text-muted-foreground" />

                <p className="mt-3 font-medium">
                  No ownership claims yet
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {claims.map((claim) => (
                  <article
                    key={claim.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {claim.bots?.name ??
                              "Unavailable bot"}
                          </h3>

                          <ClaimStatusBadge
                            status={claim.status}
                          />
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                          Submitted{" "}
                          {new Date(
                            claim.created_at,
                          ).toLocaleString()}
                        </p>

                        <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
                          {claim.proof}
                        </p>

                        {claim.review_note && (
                          <div className="mt-4 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Staff note:
                            </span>{" "}
                            {claim.review_note}
                          </div>
                        )}
                      </div>

                      {claim.status === "open" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={workingId === claim.id}
                          onClick={() =>
                            void cancelClaim(claim)
                          }
                        >
                          {workingId === claim.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}

                          Cancel
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function ClaimStatusBadge({
  status,
}: {
  status: BotClaimStatus;
}) {
  const style =
    status === "open"
      ? "bg-amber-500/10 text-amber-500"
      : status === "approved"
        ? "bg-emerald-500/10 text-emerald-500"
        : status === "rejected"
          ? "bg-destructive/10 text-destructive"
          : "bg-secondary text-muted-foreground";

  const icon =
    status === "approved" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {icon}
      {status}
    </span>
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
      className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
        type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {children}
    </div>
  );
}
