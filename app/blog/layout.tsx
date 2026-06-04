import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import "katex/dist/katex.min.css";
import "./blog.css";
import { getChapters, getRootPages } from "@/lib/content";
import { Sidebar } from "./sidebar";

export const metadata: Metadata = {
  title: "Blog · chai",
  description: "Writing by Chaidhat Chaimongkol.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  // strip to a serializable nav shape (no absolute file paths in the client bundle)
  const chapters = getChapters().map((c) => ({
    id: c.id,
    title: c.title,
    pages: c.pages.map((p) => ({ slug: p.slug, title: p.title })),
  }));
  const rootPages = getRootPages().map((p) => ({ slug: p.slug, title: p.title }));
  return (
    <div className="layout">
      <Sidebar rootPages={rootPages} chapters={chapters} />
      <main className="content">
        <nav className="navbar">
          <Link href="/blog" className="navbar-left">
            chaidhat · blog
          </Link>
          <Link href="/" className="navbar-right">
            <ArrowLeftIcon className="navbar-icon" aria-hidden="true" />
            home
          </Link>
        </nav>
        <article className="prose">{children}</article>
      </main>
    </div>
  );
}
