import {
  useEffect,
  useState,
} from "react";
import {
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  adminContactAction,
  getAdminContactSubmissions,
  type ContactStatus,
} from "@/lib/contact.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StatusFilter = ContactStatus | "all";

type ContactSubmission = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  issue_type: string;
  subject: string;
  message: string;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "open", label: "Open" },
  {
    value: "in_progress",
    label: "In progress",
  },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

export function AdminContactConsole() {
  const [rows, setRows] =
    useState<ContactSubmission[]>([]);

  const [status, setStatus] =
    useState<StatusFilter>("open");

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadRows();
  }, [status, activeSearch]);

  async function loadRows() {
    setLoading(true);
    setError("");

    try {
      const result =
        (await getAdminContactSubmissions({
          data: {
            status,
            q: activeSearch,
          },
        })) as ContactSubmission[];

      setRows(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load support requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAction(
    row: ContactSubmission,
    action:
      | "start"
      | "resolve"
      | "close"
      | "reopen"
      | "delete",
  ) {
    if (
      action === "delete" &&
      !window.confirm(
        `Delete the support request from ${row.name}?`,
      )
    ) {
      return;
    }

    setWorkingId(row.id);
    setError("");
    setSuccess("");

    try {
      await adminContactAction({
        data: {
          id: row.id,
          action,
        },
      });

      setSuccess(
        action === "delete"
          ? "Support request deleted."
          : "Support request updated.",
      );

      await loadRows();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The support request could not be updated.",
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
            <Inbox className="h-5 w-5" />

            <span className="text-sm font-medium">
              Owner support inbox
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Contact requests
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Read and manage messages submitted through
            the BotGalaxy contact page.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={loadRows}
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
        {STATUS_OPTIONS.map((option) => (
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
            placeholder="Search name, email, subject or message"
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
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border py-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />

          <p className="mt-3 font-medium">
            No support requests found
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => {
            const working = workingId === row.id;

            return (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.status} />

                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {humanize(row.issue_type)}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {new Date(
                          row.created_at,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold">
                      {row.subject}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      From {row.name} ·{" "}
                      <a
                        href={`mailto:${row.email}?subject=${encodeURIComponent(
                          `Re: ${row.subject}`,
                        )}`}
                        className="text-primary hover:underline"
                      >
                        {row.email}
                      </a>
                    </p>

                    <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {row.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-56 lg:justify-end">
                    {row.status === "open" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction(row, "start")
                        }
                      >
                        <Clock3 className="h-4 w-4" />
                        Start
                      </Button>
                    )}

                    {row.status !== "resolved" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={working}
                        onClick={() =>
                          void runAction(row, "resolve")
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve
                      </Button>
                    )}

                    {row.status !== "closed" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction(row, "close")
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Close
                      </Button>
                    )}

                    {row.status !== "open" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={working}
                        onClick={() =>
                          void runAction(row, "reopen")
                        }
                      >
                        <Mail className="h-4 w-4" />
                        Reopen
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={working}
                      onClick={() =>
                        void runAction(row, "delete")
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: ContactStatus;
}) {
  const style =
    status === "open"
      ? "bg-amber-500/10 text-amber-500"
      : status === "in_progress"
        ? "bg-blue-500/10 text-blue-400"
        : status === "resolved"
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-secondary text-muted-foreground";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {humanize(status)}
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

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}
