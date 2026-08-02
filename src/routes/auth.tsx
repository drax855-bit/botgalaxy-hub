import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create your BotGalaxy account" },
      {
        name: "description",
        content:
          "Sign in to BotGalaxy to submit Discord bots, vote, review and manage your listings. Create an account or reset your password.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign in to BotGalaxy" },
      {
        property: "og:description",
        content:
          "Access your BotGalaxy account to manage bot submissions, votes and reviews.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "recovery";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;

function cleanAuthUrl() {
  window.history.replaceState({}, document.title, window.location.pathname);
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("botgalaxy_email");

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Classify the auth callback: explicit mode/type first, code= last.
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );

    const explicitMode = search.get("mode");
    const type = search.get("type") ?? hash.get("type");

    if (explicitMode === "recovery" || type === "recovery") {
      setRecovering(true);
      setMode("recovery");
      setMessage("Choose a new password for your account.");
      return;
    }

    if (explicitMode === "confirmed" || type === "signup") {
      setConfirmed(true);
      setMessage("Email confirmed successfully. You are now signed in.");
      cleanAuthUrl();
      return;
    }

    const looksLikeCallback =
      hash.has("access_token") || search.has("code");

    if (looksLikeCallback) {
      setConfirmed(true);
      setMessage("Email confirmed successfully. You are now signed in.");
      cleanAuthUrl();
    }
  }, []);

  // Supabase emits PASSWORD_RECOVERY once the recovery link is exchanged.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setConfirmed(false);
        setRecovering(true);
        setMode("recovery");
        setMessage("Choose a new password for your account.");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect signed-in users to the dashboard on confirmation, never mid-recovery.
  useEffect(() => {
    if (loading || recovering) return;

    if (confirmed && user) {
      const timer = window.setTimeout(() => {
        navigate({ to: "/dashboard", replace: true });
      }, 2000);

      return () => window.clearTimeout(timer);
    }

    if (!confirmed && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, user, confirmed, recovering, navigate]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "recovery") {
        if (newPassword.length < 8) {
          throw new Error("Your new password must be at least 8 characters.");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("Both passwords must match.");
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) throw updateError;

        await supabase.auth.signOut();

        cleanAuthUrl();

        setRecovering(false);
        setConfirmed(false);
        setMode("signin");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setMessage(
          "Password updated successfully. Sign in with your new password.",
        );
        return;
      }

      if (mode === "signin") {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (signInError) throw signInError;

        if (rememberMe) {
          localStorage.setItem("botgalaxy_email", email.trim());
        } else {
          localStorage.removeItem("botgalaxy_email");
        }

        navigate({ to: "/dashboard", replace: true });
        return;
      }

      if (mode === "signup") {
        const handle = username.trim();

        if (!USERNAME_PATTERN.test(handle)) {
          throw new Error(
            "Usernames must be 3–24 characters and use only letters, numbers and underscores.",
          );
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: handle,
            },
            emailRedirectTo: `${window.location.origin}/auth?mode=confirmed`,
          },
        });

        if (signUpError) throw signUpError;

        setMessage(
          "Account created. Check your email and click the confirmation link.",
        );
        return;
      }

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=recovery`,
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

  if (loading && !recovering) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (confirmed && !recovering) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />

          <h1 className="mt-5 font-display text-2xl font-bold">
            Email confirmed successfully
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            You are now signed in. Redirecting you to your dashboard...
          </p>

          <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-primary" />
        </div>
      </main>
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
            ) : mode === "recovery" ? (
              <KeyRound className="h-6 w-6" />
            ) : (
              <LockKeyhole className="h-6 w-6" />
            )}
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold">
            {mode === "signin"
              ? "Sign in to BotGalaxy"
              : mode === "signup"
                ? "Create your account"
                : mode === "recovery"
                  ? "Set a new password"
                  : "Reset your password"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Manage your bots, votes and submissions."
              : mode === "signup"
                ? "Join BotGalaxy and submit your Discord bot."
                : mode === "recovery"
                  ? "Enter a new password to finish recovering your account."
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
                placeholder="3–24 letters, numbers or _"
                minLength={3}
                maxLength={24}
                required
              />
            </div>
          )}

          {mode !== "recovery" && (
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
          )}

          {(mode === "signin" || mode === "signup") && (
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                  className="pr-11"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === "recovery" && (
            <>
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium"
                >
                  New password
                </label>

                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                    className="pr-11"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm new password
                </label>

                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Re-enter your new password"
                  minLength={8}
                  required
                />
              </div>
            </>
          )}

          {mode === "signin" && (
            <div className="flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={() => changeMode("forgot")}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
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
                : mode === "recovery"
                  ? "Update password"
                  : "Send reset email"}
          </Button>
        </form>

        <div className="mt-6 space-y-3 text-center text-sm">
          {mode === "signin" && (
            <p className="text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => changeMode("signup")}
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === "signup" && (
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => changeMode("signin")}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => changeMode("signin")}
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
