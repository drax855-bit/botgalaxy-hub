import { FormEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Mail,
  RefreshCw,
  ShieldPlus,
  X,
} from "lucide-react";
import {
  cancelAdminRequest,
  createAdminRequest,
  getAdminRequests,
} from "@/lib/admin-request.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminRequest = {
  id: string;
  requested_email: string;
  requested_user_id: string | null;
  requested_by: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export function AdminRequestsPanel() {
  const [email, setEmail] = useState("");
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminRequests();
      setRequests(data as AdminRequest[]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load administrator requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requestedEmail = email.trim().toLowerCase();

    if (!requestedEmail) {
      setError("Enter the registered BotGalaxy account email.");
      return;
    }

    const confirmed = window.confirm(
      `Send an administrator access request for ${requestedEmail}?\n\nThis will send a security warning email to the BotGalaxy owner. It will not grant administrator access automatically.`,
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await createAdminRequest({
        data: {
          requestedEmail,
        },
      });

      setEmail("");
      setSuccess(
        `The administrator request for ${requestedEmail} was saved and the owner alert was sent.`,
      );

      await loadRequests();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The administrator request could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(request: AdminRequest) {
    const confirmed = window.confirm(
      `Cancel the pending administrator request for ${request.requested_email}?`,
    );

    if (!confirmed) return;

    setWorkingId(request.id);
    setError("");
    setSuccess("");

    try {
      await cancelAdminRequest({
        data: {
          requestId: request.id,
        },
      });

      setSuccess(
        `The administrator request for ${request.requested_email} was cancelled.`,
      );

      await loadRequests();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The request could not be cancelled.",
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
            <ShieldPlus className="h-5 w-5" />
            <span className="text-sm font-medium">
              Administrator access
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Admin access requests
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Request administrator access for an existing registered
            BotGalaxy account. The owner receives a security alert before
            any access can be granted.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={loadRequests}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

          <div>
            <p className="font-medium text-amber-500">
              Powerful permission
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Only request administrator access for someone you personally
              know and trust. Creating a request does not grant access
              automatically.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Registered BotGalaxy email"
            className="pl-10"
            maxLength={320}
            disabled={submitting}
            required
          />
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldPlus className="h-4 w-4" />
          )}

          Send admin request
        </Button>
      </form>

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

      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-lg font-semibold">Request history</h3>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-medium">No administrator requests</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Requests created from this panel will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map((request) => {
              const isPending = request.status === "pending";
              const working = workingId === request.id;

              return (
                <article
                  key={request.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="break-all font-medium">
                      {request.requested_email}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <RequestStatus status={request.status} />

                      <span>
                        Created{" "}
                        {new Date(request.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {isPending && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(request)}
                      disabled={working}
                    >
                      {working ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}

                      Cancel request
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function RequestStatus({
  status,
}: {
  status: AdminRequest["status"];
}) {
  const styles = {
    pending: "bg-amber-500/10 text-amber-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    denied: "bg-destructive/10 text-destructive",
    cancelled: "bg-secondary text-muted-foreground",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
