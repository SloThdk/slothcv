/**
 * Site footer — credit + studio link. Intentionally minimal for Phase 1.
 */

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-500 sm:flex-row">
        <p>Free, forever. No watermarks.</p>
        <p>
          Built by{" "}
          <a
            href="https://slothstudioco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-neutral-700 underline-offset-4 hover:underline"
          >
            Sloth Studio
          </a>
        </p>
      </div>
    </footer>
  );
}
