import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  Crown,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { adminBotAction, getAdminBots } from "@/lib/admin.functions";
import type { AdminPermissions } from "@/lib/admin-permissions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const statusTabs: Array<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function BotManagementConsole({
  permissions,
}: {
  permissions: AdminPermissions;
}) {
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadBots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeSearch]);

  async function loadBots() {
    setLoading(true);
    setError("");

    try {
      const rows = (await getAdminBots({
        data: { status, q: activeSearch },
      })) as AdminBot[];

      setBots(rows);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load bot listings.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAction(
    bot: AdminBot,
    action:
      | "approve"
      | "reject"
      | "delete"
      | "verify"
      | "unverify"
      | "feature"
      | "unfeature"
      | "premium_on"
      | "premium_off",
    label: string,
  ) {
    if (action === "delete" || action === "reject") {
      const confirmed = window.confirm(
        `${label} "${bot.name}"?\n\nThis action is logged in the audit trail.`,
      );

      if (!confirmed) return;
    }

    let reason: string | undefined;

    if (action === "reject") {
      const input = window.prompt(
        "Reason shown to the bot owner:",
        "Does not meet directory guidelines",
      );

      if (input === null) return;
      reason = input.trim() || undefined;
    }

    setWorkingId(bot.id);
    setError("");
    setSuccess("");

    try {
      await adminBotAction({
        data: { botId: bot.id, action, reason },
      });

      setSuccess(`${label} completed for ${bot.name}.`);
      await loadBots();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The action could not be completed.",
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
            <BadgeCheck className="h-5 w-5" />
            <span className="text-sm font-medium">Bot moderation</span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">Bot management</h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review submissions, verify trusted bots and curate the featured
            rows. Available actions match your granted permissions.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={loadBots}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={status === tab.value ? "default" : "secondary"}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setActiveSearch(search.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bot name"
              className="pl-10"
              maxLength={80}
            />
          </div>

          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : bots.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-medium">No bots found</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Try another status filter or search term.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {bots.map((bot) => {
            const working = workingId === bot.id;

            return (
              <article
                key={bot.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {bot.avatar_url ? (
                      <img
                        src={bot.avatar_url}
                        alt={`${bot.name} avatar`}
                        loading="lazy"
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-sm font-bold">
                        {bot.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{bot.name}</p>

                        <StatusBadge status={bot.status} />

                        {bot.verified && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            verified
                          </span>
                        )}

                        {bot.featured && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                            featured
                          </span>
                        )}

                        {bot.premium && (
                          <span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-xs font-medium text-fuchsia-400">
                            premium
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {bot.short_description}
                      </p>

                      <p className="mt-2 text-xs text-muted-foreground">
                        by {bot.owner_name} ·{" "}
                        {bot.vote_count.toLocaleString()} votes ·{" "}
                        {new Date(bot.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {permissions.approve_bots && bot.status !== "approved" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => runAction(bot, "approve", "Approval")}
                        disabled={working}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                    )}

                    {permissions.approve_bots && bot.status !== "rejected" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction(bot, "reject", "Rejection")}
                        disabled={working}
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    )}

                    {permissions.verify_bots && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          runAction(
                            bot,
                            bot.verified ? "unverify" : "verify",
                            bot.verified ? "Unverify" : "Verify",
                          )
                        }
                        disabled={working}
                      >
                        <BadgeCheck className="h-4 w-4" />
                        {bot.verified ? "Unverify" : "Verify"}
                      </Button>
                    )}

                    {permissions.feature_bots && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            runAction(
                              bot,
                              bot.featured ? "unfeature" : "feature",
                              bot.featured ? "Unfeature" : "Feature",
                            )
                          }
                          disabled={working}
                        >
                          <Sparkles className="h-4 w-4" />
                          {bot.featured ? "Unfeature" : "Feature"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            runAction(
                              bot,
                              bot.premium ? "premium_off" : "premium_on",
                              bot.premium ? "Premium off" : "Premium on",
                            )
                          }
                          disabled={working}
                        >
                          <Crown className="h-4 w-4" />
                          {bot.premium ? "Premium off" : "Premium on"}
                        </Button>
                      </>
                    )}

                    {permissions.delete_bots && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => runAction(bot, "delete", "Deletion")}
                        disabled={working}
                      >
                        {working ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: AdminBot["status"] }) {
  const styles: Record<AdminBot["status"], string> = {
    pending: "bg-amber-500/10 text-amber-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    rejected: "bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
