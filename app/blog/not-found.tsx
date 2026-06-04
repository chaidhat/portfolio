import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>This post doesn’t exist (yet).</p>
      <p>
        <Link href="/blog">← Back to the blog</Link>
      </p>
    </div>
  );
}
