import { redirect } from "next/navigation";
import { getHomeSlug } from "@/lib/content";

// The blog root lands on the first post.
export default function BlogHome() {
  const slug = getHomeSlug();
  if (!slug) {
    return (
      <div>
        <h1>Nothing here yet</h1>
        <p>The blog is empty. Add a markdown file under <code>content/</code>.</p>
      </div>
    );
  }
  redirect(`/blog/${encodeURIComponent(slug)}`);
}
