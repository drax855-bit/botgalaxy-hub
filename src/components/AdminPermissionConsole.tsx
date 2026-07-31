import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Loader2,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import {
  getAdminPermissionConsole,
  removeAdministrator,
  updateAdminPermissions,
  type AdminPermissions,
} from "@/lib/admin-permissions.functions";
import { Button } from "@/components/ui/button";

type AdminRow = {
  user_id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string | null;
  is_owner: boolean;
  permissions: AdminPermissions;
};

const permissionLabels: Array<{
  key: keyof AdminPermissions;
  label: string;
  description: string;
}> = [
  {
    key: "approve_bots",
    label: "Approve bots",
    description: "Approve or reject submitted bot listings.",
  },
  {
    key: "delete_bots",
    label: "Delete bots",
    description: "Permanently remove bot listings.",
  },
  {
    key: "verify_bots",
    label: "Verify bots",
    description: "Add or remove verified status.",
  },
  {
    key: "feature_bots",
    label: "Feature bots",
    description: "Add or remove featured status.",
  },
  {
    key: "view_users",
    label: "View users",
    description: "View registered BotGalaxy accounts.",
  },
  {
    key: "ban_users",
    label: "Ban users",
    description: "Ban or unban user accounts.",
  },
  {
    key: "manage_reports",
    label: "Manage reports",
    description: "Resolve or dismiss submitted reports.",
  },
  {
    key: "manage_reviews",
    label: "Manage reviews",
    description: "Remove rule-breaking reviews.",
  },
  {
    key: "manage_categories",
    label: "Manage categories",
    description: "Create or delete bot categories.",
  },
  {
    key: "manage_moderators",
    label: "Manage moderators",
    description: "Grant or remove moderator access.",
  },
  {
    key: "view_audit_logs",
    label: "View audit logs",
    description: "View administrator action history.",
  },
];

export function AdminPermissionConsole() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, AdminPermissions>
  >({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAdmins();
  }, []);

  async function loadAdmins() {
    setLoading(true);
    setError("");

    try {
      const data = (await getAdminPermissionConsole()) as AdminRow[];

      setAdmins(data);

      setDrafts(
        Object.fromEntries(
          data.map((admin) => [
            admin.user_id,
            { ...admin.permissions },
          ]),
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load the administrator permission console.",
      );
    } finally {
      setLoading(false);
    }
  }

  function togglePermission(
    userId: string,
    permission: keyof AdminPermissions,
  ) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [permission]: !current[userId][permission],
      },
    }));

    setSuccess("");
  }

  async function savePermissions(admin: AdminRow) {
    const permissions = drafts[admin.user_id];

    if (!permissions || admin.is_owner) return;

    setWorkingId(admin.user_id);
    setError("");
    setSuccess("");

    try {
      await updateAdminPermissions({
        data: {
          userId: admin.user_id,
          permissions,
        },
      });

      setSuccess(
        `Permissions were updated for ${admin.email}.`,
      );

      await loadAdmins();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The permissions could not be saved.",
      );
    } finally {
      setWorkingId("");
    }
  }

  async function removeAdmin(admin: AdminRow) {
    if (admin.is_owner) return;

    const confirmed = window.confirm(
      `Remove administrator access from ${admin.email}?\n\nThey will immediately lose access to the admin area.`,
    );

    if (!confirmed) return;

    setWorkingId(admin.user_id);
    setError("");
    setSuccess("");

    try {
      await removeAdministrator({
        data: {
          userId: admin.user_id,
        },
      });

      setSuccess(
        `Administrator access was removed from ${admin.email}.`,
      );

      await loadAdmins();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Administrator access could not be removed.",
      );
    } finally {
      setWorkingId("");
    }
  }

  const sortedAdmins = useMemo(
    () =>
      [...admins].sort((a, b) => {
        if (a.is_owner) return -1;
        if (b.is_owner) return 1;

        return a.username.localeCompare(b.username);
      }),
    [admins],
  );

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />

            <span className="text-sm font-medium">
              Owner controls
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold">
            Admin permission console
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Choose exactly what each trusted administrator can do.
            The BotGalaxy owner always has every permission.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={loadAdmins}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

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
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sortedAdmins.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-medium">
            No administrators found
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {sortedAdmins.map((admin) => {
            const permissions = drafts[admin.user_id];
            const working = workingId === admin.user_id;

            return (
              <article
                key={admin.user_id}
                className="rounded-2xl border border-border bg-background p-4 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary font-bold">
                      {admin.avatar_url ? (
                        <img
                          src={admin.avatar_url}
                          alt={`${admin.username} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        admin.username
                          .slice(0, 2)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {admin.username}
                        </h3>

                        {admin.is_owner && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500">
                            <Crown className="h-3 w-3" />
                            Owner
                          </span>
                        )}
                      </div>

                      <p className="break-all text-sm text-muted-foreground">
                        {admin.email}
                      </p>

                      {admin.created_at && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(
                            admin.created_at,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {!admin.is_owner && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          savePermissions(admin)
                        }
                        disabled={working}
                      >
                        {working ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}

                        Save permissions
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeAdmin(admin)}
                        disabled={working}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove admin
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {permissionLabels.map((permission) => {
                    const enabled =
                      admin.is_owner ||
                      Boolean(
                        permissions?.[permission.key],
                      );

                    return (
                      <button
                        key={permission.key}
                        type="button"
                        disabled={admin.is_owner || working}
                        onClick={() =>
                          togglePermission(
                            admin.user_id,
                            permission.key,
                          )
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          enabled
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-card"
                        } ${
                          admin.is_owner
                            ? "cursor-not-allowed opacity-80"
                            : "hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {permission.label}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                              enabled
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {enabled ? "ON" : "OFF"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
