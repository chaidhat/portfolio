"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface NavPage {
  slug: string;
  title: string;
}
export interface NavChapter {
  id: string;
  title: string;
  pages: NavPage[];
}

export function Sidebar({
  rootPages = [],
  chapters,
}: {
  rootPages?: NavPage[];
  chapters: NavChapter[];
}) {
  const pathname = usePathname();
  // The active page (and the chapter it auto-expands) depends on the URL, which
  // isn't known during static prerender. Defer it to after mount so the server
  // HTML and the first client render are identical — no hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const activeSlug = mounted
    ? decodeURIComponent((pathname || "").replace(/^\/blog\/?/, ""))
    : "";

  // Mobile drawer: hidden by default, toggled open to dominate the screen.
  // Collapse it again whenever the route changes (i.e. after a link tap).
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "✕" : "☰"}
      </button>
      <nav className={open ? "sidebar sidebar--open" : "sidebar"}>
        {rootPages.length > 0 && (
          <ul className="page-list root-pages">
            {rootPages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${encodeURIComponent(p.slug)}`}
                  className={p.slug === activeSlug ? "page-link active" : "page-link"}
                >
                  {p.slug}
                  <span className="page-ext">.md</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {chapters.map((c) => (
          <ChapterGroup key={c.id} chapter={c} activeSlug={activeSlug} />
        ))}
      </nav>
    </>
  );
}

function ChapterGroup({ chapter, activeSlug }: { chapter: NavChapter; activeSlug: string }) {
  const containsActive = chapter.pages.some((p) => p.slug === activeSlug);
  const [open, setOpen] = useState(containsActive);
  // Auto-expand when navigating into this chapter, but don't force it open —
  // so the user can still collapse the chapter they're currently in.
  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);
  const expanded = open;

  return (
    <div className="chapter">
      <button
        className="chapter-title"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
      >
        <span className="chapter-caret">{expanded ? "▾" : "▸"}</span>
        {chapter.title}
      </button>
      {/* always rendered; the wrapper animates between 0fr and 1fr */}
      <div className={expanded ? "page-list-wrap open" : "page-list-wrap"}>
        <ul className="page-list">
          {chapter.pages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${encodeURIComponent(p.slug)}`}
                className={p.slug === activeSlug ? "page-link active" : "page-link"}
              >
                {p.slug}
                <span className="page-ext">.md</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
