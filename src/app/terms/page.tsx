import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | BobMasterBillie Command Center",
  description:
    "Terms and conditions for using the BobMasterBillie Command Center website.",
};

const sections = [
  {
    heading: "What this site is",
    body: [
      "The BobMasterBillie Command Center is a self-hosted operations dashboard for the Twitch channel BobMasterBillie. It stores and displays prediction setups, the bits-goal backlog counter, veto rights, VIP records, the movie backlog and calendar, Twitch and Nightbot command references, moderation application templates, and an activity log of changes made inside the app.",
      "The site is operated by the channel owner for moderation and community management purposes. It is not affiliated with, endorsed by, or operated together with Twitch, Amazon, Nightbot, or any other third-party service named on these pages.",
    ],
  },
  {
    heading: "Accounts and access",
    body: [
      "The Command Center has no public sign-up. There are no user accounts, passwords, or profiles created on this site. Access to the editing features is controlled by whoever hosts the deployment, and they are responsible for deciding who may use it.",
      "If you reach this site as a viewer, you are welcome to browse the public pages. Do not attempt to access, modify, or delete data that was not meant for you, and do not interfere with the operation of the service.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You agree not to misuse the site. That includes attempting to break authentication or rate limits, scraping the site in a way that degrades it for others, injecting malicious content through forms, or using the prediction and command copy features to spam or harass anyone on Twitch or any other platform.",
      "Prediction text, announcements, and command templates shown here are tools for the channel's own streams. Running predictions, polls, or commands on Twitch remains subject to the Twitch Terms of Service and Community Guidelines, which are the responsibility of the channel owner and its moderators.",
    ],
  },
  {
    heading: "Content on the site",
    body: [
      "Movie titles, command syntax, application templates, and community rules shown in the dashboard are operational notes maintained by the channel team. Command syntax for Twitch and Nightbot belongs to those respective services.",
      "The moderation application templates are provided as starting points. Anyone using them is expected to personalize them and is responsible for the claims they make in their own applications.",
    ],
  },
  {
    heading: "Availability and changes",
    body: [
      "The site is hosted on free-tier infrastructure (Vercel with a Supabase Postgres database) and is offered as-is. There is no uptime guarantee, and features may be changed, suspended, or removed at any time. Backups of the data are the responsibility of the operator.",
      "These terms may be updated as the site evolves. The date below reflects the latest revision. Continuing to use the site after a change means you accept the updated terms.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "Questions about these terms, or a takedown request regarding content shown on the site, can be sent through the Twitch channel BobMasterBillie or to whoever operates this deployment.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to Command Center
      </Link>
      <h1 className="font-display mt-4 text-4xl tracking-wide">Terms &amp; Conditions</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: October 20, 2026</p>

      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-base font-semibold tracking-tight">{s.heading}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
      </footer>
    </main>
  );
}
