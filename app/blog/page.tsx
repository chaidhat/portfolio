import { getRenderedPosts } from "@/lib/content";
import { writtenAgo } from "@/lib/relative-time";
import { Markdown } from "./markdown";
import { WrittenAgo } from "./written-ago";

// The blog is a single scrolling page: every post, oldest first, top to bottom.
export default function BlogHome() {
  const posts = getRenderedPosts();
  if (posts.length === 0) {
    return (
      <div>
        <h1>Nothing here yet</h1>
        <p>
          The blog is empty. Add a markdown file under <code>blog/</code>.
        </p>
      </div>
    );
  }
  return (
    <>
      {posts.map(({ post, markdown }) => (
        <article key={post.slug} id={post.anchor} className="post">
          <h1 className="page-title">{post.title}</h1>
          <WrittenAgo date={post.date} initial={writtenAgo(post.date, Date.now())} />
          <Markdown>{markdown}</Markdown>
        </article>
      ))}
    </>
  );
}
