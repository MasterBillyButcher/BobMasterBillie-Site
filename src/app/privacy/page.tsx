import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | BobMasterBillie Command Center",
  description:
    "Privacy policy for the BobMasterBillie Command Center website: what data is stored, why, and the choices available.",
};

const sections = [
  {
    heading: "Overview",
    body: [
      "This privacy policy describes how the BobMasterBillie Command Center handles information. The short version: the site stores the channel's own operational data (predictions, backlog counts, vetoes, VIP records, movie notes, and activity logs) in a database controlled by the channel owner. It does not run advertising, does not sell data, and does not track visitors across other websites.",
    ],
  },
  {
    heading: "Data this site stores",
    body: [
      "Operational records entered by the channel team: prediction titles, options, and outcomes; backlog events such as bits goals completed and movies watched; veto rights per viewer; VIP membership and monthly event records; movie titles, statuses, and planned or watched dates; announcements; and manual activity log notes. Each record also stores a timestamp so the activity log can show when a change happened.",
      "Viewer names that appear on the site (for example on the veto board or in notes) are public Twitch usernames used for moderation bookkeeping. No Twitch login, email address, password, payment detail, or direct-message content is collected through this site.",
    ],
  },
  {
    heading: "No accounts, no tracking",
    body: [
      "The site has no sign-up and no user accounts. It sets no analytics cookies, loads no advertising scripts, and includes no third-party trackers. Browsing the site leaves only the standard server request logs kept by the hosting platform (Vercel), which are governed by Vercel's own privacy terms.",
    ],
  },
  {
    heading: "Where data lives",
    body: [
      "The database runs on Supabase Postgres (free tier) and the site is served by Vercel. Both are operated under accounts controlled by the channel owner. Data may therefore be stored on infrastructure located outside your country. In local development the same data can live in a SQLite file on the operator's machine.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "If your Twitch username appears on the veto board, the VIP board, or inside a note, and you would like it removed, contact the channel (for example through a Twitch whisper or chat message to a moderator) and ask for the entry to be deleted. The channel team can edit or delete any record directly in the dashboard, and deletions are permanent.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "This policy may be updated when the site's data handling changes. The revision date below always reflects the current version. For questions about privacy on this site, reach the channel through Twitch or contact whoever operates this deployment.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Back to Command Center
      </Link>
      <h1 className="font-display mt-4 text-4xl tracking-wide">Privacy Policy</h1>
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
        <Link href="/terms" className="hover:text-foreground">
          Terms &amp; Conditions
        </Link>
      </footer>
    </main>
  );
}
