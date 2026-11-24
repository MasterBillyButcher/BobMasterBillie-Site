import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl tracking-wide text-primary">404</p>
      <h1 className="mt-3 font-display text-2xl tracking-wide sm:text-3xl">
        This page does not exist.
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The link may be old or mistyped. Everything lives behind the tabs on the main page.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to the Command Center
      </Link>
    </main>
  );
}
