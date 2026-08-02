import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ClipboardList,
  Flag,
  History,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  Star,
  Trash2,
  UserCog,
  X,
} from "lucide-react";

import {
  adminModerationAction,
  getAdminModeration,
} from "@/lib/admin.functions";
import type { AdminPermissions } from "@/lib/admin-permissions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ModerationTab =
  | "reports"
  | "reviews"
  | "moderators"
  | "audit";

type ReportFilter =
  | "open"
  | "resolved"
  | "dismissed"
  | "all";

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  bot_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  bots: {
    name: string;
    slug: string;
  } | null;
};

type AuditRow = {
  id: string;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  meta: unknown;
  created_at: string;
};

type UserRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
};

type ModerationData = {
  reports: ReportRow[];
  reviews: ReviewRow[];
  audit: AuditRow[];
  users: UserRow[];
};

type ModerationAction =
  | "resolve_report"
  | "dismiss_report"
  | "delete_review"
  | "grant_moderator"
  | "revoke_moderator";

export function AdminModerationConsole({
  permissions,
}: {
  permissions: AdminPermissions;
}) {
  const availableTabs = useMemo(() => {
    const tabs: ModerationTab[] = [];

    if (permissions.manage_reports) {
      tabs.push("reports");
    }

    if (permissions.manage_reviews) {
      tabs.push("reviews");
    }

    if (permissions.manage_moderators) {
      tabs.push("moderators");
    }

    if (permissions.view_audit_logs) {
      tabs.push("audit");
    }

    return tabs;
  }, [permissions]);

  const [activeTab, setActiveTab] =
    useState<ModerationTab>(
      availableTabs[0] ?? "reports",
    );

  const [data, setData] =
    useState<ModerationData | null>(null);

  const [search, setSearch] =
    useState("");

  const [reportFilter, setReportFilter] =
    useState<ReportFilter>("open");

  const [loading, setLoading] =
    useState(true);

  const [workingId, setWorkingId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    void loadModeration();
  }, []);

  useEffect(() => {
    if (
      availableTabs.length &&
      !availableTabs.includes(activeTab)
    ) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  async function loadModeration() {
    setLoading(true);
    setError("");

    try {
      const result =
        (await getAdminModeration()) as ModerationData;

      setData(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load moderation data.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAction(
    action: ModerationAction,
    targetId: string,
    message: string,
    confirmation?: string,
  ) {
    if (
      confirmation &&
      !window.confirm(confirmation)
    ) {
      return;
    }

    setWorkingId(targetId);
    setError("");
    setSuccess("");

    try {
      await adminModerationAction({
        data: {
          action,
          targetId,
        },
      });

      setSuccess(message);
      await loadModeration();
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

  if (!availableTabs.length) {
    return null;
  }

  const term =
    search.trim().toLowerCase();

  const reports =
    data?.reports.filter((report) => {
      const statusMatches =
        reportFilter === "all" ||
        report.status === reportFilter;

      const searchMatches =
        !term ||
        report.reason
          .toLowerCase()
          .includes(term) ||
        (report.details ?? "")
          .toLowerCase()
          .includes(term) ||
        report.target_id
          .toLowerCase()
          .includes(term);

      return statusMatches && searchMatches;
    }) ?? [];

  const reviews =
    data?.reviews.filter((review) => {
      return (
        !term ||
        (review.bots?.name ?? "")
          .toLowerCase()
          .includes(term) ||
        (review.body ?? "")
          .toLowerCase()
          .includes(term)
      );
    }) ?? [];

  const users =
    data?.users.filter((user) => {
      return (
        !term ||
        user.username
          .toLowerCase()
          .includes(term) ||
        user.roles.some((role) =>
          role.toLowerCase().includes(term),
        )
      );
    }) ?? [];

  const audit =
    data?.audit.filter((entry) => {
      return (
        !term ||
        (entry.actor_name ?? "")
          .toLowerCase()
          .includes(term) ||
        entry.action
          .toLowerCase()
          .includes(term) ||
        entry.target_type
          .toLowerCase()
          .includes(term)
      );
    }) ?? [];

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />

            <span className="text-sm font-medium">
              Safety and moderation
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Moderation center
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Handle reports, reviews, moderators
            and administrator audit logs.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={loadModeration}
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
        {availableTabs.includes("reports") && (
          <TabButton
            active={activeTab === "reports"}
            label="Reports"
            icon={<Flag className="h-4 w-4" />}
            count={
              data?.reports.filter(
                (report) =>
                  report.status === "open",
              ).length
            }
            onClick={() =>
              setActiveTab("reports")
            }
          />
        )}

        {availableTabs.includes("reviews") && (
          <TabButton
            active={activeTab === "reviews"}
            label="Reviews"
            icon={
              <MessageSquare className="h-4 w-4" />
            }
            count={data?.reviews.length}
            onClick={() =>
              setActiveTab("reviews")
            }
          />
        )}

        {availableTabs.includes(
          "moderators",
        ) && (
          <TabButton
            active={
              activeTab === "moderators"
            }
            label="Moderators"
            icon={<UserCog className="h-4 w-4" />}
            onClick={() =>
              setActiveTab("moderators")
            }
          />
        )}

        {availableTabs.includes("audit") && (
          <TabButton
            active={activeTab === "audit"}
            label="Audit logs"
            icon={<History className="h-4 w-4" />}
            count={data?.audit.length}
            onClick={() =>
              setActiveTab("audit")
            }
          />
        )}
      </div>

      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder={`Search ${activeTab}`}
          className="pl-10"
          maxLength={100}
        />
      </div>

      {error && (
        <Notice type="error">
          {error}
        </Notice>
      )}

      {success && (
        <Notice type="success">
          {success}
        </Notice>
      )}

      {loading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {activeTab === "reports" && (
            <ReportsPanel
              reports={reports}
              filter={reportFilter}
              setFilter={setReportFilter}
              workingId={workingId}
              runAction={runAction}
            />
          )}

          {activeTab === "reviews" && (
            <ReviewsPanel
              reviews={reviews}
              workingId={workingId}
              runAction={runAction}
            />
          )}

          {activeTab === "moderators" && (
            <ModeratorsPanel
              users={users}
              workingId={workingId}
              runAction={runAction}
            />
          )}

          {activeTab === "audit" && (
            <AuditPanel entries={audit} />
          )}
        </>
      )}
    </section>
  );
}

function ReportsPanel({
  reports,
  filter,
  setFilter,
  workingId,
  runAction,
}: {
  reports: ReportRow[];
  filter: ReportFilter;
  setFilter: (value: ReportFilter) => void;
  workingId: string;
  runAction: (
    action: ModerationAction,
    targetId: string,
    message: string,
    confirmation?: string,
  ) => Promise<void>;
}) {
  const filters: Array<{
    value: ReportFilter;
    label: string;
  }> = [
    { value: "open", label: "Open" },
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {filters.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={
              filter === option.value
                ? "default"
                : "secondary"
            }
            onClick={() =>
              setFilter(option.value)
            }
          >
            {option.label}
          </Button>
        ))}
      </div>

      {!reports.length ? (
        <EmptyState
          icon={<Flag className="h-8 w-8" />}
          title="No reports found"
          description="No reports match this filter."
        />
      ) : (
        <div className="mt-5 space-y-3">
          {reports.map((report) => {
            const working =
              workingId === report.id;

            return (
              <article
                key={report.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={report.status}
                      />

                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {report.target_type}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {formatDate(
                          report.created_at,
                        )}
                      </span>
                    </div>

                    <h3 className="mt-3 font-semibold">
                      {report.reason}
                    </h3>

                    {report.details && (
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {report.details}
                      </p>
                    )}

                    <p className="mt-3 break-all text-xs text-muted-foreground">
                      Target ID: {report.target_id}
                    </p>
                  </div>

                  {report.status === "open" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={working}
                        onClick={() =>
                          void runAction(
                            "resolve_report",
                            report.id,
                            "Report resolved.",
                          )
                        }
                      >
                        {working ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}

                        Resolve
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction(
                            "dismiss_report",
                            report.id,
                            "Report dismissed.",
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewsPanel({
  reviews,
  workingId,
  runAction,
}: {
  reviews: ReviewRow[];
  workingId: string;
  runAction: (
    action: ModerationAction,
    targetId: string,
    message: string,
    confirmation?: string,
  ) => Promise<void>;
}) {
  if (!reviews.length) {
    return (
      <EmptyState
        icon={
          <MessageSquare className="h-8 w-8" />
        }
        title="No reviews found"
        description="No reviews match your search."
      />
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {reviews.map((review) => {
        const working =
          workingId === review.id;

        return (
          <article
            key={review.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <ReviewStars
                    rating={review.rating}
                  />

                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>

                {review.bots ? (
                  <Link
                    to="/bots/$slug"
                    params={{
                      slug: review.bots.slug,
                    }}
                    className="mt-3 inline-block font-semibold text-primary hover:underline"
                  >
                    {review.bots.name}
                  </Link>
                ) : (
                  <p className="mt-3 font-semibold">
                    Unavailable bot
                  </p>
                )}

                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {review.body ||
                    "No written review."}
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={working}
                onClick={() =>
                  void runAction(
                    "delete_review",
                    review.id,
                    "Review deleted.",
                    "Delete this review permanently?",
                  )
                }
              >
                {working ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}

                Delete
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ModeratorsPanel({
  users,
  workingId,
  runAction,
}: {
  users: UserRow[];
  workingId: string;
  runAction: (
    action: ModerationAction,
    targetId: string,
    message: string,
    confirmation?: string,
  ) => Promise<void>;
}) {
  if (!users.length) {
    return (
      <EmptyState
        icon={<UserCog className="h-8 w-8" />}
        title="No users found"
        description="No users match your search."
      />
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {users.map((user) => {
        const isModerator =
          user.roles.includes("moderator");

        const isAdmin =
          user.roles.includes("admin");

        const working =
          workingId === user.id;

        return (
          <article
            key={user.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  username={user.username}
                  avatarUrl={user.avatar_url}
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">
                      {user.username}
                    </p>

                    {isAdmin && (
                      <RoleBadge
                        label="Admin"
                        admin
                      />
                    )}

                    {isModerator && (
                      <RoleBadge label="Moderator" />
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined{" "}
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant={
                  isModerator
                    ? "destructive"
                    : "secondary"
                }
                disabled={working}
                onClick={() =>
                  void runAction(
                    isModerator
                      ? "revoke_moderator"
                      : "grant_moderator",
                    user.id,
                    isModerator
                      ? `${user.username} is no longer a moderator.`
                      : `${user.username} is now a moderator.`,
                    isModerator
                      ? `Remove ${user.username} as moderator?`
                      : undefined,
                  )
                }
              >
                {working ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isModerator ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}

                {isModerator
                  ? "Remove moderator"
                  : "Make moderator"}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AuditPanel({
  entries,
}: {
  entries: AuditRow[];
}) {
  if (!entries.length) {
    return (
      <EmptyState
        icon={
          <ClipboardList className="h-8 w-8" />
        }
        title="No audit entries found"
        description="No actions match your search."
      />
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {entries.map((entry) => (
        <article
          key={entry.id}
          className="rounded-xl border border-border bg-background p-4"
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row">
            <div className="min-w-0">
              <p className="font-medium">
                {entry.actor_name ||
                  "Administrator"}{" "}
                <span className="text-muted-foreground">
                  performed
                </span>{" "}
                {humanize(entry.action)}
              </p>

              <p className="mt-2 break-all text-xs text-muted-foreground">
                Target: {entry.target_type}
                {entry.target_id
                  ? ` · ${entry.target_id}`
                  : ""}
              </p>

              {entry.meta !== null &&
                entry.meta !== undefined && (
                  <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                    {safeJson(entry.meta)}
                  </pre>
                )}
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(entry.created_at)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function TabButton({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "secondary"}
      onClick={onClick}
    >
      {icon}
      {label}

      {typeof count === "number" && (
        <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-[10px]">
          {count}
        </span>
      )}
    </Button>
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
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={
            value <= rating
              ? "h-4 w-4 fill-accent text-accent"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      ))}
    </div>
  );
}

function UserAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${username} profile`}
        loading="lazy"
        className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-sm font-bold text-primary">
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

function RoleBadge({
  label,
  admin = false,
}: {
  label: string;
  admin?: boolean;
}) {
  return (
    <span
      className={
        admin
          ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          : "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500"
      }
    >
      {label}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const style =
    status === "open"
      ? "bg-amber-500/10 text-amber-500"
      : status === "resolved"
        ? "bg-emerald-500/10 text-emerald-500"
        : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border py-12 text-center">
      <div className="mx-auto flex w-fit text-muted-foreground">
        {icon}
      </div>

      <p className="mt-3 font-medium">
        {title}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Notice({
  type,
  children,
}: {
  type: "success" | "error";
  children: ReactNode;
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
