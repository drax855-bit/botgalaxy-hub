import {
  useEffect,
  useState,
} from "react";
import {
  Bot,
  Check,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import {
  adminBotClaimAction,
  getAdminBotClaims,
  type BotClaimStatus,
} from "@/lib/claim.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClaimFilter = BotClaimStatus | "all";

type AdminClaim = {
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
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
};

const FILTERS: Array<{
  value: ClaimFilter;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

export function AdminClaimConsole() {
  const [claims, setClaims] =
    useState<AdminClaim[]>([]);

  const [status, setStatus] =
    useState<ClaimFilter>("open");

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadClaims();
  }, [status, activeSearch]);

  async function loadClaims() {
    setLoading(true);
    setError("");

    try {
      const rows =
        (await getAdminBotClaims({
          data: {
            status,
            q: activeSearch,
          },
        })) as AdminClaim[];

      setClaims(rows);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load bot ownership claims.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function reviewClaim(
    claim: AdminClaim,
    action: "approve" | "reject",
  ) {
    const defaultNote =
      action === "approve"
        ? "Ownership verified by BotGalaxy staff."
        : "The provided ownership evidence could not be verified.";

    const note = window.prompt(
      action === "approve"
        ? `Approve ${
            claim.profiles?.username ?? "this user"
          } as the owner of ${
            claim.bots?.name ?? "this bot"
          }? Add an optional staff note:`
        : `Reject the ownership claim for ${
            claim.bots?.name ?? "this bot"
          }? Add a reason:`,
      defaultNote,
    );

    if (note === null) {
      return;
    }

    setWorkingId(claim.id);
    setError("");
    setSuccess("");

    try {
      await adminBotClaimAction({
        data: {
          id: claim.id,
          action,
          note: note.trim(),
        },
      });

      setSuccess(
        action === "approve"
          ? "Ownership claim approved. The bot is now connected to the user dashboard."
          : "Ownership claim rejected.",
      );

      await loadClaims();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The ownership claim could not be reviewed.",
      );
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Bot className="h-5 w-5" />

            <span className="text-sm font-medium">
              Owner verification
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Bot ownership claims
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Verify requests before connecting existing bot
            listings to user dashboards.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={loadClaims}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={
              status === option.value
                ? "default"
                : "secondary"
            }
            onClick={() => setStatus(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setActiveSearch(search.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search bot, username, proof or Discord ID"
            maxLength={100}
            className="pl-10"
          />
        </div>

        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error && (
        <Notice type="error">{error}</Notice>
      )}

      {success && (
        <Notice type="success">{success}</Notice>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : claims.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border py-12 text-center">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground" />

          <p className="mt-3 font-medium">
            No ownership claims found
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {claims.map((claim) => {
            const working = workingId === claim.id;

            return (
              <article
                key={claim.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ClaimStatusBadge
                        status={claim.status}
                      />

                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          claim.created_at,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <Avatar
                        name={
                          claim.bots?.name ??
                          "Bot"
                        }
                        src={
                          claim.bots?.avatar_url ??
                          null
                        }
                        square
                      />

                      <div className="min-w-0">
                        {claim.bots ? (
                          <Link
                            to="/bots/$slug"
                            params={{
                              slug: claim.bots.slug,
                            }}
                            className="font-semibold text-primary hover:underline"
                          >
                            {claim.bots.name}
                          </Link>
                        ) : (
                          <p className="font-semibold">
                            Unavailable bot
                          </p>
                        )}

                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Avatar
                            name={
                              claim.profiles?.username ??
                              "User"
                            }
                            src={
                              claim.profiles?.avatar_url ??
                              null
                            }
                          />

                          <span>
                            {claim.profiles?.username ??
                              "Unknown user"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {claim.discord_user_id && (
                      <p className="mt-4 text-xs text-muted-foreground">
                        Discord user ID:{" "}
                        <span className="font-mono">
                          {claim.discord_user_id}
                        </span>
                      </p>
                    )}

                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {claim.proof}
                    </p>

                    {claim.review_note && (
                      <div className="mt-4 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Review note:
                        </span>{" "}
                        {claim.review_note}
                      </div>
                    )}
                  </div>

                  {claim.status === "open" && (
                    <div className="flex flex-wrap gap-2 lg:max-w-48 lg:justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={working}
                        onClick={() =>
                          void reviewClaim(
                            claim,
                            "approve",
                          )
                        }
                      >
                        {working ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}

                        Approve
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={working}
                        onClick={() =>
                          void reviewClaim(
                            claim,
                            "reject",
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Avatar({
  name,
  src,
  square = false,
}: {
  name: string;
  src: string | null;
  square?: boolean;
}) {
  const shape = square ? "rounded-xl" : "rounded-full";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={`h-10 w-10 shrink-0 border border-border object-cover ${shape}`}
      />
    );
  }

  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-secondary text-xs font-bold text-primary ${shape}`}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
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

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
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
