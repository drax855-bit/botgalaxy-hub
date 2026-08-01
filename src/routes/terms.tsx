import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  Bot,
  ExternalLink,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      {
        title: "Terms of Service — BotGalaxy",
      },
      {
        name: "description",
        content:
          "Read the terms that apply when using BotGalaxy and submitting Discord bots to the directory.",
      },
      {
        property: "og:title",
        content: "Terms of Service — BotGalaxy",
      },
      {
        property: "og:description",
        content:
          "Terms for using the BotGalaxy Discord bot directory.",
      },
    ],
  }),

  component: TermsPage,
});

const updatedDate = "August 1, 2026";

function TermsPage() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-12 sm:px-6">
      <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 text-primary">
          <FileText className="h-5 w-5" />

          <span className="text-sm font-medium">
            Legal
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
          Terms of Service
        </h1>

        <p className="mt-3 leading-relaxed text-muted-foreground">
          These terms explain the rules for using BotGalaxy,
          creating an account and submitting Discord bots to
          the directory.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: {updatedDate}
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <LegalSection
          number="1"
          title="Acceptance of these terms"
        >
          <p>
            By accessing or using BotGalaxy, you agree to these
            Terms of Service. Do not use BotGalaxy if you do not
            agree to these terms.
          </p>
        </LegalSection>

        <LegalSection
          number="2"
          title="About BotGalaxy"
        >
          <p>
            BotGalaxy is an independent directory that helps
            people discover Discord bots. BotGalaxy is not
            Discord and is not officially endorsed by Discord.
          </p>

          <p>
            Discord bot names, logos, trademarks and other
            materials belong to their respective owners.
          </p>
        </LegalSection>

        <LegalSection
          number="3"
          title="Accounts"
        >
          <p>
            You must provide accurate information when creating
            an account. You are responsible for activity performed
            through your account and for keeping your login
            information secure.
          </p>

          <p>
            You may not impersonate another person, developer,
            company or bot owner.
          </p>
        </LegalSection>

        <LegalSection
          number="4"
          title="Bot submissions"
        >
          <p>
            When submitting a bot, you confirm that you are
            authorized to submit and manage that bot or have
            permission from its owner.
          </p>

          <p>
            Submitted information must be accurate and must not
            contain malware, phishing links, scams, illegal
            content, misleading claims or content that violates
            another person&apos;s rights.
          </p>

          <p>
            BotGalaxy may approve, reject, remove, hide or request
            changes to any listing.
          </p>
        </LegalSection>

        <LegalSection
          number="5"
          title="Directory listings"
        >
          <p>
            BotGalaxy may include publicly available directory
            listings for established Discord bots. These listings
            may not be claimed or managed by the bot&apos;s official
            developer.
          </p>

          <p>
            A verified badge means that a listing was reviewed
            according to BotGalaxy&apos;s internal process. It does
            not guarantee that a bot is completely safe, available
            or free from errors.
          </p>
        </LegalSection>

        <LegalSection
          number="6"
          title="Voting, reviews and reports"
        >
          <p>
            Votes and reviews must represent genuine user
            activity. You may not use alternate accounts, bots,
            scripts or other methods to manipulate votes,
            rankings or ratings.
          </p>

          <p>
            Reviews and reports must not include harassment,
            threats, spam, personal information or knowingly
            false claims.
          </p>
        </LegalSection>

        <LegalSection
          number="7"
          title="Prohibited use"
        >
          <p>
            You may not use BotGalaxy to distribute or promote:
          </p>

          <ul className="list-disc space-y-2 pl-5">
            <li>
              Malware, credential theft, phishing or scams
            </li>

            <li>
              Illegal content or illegal services
            </li>

            <li>
              Spam, raids or platform abuse
            </li>

            <li>
              Hate, threats or targeted harassment
            </li>

            <li>
              Stolen, misleading or impersonated bot listings
            </li>

            <li>
              Content that violates Discord&apos;s rules or applicable
              law
            </li>
          </ul>
        </LegalSection>

        <LegalSection
          number="8"
          title="Moderation and account action"
        >
          <p>
            BotGalaxy may warn, restrict, suspend or ban accounts
            that break these terms or create a risk for users or
            the platform.
          </p>

          <p>
            Listings may be removed without notice when urgent
            safety, legal or security concerns exist.
          </p>
        </LegalSection>

        <LegalSection
          number="9"
          title="Third-party bots and links"
        >
          <p>
            BotGalaxy contains links to Discord bots, websites,
            support servers and other third-party services.
            BotGalaxy does not control these services.
          </p>

          <p>
            Review a bot&apos;s permissions and privacy practices
            before adding it to a Discord server. You use
            third-party bots and websites at your own risk.
          </p>
        </LegalSection>

        <LegalSection
          number="10"
          title="Availability and changes"
        >
          <p>
            BotGalaxy may change, suspend or discontinue features
            at any time. We do not guarantee uninterrupted access,
            permanent storage of listings or that every listing
            remains accurate.
          </p>
        </LegalSection>

        <LegalSection
          number="11"
          title="Disclaimer"
        >
          <p>
            BotGalaxy is provided on an “as is” and “as available”
            basis. To the extent permitted by law, BotGalaxy makes
            no warranties regarding availability, accuracy,
            security or fitness for a particular purpose.
          </p>
        </LegalSection>

        <LegalSection
          number="12"
          title="Limitation of liability"
        >
          <p>
            To the extent permitted by law, BotGalaxy and its
            operators will not be responsible for indirect,
            incidental or consequential losses caused by using
            the directory, a listed bot or a third-party link.
          </p>
        </LegalSection>

        <LegalSection
          number="13"
          title="Changes to these terms"
        >
          <p>
            These terms may be updated when BotGalaxy changes or
            when legal and safety requirements change. The updated
            date at the top of this page will show when revisions
            were made.
          </p>
        </LegalSection>

        <LegalSection
          number="14"
          title="Contact"
        >
          <p>
            Questions, ownership requests and legal concerns can
            be submitted through BotGalaxy&apos;s official support
            or contact channel when available.
          </p>
        </LegalSection>
      </div>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div>
            <h2 className="font-semibold">
              Discord rules also apply
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Bots listed on BotGalaxy must also follow Discord&apos;s
              applicable terms, policies and developer requirements.
            </p>

            <Button
              asChild
              variant="secondary"
              size="sm"
              className="mt-4"
            >
              <a
                href="https://discord.com/terms"
                target="_blank"
                rel="noreferrer"
              >
                Discord Terms
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/bots">
            Explore bots
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
