import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, LockKeyhole, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) throw signInError;

        navigate({ to: "/dashboard", replace: true });
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (signUpError) throw signUpError;

        setMessage(
          "Account created. Check your email and verify your account before signing in.",
        );
        return;
      }

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });

      if (resetError) throw resetError;

      setMessage("Password reset email sent. Check your inbox.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {mode === "signup" ? (
              <UserPlus className="h-6 w-6" />
            ) : mode === "forgot" ? (
              <Mail className="h-6 w-6" />
            ) : (
              <LockKeyhole className="h-6 w-6" />
            )}
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold">
            {mode === "signin"
              ? "Sign in to BotGalaxy"
              : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Manage your bots, votes and submissions."
              : mode === "signup"
                ? "Join BotGalaxy and submit your Discord bot."
                : "Enter your email and we will send you a reset link."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium"
              >
                Username
              </label>

              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your username"
                minLength={3}
                maxLength={30}
                required
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email
            </label>

            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
              {message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset email"}
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          {mode === "signin" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setMessage("");
                }}
                className="text-primary hover:underline"
              >
                Forgot your password?
              </button>

              <p className="text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                    setMessage("");
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </button>
              </p>
            </>
          )}

          {mode === "signup" && (
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError("");
                  setMessage("");
                }}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
                setMessage("");
              }}
              className="text-primary hover:underline"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
