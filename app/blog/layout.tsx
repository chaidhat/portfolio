import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";
import "katex/dist/katex.min.css";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog · chai",
  description: "Writing by Chaidhat Chaimongkol.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="reader">
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
        <div className="prose">{children}</div>
      </main>
    </div>
  );
}
