import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

// Blog markdown lives in /blog at the repo root (an Obsidian vault). Every .md
// file is one post; they're all rendered onto a single scrolling page in
// chronological order. Filenames are globally unique so a [[wikilink]] maps to
// exactly one note.
const MD_ROOT = join(process.cwd(), "blog");

export interface Post {
  slug: string; // filename without .md, globally unique — matches [[wikilink]] targets
  title: string; // the raw filename — rendered as the post's H1
  filePath: string; // absolute path on disk
  date: string; // frontmatter `date:` (YYYY-MM-DD), or "" — drives chronological order
  anchor: string; // url-safe id, so /blog#<anchor> jumps to this post
}

// ---- helpers -------------------------------------------------------------

// A url-safe fragment id derived from the slug, e.g. "Humans as Functions" ->
// "humans-as-functions". Lets [[wikilinks]] and direct links scroll to a post.
function slugToAnchor(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Minimal YAML-ish frontmatter parser: pulls simple `key: value` pairs from a
// leading `---`-delimited block. Enough for the optional `date:` we sort by;
// returns the remaining body so the delimiters never reach the renderer.
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) data[key] = val;
  }
  return { data, body: raw.slice(m[0].length) };
}

// Reads just the `date` frontmatter for sorting. Missing/unreadable → "".
function readDate(filePath: string): string {
  try {
    return parseFrontmatter(readFileSync(filePath, "utf8")).data.date ?? "";
  } catch {
    return "";
  }
}

// Each post's H1 comes from the filename, so an author-written leading "# ..."
// would render as a duplicate title. Drop it (and any blank lines above it).
function stripLeadingH1(markdown: string): string {
  const lines = markdown.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim().length === 0) i++;
  if (i < lines.length && lines[i].trim().startsWith("# ")) {
    return lines.slice(i + 1).join("\n").replace(/^\n+/, "");
  }
  return markdown;
}

// Recursively collect every .md path under `dir`, skipping hidden folders like
// Obsidian's .obsidian config dir.
function gatherMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const p = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(p).isDirectory();
    } catch {
      continue;
    }
    if (isDir) out.push(...gatherMarkdown(p));
    else if (entry.endsWith(".md")) out.push(p);
  }
  return out;
}

// ---- index build (cached per process) ------------------------------------

let _posts: Post[] | null = null;

function buildIndex(): Post[] {
  if (_posts) return _posts;

  let files: string[] = [];
  try {
    files = gatherMarkdown(MD_ROOT);
  } catch {
    // no blog/ folder yet — the blog is simply empty
    _posts = [];
    return _posts;
  }

  const posts: Post[] = files
    .map((filePath) => {
      const slug = basename(filePath).replace(/\.md$/, "");
      // Title is the raw filename (the slug) — no title-casing, so the H1 reads
      // exactly as the file on disk.
      return { slug, title: slug, filePath, date: readDate(filePath), anchor: slugToAnchor(slug) };
    })
    // drop any leftover index note (e.g. "index" / Hugo's "_index")
    .filter((p) => !/^_?index$/i.test(p.slug));

  // Reverse-chronological: newest first, oldest last. Undated notes sink to the
  // bottom.
  posts.sort((a, b) => {
    if (!a.date && !b.date) return a.slug.localeCompare(b.slug);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  _posts = posts;
  return posts;
}

// ---- public API ----------------------------------------------------------

export function getAllPosts(): Post[] {
  return buildIndex();
}

// Every post with its rendered-ready markdown body (frontmatter stripped,
// duplicate H1 removed, wikilinks rewritten), in chronological order.
export function getRenderedPosts(): { post: Post; markdown: string }[] {
  return buildIndex().map((post) => {
    const { body } = parseFrontmatter(readFileSync(post.filePath, "utf8"));
    return { post, markdown: rewriteWikilinks(stripLeadingH1(body)) };
  });
}

// ---- wikilink rewriting ---------------------------------------------------

// Converts Obsidian-style [[target]] and [[target|display]] into in-page anchor
// links (#<anchor>) — every post lives on the one /blog page now. Unknown
// targets become a marked broken link so they're visible but don't break.
export function rewriteWikilinks(markdown: string): string {
  const bySlug = new Map(buildIndex().map((p) => [p.slug, p]));
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const [targetRaw, displayRaw] = inner.split("|");
    const target = targetRaw.trim();
    const known = bySlug.get(target);
    const display = (displayRaw ?? (known ? known.title : target)).trim();
    if (known) {
      return `[${display}](#${known.anchor})`;
    }
    return `[${display}](#${slugToAnchor(target)} "missing: ${target}")`;
  });
}
