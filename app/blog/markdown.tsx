import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// react-markdown wraps a standalone image in a <p>. We render such images as a
// <figure> (a block element), which is invalid inside a <p> and triggers a
// hydration error — so unwrap any paragraph whose only content is an image.
function rehypeUnwrapImages() {
  type HastNode = { type: string; tagName?: string; value?: string; children?: HastNode[] };
  const isBlank = (n: HastNode) => n.type === "text" && !(n.value ?? "").trim();
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.flatMap((child) => {
        if (child.type === "element" && child.tagName === "p") {
          const meaningful = (child.children ?? []).filter((c) => !isBlank(c));
          if (meaningful.length === 1 && meaningful[0].tagName === "img") {
            return child.children ?? [];
          }
        }
        return [child];
      });
      node.children.forEach(walk);
    };
    walk(tree);
  };
}

// Renders a markdown string with GFM tables, KaTeX math, and internal links.
// Wikilinks have already been rewritten to /blog/<slug> links upstream, so here
// we just route same-origin links through next/link for client navigation.
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeUnwrapImages, rehypeKatex]}
      components={{
        // An image with a title (the "..." after the URL) becomes a captioned
        // <figure>; a bare image stays a plain <img>.
        img({ src, alt, title }) {
          const image = <img src={typeof src === "string" ? src : undefined} alt={alt} />;
          if (!title) return image;
          // The title can carry inline markdown (e.g. *italics*), so render it
          // through ReactMarkdown rather than as plain text.
          return (
            <figure className="md-figure">
              {image}
              <figcaption>
                <ReactMarkdown components={{ p: ({ children }) => <>{children}</> }}>
                  {title}
                </ReactMarkdown>
              </figcaption>
            </figure>
          );
        },
        a({ href, children, title, ...props }) {
          const isInternal = href && href.startsWith("/");
          const broken = typeof title === "string" && title.startsWith("missing:");
          if (isInternal) {
            return (
              <Link href={href} className={broken ? "wikilink broken" : "wikilink"} title={title}>
                {children}
              </Link>
            );
          }
          return (
            <a href={href} title={title} target="_blank" rel="noreferrer" {...props}>
              {children}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
