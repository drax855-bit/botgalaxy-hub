import {
  type FormEvent,
  useEffect,
  useState,
} from "react";
import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  CheckCircle2,
  LifeBuoy,
  Loader2,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import {
  submitContactRequest,
  type ContactIssueType,
} from "@/lib/contact.functions";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ISSUE_OPTIONS: Array<{
  value: ContactIssueType;
  label: string;
}> = [
  {
    value: "general",
    label: "General question",
  },
  {
    value: "bot_ownership",
    label: "Bot ownership or listing help",
  },
  {
    value: "account",
    label: "Account problem",
  },
  {
    value: "report",
    label: "Safety or abuse report",
  },
  {
    value: "partnership",
    label: "Partnership or business",
  },
  {
    value: "other",
    label: "Something else",
  },
];

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      {
        title: "Contact support — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Contact BotGalaxy for account help, bot listing support, ownership questions, reports and partnerships.",
      },
    ],
  }),

  component: ContactPage,
});

function ContactPage() {
  const { user } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issueType, setIssueType] =
    useState<ContactIssueType>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt, setStartedAt] = useState(() =>
    Date.now(),
  );

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      await submitContactRequest({
        data: {
          name,
          email,
          issueType,
          subject,
          message,
          website,
          startedAt,
        },
      });

      setSubject("");
      setMessage("");
      setWebsite("");
      setStartedAt(Date.now());

      setSuccess(
        "Your message was sent successfully. BotGalaxy staff can now review it.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Your message could not be sent.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="h-6 w-6" />
          </div>

          <h1 className="mt-5 font-display text-3xl font-bold sm:text-4xl">
            Contact BotGalaxy
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Send a message about your account, a bot listing,
            ownership, safety concerns or a possible partnership.
          </p>

          <div className="mt-8 space-y-4">
            <InfoCard
              icon={<Mail className="h-5 w-5" />}
              title="Messages go to staff"
              description="Your request is stored privately and is not shown publicly."
            />

            <InfoCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Do not send secrets"
              description="Never include passwords, Discord tokens, backup codes or payment details."
            />

            <InfoCard
              icon={
                <MessageSquareText className="h-5 w-5" />
              }
              title="Give useful details"
              description="Include the bot name, account username or page link when it helps explain the problem."
            />
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
            By submitting this form, you agree that BotGalaxy may
            use the information to answer and investigate your
            request. Read the{" "}
            <Link
              to="/privacy"
              className="text-primary hover:underline"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              to="/terms"
              className="text-primary hover:underline"
            >
              Terms
            </Link>
            .
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-5 sm:p-7"
        >
          <h2 className="text-xl font-bold">
            Send a support request
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Your name" htmlFor="contact-name">
              <Input
                id="contact-name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
              />
            </Field>

            <Field label="Email address" htmlFor="contact-email">
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                maxLength={254}
                required
              />
            </Field>
          </div>

          <div className="mt-5">
            <label
              htmlFor="contact-type"
              className="text-sm font-medium"
            >
              What do you need help with?
            </label>

            <select
              id="contact-type"
              value={issueType}
              onChange={(event) =>
                setIssueType(
                  event.target.value as ContactIssueType,
                )
              }
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {ISSUE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <Field label="Subject" htmlFor="contact-subject">
              <Input
                id="contact-subject"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                minLength={4}
                maxLength={120}
                required
              />
            </Field>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="contact-message"
                className="text-sm font-medium"
              >
                Message
              </label>

              <span className="text-xs text-muted-foreground">
                {message.length}/3000
              </span>
            </div>

            <textarea
              id="contact-message"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder="Explain the issue and include any useful bot name, username or page link."
              minLength={20}
              maxLength={3000}
              required
              className="mt-2 min-h-44 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div
            aria-hidden="true"
            className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="contact-website">
              Website
            </label>

            <input
              id="contact-website"
              value={website}
              onChange={(event) =>
                setWebsite(event.target.value)
              }
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {success && (
            <div className="mt-5 flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-6 w-full"
            disabled={submitting}
          >
            {submitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            Send message
          </Button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium"
      >
        {label}
      </label>

      <div className="mt-2">{children}</div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <div className="mt-0.5 text-primary">{icon}</div>

      <div>
        <h2 className="font-semibold">{title}</h2>

        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
