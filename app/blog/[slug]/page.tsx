import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { getAllPages, getPageContent, getPage, getNextPage } from "@/lib/content";
import { Markdown } from "../markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getPage(decodeURIComponent(slug));
  return { title: page ? `${page.title} · chai` : "Not found" };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const result = getPageContent(decoded);
  if (!result) notFound();
  const next = getNextPage(decoded);
  return (
    <>
      <h1 className="page-title">{result.page.title}</h1>
      <Markdown>{result.markdown}</Markdown>
      <nav className="page-next">
        {next ? (
          <Link href={`/blog/${encodeURIComponent(next.slug)}`} className="page-next-link">
            {next.title}
            <ArrowRightIcon className="page-next-icon" aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
    </>
  );
}
