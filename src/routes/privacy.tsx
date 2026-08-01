import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  Database,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      {
        title: "Privacy Policy — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Learn what information BotGalaxy collects, why it is used and how users can manage their data.",
      },
      {
        property: "og:title",
        content: "Privacy Policy — BotGalaxy",
      },
      {
        property: "og:description",
        content:
          "Privacy information for the BotGalaxy Discord bot directory.",
      },
    ],
  }),

  component: PrivacyPage,
});

const updatedDate = "August 1, 2026";

function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-12 sm:px-6">
      <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />

          <span className="text-sm font-medium">
            Legal
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
          Privacy Policy
        </h1>

        <p className="mt-3 leading-relaxed text-muted-foreground">
          This policy explains what information BotGalaxy
          collects, how that information is used and the choices
          available to users.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: {updatedDate}
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <LegalSection
          number="1"
          title="Information you provide"
        >
          <p>
            When you create an account or update your profile,
            BotGalaxy may store information such as your email
            address, username, profile picture and biography.
          </p>

          <p>
            When submitting a bot, BotGalaxy may store the bot
            name, client ID, logo, descriptions, categories,
            tags, invite link, website, support-server link,
            prefix and owner name.
          </p>

          <p>
            Reviews, reports, votes and other content you submit
            may also be stored with your account identifier.
          </p>
        </LegalSection>

        <LegalSection
          number="2"
          title="Account and authentication information"
        >
          <p>
            BotGalaxy uses Supabase to provide authentication,
            account sessions and database services.
          </p>

          <p>
            Authentication providers may process information
            needed to sign you in, secure your session and prevent
            unauthorized access.
          </p>

          <p>
            BotGalaxy does not display your email address publicly
            unless you intentionally place it in public content.
          </p>
        </LegalSection>

        <LegalSection
          number="3"
          title="Automatically collected information"
        >
          <p>
            BotGalaxy may collect limited technical information
            when you use the website, including page visits,
            searches, votes, submissions and interactions with
            directory features.
          </p>

          <p>
            This information may be connected with a bot listing
            or anonymous session and is used to understand how the
            directory is used.
          </p>
        </LegalSection>

        <LegalSection
          number="4"
          title="How information is used"
        >
          <p>
            BotGalaxy may use information to:
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>
              Create and manage user accounts
            </li>

            <li>
              Display and review bot submissions
            </li>

            <li>
              Process votes, reviews and reports
            </li>

            <li>
              Moderate users and bot listings
            </li>

            <li>
              Prevent spam, fraud and platform abuse
            </li>

            <li>
              Improve search, rankings and site features
            </li>

            <li>
              Investigate security or legal concerns
            </li>
          </ul>
        </LegalSection>

        <LegalSection
          number="5"
          title="Public information"
        >
          <p>
            Usernames, profile pictures, biographies, reviews and
            approved bot listings may be publicly visible.
          </p>

          <p>
            Bot listings may display the bot owner name,
            description, logo, categories, tags, website,
            support link, ratings, votes and other listing
            information.
          </p>

          <p>
            Do not submit personal or confidential information
            in fields intended to be public.
          </p>
        </LegalSection>

        <LegalSection
          number="6"
          title="Bot listings not claimed by developers"
        >
          <p>
            BotGalaxy may create directory listings using
            publicly available information from official bot
            websites and services.
          </p>

          <p>
            These listings may have no connected BotGalaxy owner
            account. Official developers may contact BotGalaxy
            regarding corrections, ownership or removal.
          </p>
        </LegalSection>

        <LegalSection
          number="7"
          title="Sharing of information"
        >
          <p>
            BotGalaxy does not sell personal information.
          </p>

          <p>
            Information may be processed by service providers
            needed to operate the website, such as hosting,
            database, authentication and security providers.
          </p>

          <p>
            Information may also be disclosed when reasonably
            required to follow the law, respond to valid legal
            requests, prevent harm or protect BotGalaxy and its
            users.
          </p>
        </LegalSection>

        <LegalSection
          number="8"
          title="Storage and security"
        >
          <p>
            BotGalaxy uses reasonable technical and organizational
            measures to protect stored information, including
            access controls and account-based permissions.
          </p>

          <p>
            No internet service can guarantee complete security.
            Users should protect their passwords, email accounts
            and active login sessions.
          </p>
        </LegalSection>

        <LegalSection
          number="9"
          title="Data retention"
        >
          <p>
            Account information and submitted content may be kept
            while your account or listing remains active.
          </p>

          <p>
            Some records may be kept after deletion when necessary
            for moderation logs, fraud prevention, security,
            backups or legal requirements.
          </p>
        </LegalSection>

        <LegalSection
          number="10"
          title="Your choices"
        >
          <p>
            You may update available profile information through
            your BotGalaxy account.
          </p>

          <p>
            Bot owners may edit or delete their submitted listings
            through the developer dashboard where those controls
            are available.
          </p>

          <p>
            You may request correction or deletion of personal
            information by contacting BotGalaxy through its
            official support channel when available.
          </p>
        </LegalSection>

        <LegalSection
          number="11"
          title="Cookies and local storage"
        >
          <p>
            BotGalaxy and its service providers may use cookies
            or browser storage required for authentication,
            security, preferences and active account sessions.
          </p>

          <p>
            Blocking required storage may prevent login or other
            account features from working correctly.
          </p>
        </LegalSection>

        <LegalSection
          number="12"
          title="Third-party services"
        >
          <p>
            BotGalaxy contains links to Discord bots, invite
            pages, support servers and external websites.
          </p>

          <p>
            Those services have their own privacy practices.
            BotGalaxy is not responsible for how third-party bots
            or websites collect and use information.
          </p>
        </LegalSection>

        <LegalSection
          number="13"
          title="Children and younger users"
        >
          <p>
            Users must meet the minimum age required by applicable
            law and by Discord&apos;s rules to use relevant Discord
            services.
          </p>

          <p>
            Do not submit sensitive personal information such as
            a home address, school details, private phone number
            or government identification.
          </p>
        </LegalSection>

        <LegalSection
          number="14"
          title="Policy changes"
        >
          <p>
            This Privacy Policy may be updated when BotGalaxy adds
            features, changes service providers or updates its
            legal and security practices.
          </p>

          <p>
            The date at the top of this page shows the latest
            revision.
          </p>
        </LegalSection>

        <LegalSection
          number="15"
          title="Contact"
        >
          <p>
            Privacy questions, correction requests and deletion
            requests can be sent through BotGalaxy&apos;s official
            support or contact channel when available.
          </p>
        </LegalSection>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <InfoCard
          icon={
            <LockKeyhole className="h-5 w-5" />
          }
          title="Protected access"
          description="Account permissions are used to limit access to private account and admin information."
        />

        <InfoCard
          icon={
            <Database className="h-5 w-5" />
          }
          title="Stored securely"
          description="BotGalaxy uses managed database and authentication services to operate the platform."
        />

        <InfoCard
          icon={
            <ShieldCheck className="h-5 w-5" />
          }
          title="No data sales"
          description="BotGalaxy does not sell users' personal information."
        />
      </section>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="font-semibold">
          Third-party privacy information
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          BotGalaxy uses third-party infrastructure, including
          Supabase and Vercel, to provide authentication, database
          and hosting services.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            asChild
            variant="secondary"
            size="sm"
          >
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Supabase Privacy
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>

          <Button
            asChild
            variant="secondary"
            size="sm"
          >
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noreferrer"
            >
              Vercel Privacy
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/terms">
            Read Terms of Service
          </Link>
        </Button>

        <Button
          asChild
          variant="secondary"
        >
          <Link to="/">
            Return home
          </Link>
        </Button>
      </div>
    </main>
  );
}

function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
          {number}
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </section>
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
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <h2 className="mt-4 font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </article>
  );
}
