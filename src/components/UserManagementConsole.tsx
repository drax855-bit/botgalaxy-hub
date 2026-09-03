import { useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { OfficialOwnerBadge } from "@/components/OfficialOwnerBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  banManagedUser,
  getManagedUsers,
  getUserModerationHistory,
  unbanManagedUser,
} from "@/lib/user-management.functions";

type ManagedUser = {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  roles: string[];
  is_owner: boolean;
  official_owner?: boolean;
  banned: boolean;
  ban: {
    reason: string;
    banned_at: string;
    banned_by: string | null;
    expires_at: string | null;
    active: boolean;
  } | null;
};

type ModerationLog = {
  id: string;
  actor_id: string | null;
  target_user_id: string;
  action: "ban_user" | "unban_user";
  reason: string | null;
  created_at: string;
};

type UsersResponse = {
  users: ManagedUser[];
  page: number;
  perPage: number;
  hasMore: boolean;
};

export function UserManagementConsole({
  canBan = false,
}: {
  canBan?: boolean;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [historyUser, setHistoryUser] =
    useState<ManagedUser | null>(null);
  const [history, setHistory] = useState<ModerationLog[]>([]);
  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadUsers();
  }, [page, activeSearch]);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const data = (await getManagedUsers({
        data: {
          q: activeSearch,
          page,
          perPage: 50,
        },
      })) as UsersResponse;

      setUsers(data.users);
      setHasMore(data.hasMore);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load registered users.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setActiveSearch(search.trim());
  }

  async function banUser(user: ManagedUser) {
    if (user.is_owner) return;

    const reason = window.prompt(
      `Enter the reason for banning ${user.email}:`,
      "Violation of BotGalaxy rules",
    );

    if (!reason?.trim()) return;

    const durationInput = window.prompt(
      [
        "Enter the ban duration in days.",
        "",
        "Leave empty for a permanent ban.",
        "Examples: 1, 7, 30",
      ].join("\n"),
      "",
    );

    if (durationInput === null) return;

    let durationDays: number | null = null;

    if (durationInput.trim()) {
      durationDays = Number(durationInput);

      if (
        !Number.isInteger(durationDays) ||
        durationDays < 1 ||
        durationDays > 3650
      ) {
        setError(
          "Ban duration must be a whole number between 1 and 3650 days.",
        );
        return;
      }
    }

    const confirmed = window.confirm(
      durationDays
        ? `Ban ${user.email} for ${durationDays} day(s)?`
        : `Permanently ban ${user.email}?`,
    );

    if (!confirmed) return;

    setWorkingId(user.id);
    setError("");
    setSuccess("");

    try {
      await banManagedUser({
        data: {
          userId: user.id,
          reason: reason.trim(),
          durationDays,
        },
      });

      setSuccess(`${user.email} has been banned.`);
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The user could not be banned.",
      );
    } finally {
      setWorkingId("");
    }
  }

  async function unbanUser(user: ManagedUser) {
    const reason =
      window.prompt(
        `Enter a reason for unbanning ${user.email}:`,
        "Ban reviewed and removed",
      ) ?? "";

    if (!reason.trim()) return;

    const confirmed = window.confirm(
      `Remove the active ban from ${user.email}?`,
    );

    if (!confirmed) return;

    setWorkingId(user.id);
    setError("");
    setSuccess("");

    try {
      await unbanManagedUser({
        data: {
          userId: user.id,
          reason: reason.trim(),
        },
      });

      setSuccess(`${user.email} has been unbanned.`);
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The user could not be unbanned.",
      );
    } finally {
      setWorkingId("");
    }
  }

  async function openHistory(user: ManagedUser) {
    setHistoryUser(user);
    setHistory([]);
    setLoadingHistory(true);
    setError("");

    try {
      const data =
        (await getUserModerationHistory({
          data: {
            userId: user.id,
          },
        })) as ModerationLog[];

      setHistory(data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load moderation history.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />

            <span className="text-sm font-medium">
              Account moderation
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            User management console
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Search registered accounts, inspect roles and account
            activity, and manage user bans.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={loadUsers}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh users
        </Button>
      </div>

      <form
        className="mt-6 flex w-full max-w-2xl gap-2"
        onSubmit={submitSearch}
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search username, email or user ID..."
        />

        <Button type="submit" disabled={loading}>
          <Search className="h-4 w-4" />
          Search
        </Button>

        {activeSearch && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch("");
              setPage(1);
              setActiveSearch("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />

          <h3 className="mt-4 text-lg font-semibold">
            No users found
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            No registered accounts matched this search.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {users.map((user) => {
            const working = workingId === user.id;

            return (
              <article
                key={user.id}
                className="rounded-2xl border border-border bg-background p-4 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-5 lg:flex-row">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary text-lg font-bold">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={`${user.username} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user.username.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {user.username}
                        </h3>

                        {user.official_owner && <OfficialOwnerBadge />}

                        {user.is_owner && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500">
                            Owner
                          </span>
                        )}

                        {user.banned && (
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                            Banned
                          </span>
                        )}

                        {user.email_confirmed ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500">
                            <UserCheck className="h-3 w-3" />
                            Email verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
                            Email unverified
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {user.email}
                      </p>

                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        ID: {user.id}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span
                              key={role}
                              className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs capitalize"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-border bg-card px-2 py-1 text-xs text-muted-foreground">
                            No roles
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Joined:{" "}
                          {new Date(
                            user.created_at,
                          ).toLocaleString()}
                        </span>

                        <span>
                          Last login:{" "}
                          {user.last_sign_in_at
                            ? new Date(
                                user.last_sign_in_at,
                              ).toLocaleString()
                            : "Never"}
                        </span>
                      </div>

                      {user.banned && user.ban && (
                        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                          <p className="font-medium text-destructive">
                            Ban reason
                          </p>

                          <p className="mt-1 text-muted-foreground">
                            {user.ban.reason}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Banned:{" "}
                              {new Date(
                                user.ban.banned_at,
                              ).toLocaleString()}
                            </span>

                            <span>
                              Expires:{" "}
                              {user.ban.expires_at
                                ? new Date(
                                    user.ban.expires_at,
                                  ).toLocaleString()
                                : "Permanent"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openHistory(user)}
                      disabled={working}
                    >
                      <History className="h-4 w-4" />
                      History
                    </Button>

                    {canBan &&
                      !user.is_owner &&
                      (user.banned ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => unbanUser(user)}
                          disabled={working}
                        >
                          {working ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}

                          Unban
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => banUser(user)}
                          disabled={working}
                        >
                          {working ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}

                          Ban user
                        </Button>
                      ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1 || loading}
          onClick={() =>
            setPage((current) => Math.max(1, current - 1))
          }
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Page {page}
        </span>

        <Button
          type="button"
          variant="secondary"
          disabled={!hasMore || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {historyUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <History className="h-5 w-5" />

                  <span className="text-sm font-medium">
                    Moderation records
                  </span>
                </div>

                <h3 className="mt-2 text-xl font-bold">
                  {historyUser.username}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {historyUser.email}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setHistoryUser(null)}
              >
                Close
              </Button>
            </div>

            {loadingHistory ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="mx-auto h-9 w-9 text-muted-foreground" />

                <p className="mt-3 font-medium">
                  No moderation history
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {history.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          log.action === "ban_user"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {log.action === "ban_user"
                          ? "User banned"
                          : "User unbanned"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          log.created_at,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-3 text-sm">
                      {log.reason || "No reason provided"}
                    </p>

                    {log.actor_id && (
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        Admin ID: {log.actor_id}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
