import {
  useEffect,
  useState,
} from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  useSession,
} from "@/hooks/useSession";
import {
  getMyAdminPermissions,
  type AdminPermissions,
} from "@/lib/admin-permissions.functions";

import {
  AdminRequestsPanel,
} from "@/components/AdminRequestsPanel";
import {
  AdminPermissionConsole,
} from "@/components/AdminPermissionConsole";
import {
  UserManagementConsole,
} from "@/components/UserManagementConsole";
import {
  BotManagementConsole,
} from "@/components/BotManagementConsole";
import {
  AdminModerationConsole,
} from "@/components/AdminModerationConsole";
import {
  AdminCategoryConsole,
} from "@/components/AdminCategoryConsole";
import {
  Button,
} from "@/components/ui/button";

export const Route =
  createFileRoute("/admin")({
    head: () => ({
      meta: [
        {
          title:
            "Admin control room — BotGalaxy",
        },
        {
          name: "description",
          content:
            "Protected BotGalaxy administration area for bots, reports, reviews, users, moderators and categories.",
        },
        {
          name: "robots",
          content: "noindex",
        },
      ],
    }),

    component: AdminPage,
  });

type AccessState = {
  isOwner: boolean;
  isAdmin: boolean;
  permissions: AdminPermissions;
};

function AdminPage() {
  const navigate =
    useNavigate();

  const {
    user,
    loading: sessionLoading,
  } = useSession();

  const [access, setAccess] =
    useState<AccessState | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (sessionLoading) {
      return;
    }

    if (!user) {
      void navigate({
        to: "/auth",
        replace: true,
      });

      return;
    }

    let active = true;

    setLoading(true);
    setError("");

    getMyAdminPermissions()
      .then((result) => {
        if (active) {
          setAccess(
            result as AccessState,
          );
        }
      })
      .catch(
        (caughtError: unknown) => {
          if (!active) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not verify administrator access.",
          );
        },
      )
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    user,
    sessionLoading,
    navigate,
  ]);

  if (
    sessionLoading ||
    loading
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (
    error ||
    !access ||
    (
      !access.isAdmin &&
      !access.isOwner
    )
  ) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>

        <h1 className="mt-5 text-2xl font-bold">
          Access denied
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {error ||
            "This area is restricted to BotGalaxy administrators."}
        </p>

        <Button
          asChild
          className="mt-6"
        >
          <Link to="/">
            Back to BotGalaxy
          </Link>
        </Button>
      </div>
    );
  }

  const {
    permissions,
    isOwner,
  } = access;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />

          <span className="text-sm font-medium">
            {isOwner
              ? "Owner console"
              : "Administrator console"}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          BotGalaxy admin control room
        </h1>

        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Manage bot listings, reports,
          reviews, categories, users,
          moderators and administrator
          permissions.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {Object.entries(permissions)
            .filter(
              ([, granted]) => granted,
            )
            .map(([key]) => (
              <span
                key={key}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize text-muted-foreground"
              >
                {key.replace(/_/g, " ")}
              </span>
            ))}
        </div>
      </header>

      <BotManagementConsole
        permissions={permissions}
      />

      <AdminModerationConsole
        permissions={permissions}
      />

      {permissions.manage_categories && (
        <AdminCategoryConsole />
      )}

      {permissions.view_users && (
        <UserManagementConsole
          canBan={permissions.ban_users}
        />
      )}

      {isOwner && (
        <>
          <AdminRequestsPanel />

          <AdminPermissionConsole />
        </>
      )}
    </main>
  );
}
