import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./blog.css";
import { getChapters } from "@/lib/content";
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
  return (
    <div className="layout">
      <Sidebar chapters={chapters} />
      <main className="content">
        <nav className="navbar">
          <Link href="/blog" className="navbar-left">
            chai · blog
          </Link>
          <Link href="/" className="navbar-right">
            ← home
          </Link>
        </nav>
        <article className="prose">{children}</article>
      </main>
    </div>
  );
}
