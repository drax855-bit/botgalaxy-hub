import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Search, LogOut, LayoutDashboard, Shield, Plus } from "lucide-react";
import { BotGalaxyLogo } from "./BotGalaxyLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/bots", label: "Explore" },
  { to: "/categories", label: "Categories" },
  { to: "/bots", label: "Top voted", search: { sort: "votes" as const } },
];

export function SiteHeader() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/bots", search: { q: q.trim() || undefined } });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:flex sm:gap-6">
        <Link to="/" className="min-w-0 shrink-0" aria-label="BotGalaxy home">
          <BotGalaxyLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              search={item.search as never}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === item.to && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submit} className="hidden flex-1 md:block" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bots, tags, categories…"
              aria-label="Search bots"
              className="h-10 rounded-xl border-border bg-secondary/60 pl-9"
            />
          </div>
        </form>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/dashboard/submit">
                  <Plus className="h-4 w-4" /> Add bot
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/dashboard/submit">Add your bot</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-sm">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="flex flex-col gap-4 p-4">
              <form onSubmit={submit} role="search">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search bots…"
                  aria-label="Search bots"
                />
              </form>
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                <Link to="/bots" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-secondary">
                  Explore
                </Link>
                <Link
                  to="/categories"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-secondary"
                >
                  Categories
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-secondary"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/submit"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-secondary"
                >
                  Add your bot
                </Link>
              </nav>
              {user ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setOpen(false);
                    navigate({ to: "/", replace: true });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              ) : (
                <Button asChild onClick={() => setOpen(false)}>
                  <Link to="/auth">Sign in</Link>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/70 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BotGalaxyLogo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            An independent directory for discovering the best Discord bots in the galaxy.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Discover</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/bots" className="hover:text-foreground">
                All bots
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-foreground">
                Categories
              </Link>
            </li>
            <li>
              <Link to="/bots" search={{ sort: "newest" }} className="hover:text-foreground">
                Recently added
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Developers</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/dashboard/submit" className="hover:text-foreground">
                Submit a bot
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                Your dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Staff</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/admin" className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Shield className="h-3.5 w-3.5" /> Admin area
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">
        BotGalaxy is a demo directory. Listings shown are seed/demo data and not affiliated with Discord Inc.
      </div>
    </footer>
  );
}
