import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  Bot,
  ClipboardCheck,
  FolderTree,
  Headphones,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquareWarning,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

import { useSession } from "@/hooks/useSession";
import {
  getMyAdminPermissions,
  type AdminPermissions,
} from "@/lib/admin-permissions.functions";

import { AdminRequestsPanel } from "@/components/AdminRequestsPanel";
import { AdminPermissionConsole } from "@/components/AdminPermissionConsole";
import { UserManagementConsole } from "@/components/UserManagementConsole";
import { BotManagementConsole } from "@/components/BotManagementConsole";
import { AdminModerationConsole } from "@/components/AdminModerationConsole";
import { AdminCategoryConsole } from "@/components/AdminCategoryConsole";
import { AdminContactConsole } from "@/components/AdminContactConsole";
import { AdminClaimConsole } from "@/components/AdminClaimConsole";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      {
        title: "Admin control room — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Protected BotGalaxy administration area for bots, reports, reviews, users, moderators, categories, support and ownership claims.",
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

type MenuItem = {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  visible: boolean;
};

function AdminPage() {
  const navigate = useNavigate();

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

  const [menuOpen, setMenuOpen] =
    useState(false);

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
          setAccess(result as AccessState);
        }
      })
      .catch((caughtError: unknown) => {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not verify administrator access.",
        );
      })
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

  function goToSection(id: string) {
    setMenuOpen(false);

    window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 120);
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (
    error ||
    !access ||
    (!access.isAdmin && !access.isOwner)
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

  const canModerate =
    permissions.manage_reports ||
    permissions.manage_reviews ||
    permissions.manage_moderators ||
    permissions.view_audit_logs;

  const menuItems: MenuItem[] = [
    {
      id: "admin-overview",
      label: "Overview",
      description: "Admin account and permissions",
      icon: <LayoutDashboard className="h-5 w-5" />,
      visible: true,
    },
    {
      id: "bot-management",
      label: "Bot management",
      description: "Approve, verify and manage bots",
      icon: <Bot className="h-5 w-5" />,
      visible: true,
    },
    {
      id: "moderation-center",
      label: "Moderation center",
      description: "Reports, reviews and audit logs",
      icon: <MessageSquareWarning className="h-5 w-5" />,
      visible: canModerate,
    },
    {
      id: "category-management",
      label: "Categories",
      description: "Create and remove categories",
      icon: <FolderTree className="h-5 w-5" />,
      visible: permissions.manage_categories,
    },
    {
      id: "user-management",
      label: "User management",
      description: "View and moderate accounts",
      icon: <Users className="h-5 w-5" />,
      visible: permissions.view_users,
    },
    {
      id: "contact-requests",
      label: "Contact requests",
      description: "Support messages from users",
      icon: <Headphones className="h-5 w-5" />,
      visible: isOwner,
    },
    {
      id: "ownership-claims",
      label: "Ownership claims",
      description: "Review claims for bot listings",
      icon: <ClipboardCheck className="h-5 w-5" />,
      visible: isOwner,
    },
    {
      id: "admin-requests",
      label: "Admin requests",
      description: "Review administrator invitations",
      icon: <Shield className="h-5 w-5" />,
      visible: isOwner,
    },
    {
      id: "admin-permissions",
      label: "Admin permissions",
      description: "Control administrator access",
      icon: <UserCog className="h-5 w-5" />,
      visible: isOwner,
    },
  ];

  const visibleMenuItems =
    menuItems.filter(
      (item) => item.visible,
    );

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setMenuOpen(true)}
        aria-label="Open admin navigation"
        className="fixed left-4 top-20 z-40 h-11 w-11 rounded-full shadow-lg sm:left-6"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <SheetContent
          side="left"
          className="w-[88vw] max-w-sm overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              Admin navigation
            </SheetTitle>

            <SheetDescription>
              Jump directly to any section of
              the BotGalaxy control room.
            </SheetDescription>
          </SheetHeader>

          <nav
            className="mt-6 space-y-2"
            aria-label="Admin sections"
          >
            {visibleMenuItems.map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    goToSection(item.id)
                  }
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {item.icon}
                  </span>

                  <span className="min-w-0">
                    <span className="block font-medium">
                      {item.label}
                    </span>

                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              ),
            )}
          </nav>

          <Button
            asChild
            variant="secondary"
            className="mt-6 w-full"
          >
            <Link to="/">
              Back to BotGalaxy
            </Link>
          </Button>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section
          id="admin-overview"
          className="scroll-mt-24"
        >
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
              Use the menu button in the top-left
              to jump directly to bots, moderation,
              users, support requests, ownership
              claims or administrator settings.
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
        </section>

        <section
          id="bot-management"
          className="scroll-mt-24"
        >
          <BotManagementConsole
            permissions={permissions}
          />
        </section>

        {canModerate && (
          <section
            id="moderation-center"
            className="scroll-mt-24"
          >
            <AdminModerationConsole
              permissions={permissions}
            />
          </section>
        )}

        {permissions.manage_categories && (
          <section
            id="category-management"
            className="scroll-mt-24"
          >
            <AdminCategoryConsole />
          </section>
        )}

        {permissions.view_users && (
          <section
            id="user-management"
            className="scroll-mt-24"
          >
            <UserManagementConsole
              canBan={permissions.ban_users}
            />
          </section>
        )}

        {isOwner && (
          <>
            <section
              id="contact-requests"
              className="scroll-mt-24"
            >
              <AdminContactConsole />
            </section>

            <section
              id="ownership-claims"
              className="scroll-mt-24"
            >
              <AdminClaimConsole />
            </section>

            <section
              id="admin-requests"
              className="scroll-mt-24"
            >
              <AdminRequestsPanel />
            </section>

            <section
              id="admin-permissions"
              className="scroll-mt-24"
            >
              <AdminPermissionConsole />
            </section>
          </>
        )}
      </main>
    </>
  );
}
