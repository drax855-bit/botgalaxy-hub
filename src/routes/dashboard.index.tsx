import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import { useSession } from "@/hooks/useSession";
import {
  deleteMyBot,
  getMyBots,
} from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OfficialOwnerBadge } from "@/components/OfficialOwnerBadge";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({
        to: "/auth",
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  const bots = useQuery({
    queryKey: ["my-bots", user?.id],
    queryFn: () => getMyBots(),
    enabled: Boolean(user),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isOfficialOwner = Boolean(
    bots.data?.some((bot) => bot.status === "approved"),
  );

  const removeBot = useMutation({
    mutationFn: (id: string) =>
      deleteMyBot({
        data: {
          id,
        },
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-bots"],
      });
    },
  });

  function handleDelete(
    botId: string,
    botName: string,
  ) {
    const confirmed = window.confirm(
      `Delete ${botName}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    removeBot.mutate(botId);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <LayoutDashboard className="h-5 w-5" />

            <span className="text-sm font-medium">
              Developer dashboard
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-bold">
              Your bots
            </h1>

            {isOfficialOwner && <OfficialOwnerBadge />}
          </div>

          <p className="mt-2 text-muted-foreground">
            Manage your Discord bot submissions.
          </p>
        </div>

        <Button asChild>
          <Link to="/dashboard/submit">
            <Plus className="h-4 w-4" />
            Add bot
          </Link>
        </Button>
      </div>

      {bots.isPending && (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {bots.isError && (
        <section className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold">
            Could not load your bots
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Please try again.
          </p>

          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => void bots.refetch()}
          >
            Try again
          </Button>
        </section>
      )}

      {bots.data && bots.data.length === 0 && (
        <section className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground" />

          <h2 className="mt-4 text-xl font-semibold">
            No bots submitted yet
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Submit your first Discord bot to BotGalaxy.
          </p>

          <Button
            asChild
            className="mt-5"
          >
            <Link to="/dashboard/submit">
              <Plus className="h-4 w-4" />
              Submit your first bot
            </Link>
          </Button>
        </section>
      )}

      {bots.data && bots.data.length > 0 && (
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {bots.data.map((bot) => (
            <article
              key={bot.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary">
                  {bot.avatar_url ? (
                    <img
                      src={bot.avatar_url}
                      alt={`${bot.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Bot className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-semibold">
                      {bot.name}
                    </h2>

                    <StatusBadge status={bot.status} />
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {bot.short_description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {bot.verified && (
                  <Badge variant="secondary">
                    Verified
                  </Badge>
                )}

                {bot.featured && (
                  <Badge variant="secondary">
                    Featured
                  </Badge>
                )}

                {bot.premium && (
                  <Badge variant="secondary">
                    Premium
                  </Badge>
                )}
              </div>

              {bot.status === "rejected" &&
                bot.rejection_reason && (
                  <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
                    <span className="font-medium">
                      Rejection reason:
                    </span>{" "}
                    {bot.rejection_reason}
                  </div>
                )}

              <div className="mt-5 flex flex-wrap gap-2">
                {bot.status === "approved" && (
                  <Button
                    asChild
                    size="sm"
                  >
                    <Link
                      to="/bots/$slug"
                      params={{
                        slug: bot.slug,
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View bot
                    </Link>
                  </Button>
                )}

                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                >
                  <Link
                    to="/dashboard/bots/$id/edit"
                    params={{
                      id: bot.id,
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={
                    removeBot.isPending &&
                    removeBot.variables === bot.id
                  }
                  onClick={() =>
                    handleDelete(bot.id, bot.name)
                  }
                >
                  {removeBot.isPending &&
                  removeBot.variables === bot.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}

                  Delete
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {removeBot.isError && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {removeBot.error instanceof Error
            ? removeBot.error.message
            : "Could not delete the bot."}
        </div>
      )}
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  if (status === "approved") {
    return (
      <Badge className="gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </Badge>
    );
  }

  if (status === "rejected") {
    return (
      <Badge
        variant="destructive"
        className="gap-1"
      >
        <XCircle className="h-3.5 w-3.5" />
        Rejected
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="gap-1"
    >
      <Clock3 className="h-3.5 w-3.5" />
      Pending
    </Badge>
  );
}
