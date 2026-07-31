import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Plus, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-sm font-medium">Developer dashboard</span>
          </div>

          <h1 className="mt-2 font-display text-3xl font-bold">
            Your bots
          </h1>

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

      <section className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold">No bots submitted yet</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Submit your first Discord bot to BotGalaxy.
        </p>

        <Button asChild className="mt-5">
          <Link to="/dashboard/submit">
            <Plus className="h-4 w-4" />
            Submit your first bot
          </Link>
        </Button>
      </section>
    </main>
  );
}
