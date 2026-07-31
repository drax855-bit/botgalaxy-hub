import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";
import {
  adminBotAction,
  getAdminBots,
} from "@/lib/admin.functions";
import { AdminRequestsPanel } from "@/components/AdminRequestsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type BotStatus = "pending" | "approved" | "rejected" | "all";

type AdminBot = {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  short_description: string;
  status: "pending" | "approved" | "rejected";
  verified: boolean;
  featured: boolean;
  premium: boolean;
  is_demo: boolean;
  owner_name: string;
  vote_count: number;
  server_count: number;
  rating: number;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  const [bots, setBots] = useState<AdminBot[]>([]);
  const [status, setStatus] = useState<BotStatus>("pending");
  const [search, setSearch] = useState("");
  const [loadingBots, setLoadingBots] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/auth",
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      loadBots();
    }
  }, [user, status]);

  async function loadBots() {
    setLoadingBots(true);
    setError("");

    try {
      const data = await getAdminBots({
        data: {
          status,
          q: search.trim(),
        },
      });

      setBots(data as AdminBot[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "You do not have permission to access this page.",
      );
    } finally {
      setLoadingBots(false);
    }
  }

  async function runAction(
    botId: string,
    action:
      | "approve"
      | "reject"
      | "delete"
      | "feature"
      | "unfeature"
      | "verify"
      | "unverify"
      | "premium_on"
      | "premium_off",
  ) {
    let reason = "";

    if (action === "reject") {
      reason =
        window.prompt(
          "Enter the reason for rejecting this bot:",
          "Does not meet directory guidelines",
        ) ?? "";

      if (!reason.trim()) return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        "Delete this bot permanently? This cannot be undone.",
      );

      if (!confirmed) return;
    }

    setWorkingId(botId);
    setError("");

    try {
      await adminBotAction({
        data: {
          botId,
          action,
          reason,
        },
      });

      await loadBots();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The admin action failed.",
      );
    } finally {
      setWorkingId("");
    }
  }

  if (loading || (!user && !error)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const accessDenied =
    error.toLowerCase().includes("admin") ||
    error.toLowerCase().includes("unauthorized") ||
    error.toLowerCase().includes("forbidden") ||
    error.toLowerCase().includes("permission");

  if (accessDenied) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-destructive" />

          <h1 className="mt-4 text-2xl font-bold">
            Access denied
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to access the BotGalaxy admin
            area.
          </p>

          <Button asChild className="mt-6">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />

            <span className="text-sm font-medium">
              BotGalaxy staff
            </span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-bold">
            Admin area
          </h1>

          <p className="mt-2 text-muted-foreground">
            Review submissions, manage bot listings, and control
            administrator access.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadBots}
          disabled={loadingBots}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loadingBots ? "animate-spin" : ""
            }`}
          />

          Refresh bots
        </Button>
      </div>

      <AdminRequestsPanel />

      <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
                ["all", "All bots"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={
                  status === value ? "default" : "secondary"
                }
                onClick={() => setStatus(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <form
            className="flex w-full gap-2 lg:max-w-md"
            onSubmit={(event) => {
              event.preventDefault();
              loadBots();
            }}
          >
            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search bot name..."
            />

            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loadingBots ? (
          <div className="flex min-h-52 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : bots.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold">
              No bots found
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              There are no bot listings matching this filter.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {bots.map((bot) => {
              const working = workingId === bot.id;

              return (
                <article
                  key={bot.id}
                  className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary text-lg font-bold">
                        {bot.avatar_url ? (
                          <img
                            src={bot.avatar_url}
                            alt={`${bot.name} avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          bot.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold">
                            {bot.name}
                          </h2>

                          <StatusBadge status={bot.status} />

                          {bot.verified && (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                              Verified
                            </span>
                          )}

                          {bot.featured && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-500">
                              Featured
                            </span>
                          )}

                          {bot.premium && (
                            <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-500">
                              Premium
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {bot.short_description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Owner: {bot.owner_name}
                          </span>

                          <span>
                            Votes: {bot.vote_count}
                          </span>

                          <span>
                            Servers: {bot.server_count}
                          </span>

                          <span>
                            Rating:{" "}
                            {Number(bot.rating).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-md lg:justify-end">
                      {bot.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            runAction(bot.id, "approve")
                          }
                          disabled={working}
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                      )}

                      {bot.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            runAction(bot.id, "reject")
                          }
                          disabled={working}
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          runAction(
                            bot.id,
                            bot.verified
                              ? "unverify"
                              : "verify",
                          )
                        }
                        disabled={working}
                      >
                        <BadgeCheck className="h-4 w-4" />

                        {bot.verified
                          ? "Unverify"
                          : "Verify"}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          runAction(
                            bot.id,
                            bot.featured
                              ? "unfeature"
                              : "feature",
                          )
                        }
                        disabled={working}
                      >
                        <Star className="h-4 w-4" />

                        {bot.featured
                          ? "Unfeature"
                          : "Feature"}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          runAction(
                            bot.id,
                            bot.premium
                              ? "premium_off"
                              : "premium_on",
                          )
                        }
                        disabled={working}
                      >
                        {bot.premium
                          ? "Remove premium"
                          : "Make premium"}
                      </Button>

                      {bot.status === "approved" && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                        >
                          <Link
                            to="/bots/$slug"
                            params={{
                              slug: bot.slug,
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          runAction(bot.id, "delete")
                        }
                        disabled={working}
                      >
                        {working ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}

                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const styles = {
    pending: "bg-amber-500/10 text-amber-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
