import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Blog markdown lives in /blog at the repo root (an Obsidian vault). Each
// numbered folder is a "chapter" (section), each .md file is a page. Filenames
// are globally unique so a [[wikilink]] maps to exactly one note.
const MD_ROOT = join(process.cwd(), "blog");

export interface Page {
  slug: string; // filename without .md, globally unique — matches [[wikilink]] targets
  title: string; // derived from the filename — rendered as the page's H1
  chapterId: string; // e.g. "00-welcome"
  filePath: string; // absolute path on disk
  date: string; // frontmatter `date:` (YYYY-MM-DD), or "" — drives chronological order
}

export interface Chapter {
  id: string; // directory name, e.g. "00-welcome"
  order: number; // numeric prefix, e.g. 0
  title: string; // human title, e.g. "Welcome"
  pages: Page[];
}

// ---- helpers -------------------------------------------------------------

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function chapterTitle(id: string): string {
  // strip leading "NN-" then title-case
  const name = id.replace(/^\d+-/, "");
  return titleCaseFromSlug(name);
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

// Reads just the `date` frontmatter for index-time sorting. Missing/unreadable
// → "" (those notes sort to the bottom of the newest-first order).
function readDate(filePath: string): string {
  try {
    return parseFrontmatter(readFileSync(filePath, "utf8")).data.date ?? "";
  } catch {
    return "";
  }
}

// The page's H1 comes from the filename, so an author-written leading "# ..."
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

// ---- index build (cached per process) ------------------------------------

let _index: { chapters: Chapter[]; rootPages: Page[]; bySlug: Map<string, Page> } | null = null;

function buildIndex() {
  if (_index) return _index;

  const chapters: Chapter[] = [];
  const rootPages: Page[] = [];
  const bySlug = new Map<string, Page>();

  let entries: string[] = [];
  try {
    entries = readdirSync(MD_ROOT);
  } catch {
    // no blog/ folder yet — the blog is simply empty
    _index = { chapters, rootPages, bySlug };
    return _index;
  }

  // Top-level .md files (e.g. an Obsidian vault's index note) are pages too —
  // they live in no chapter and lead the reading order.
  const rootFiles = entries.filter((f) => f.endsWith(".md"));
  for (const f of rootFiles) {
    const filePath = join(MD_ROOT, f);
    const slug = f.replace(/\.md$/, "");
    // Title is the raw filename (the slug) — no title-casing, so the page H1
    // and tab title read exactly as the file on disk.
    const page: Page = {
      slug,
      title: slug,
      chapterId: "",
      filePath,
      date: readDate(filePath),
    };
    rootPages.push(page);
    bySlug.set(slug, page);
  }
  // The index note (e.g. "index" or Hugo's "_index") is pinned to the very top;
  // everything else sorts newest-first by its frontmatter `date` (undated notes
  // sink to the bottom).
  const isIndex = (slug: string) => /^_?index$/i.test(slug);
  rootPages.sort((a, b) => {
    if (isIndex(a.slug)) return -1;
    if (isIndex(b.slug)) return 1;
    return (b.date || "").localeCompare(a.date || "");
  });

  const dirs = entries
    .filter((d) => {
      // skip hidden folders like Obsidian's .obsidian config dir
      if (d.startsWith(".")) return false;
      try {
        return statSync(join(MD_ROOT, d)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();

  for (const id of dirs) {
    const dirPath = join(MD_ROOT, id);
    const files = readdirSync(dirPath)
      .filter((f) => f.endsWith(".md"))
      .sort();

    const pages: Page[] = [];
    for (const f of files) {
      const filePath = join(dirPath, f);
      const slug = f.replace(/\.md$/, "");
      const page: Page = { slug, title: slug, chapterId: id, filePath, date: readDate(filePath) };
      pages.push(page);
      bySlug.set(slug, page);
    }

    // Sort pages: a page whose slug matches the chapter name (the chapter's
    // landing note) floats to the top, otherwise newest-first by date.
    const landing = id.replace(/^\d+-/, "");
    pages.sort((a, b) => {
      if (a.slug === landing) return -1;
      if (b.slug === landing) return 1;
      return (b.date || "").localeCompare(a.date || "");
    });

    const m = id.match(/^(\d+)-/);
    chapters.push({
      id,
      order: m ? parseInt(m[1], 10) : 999,
      title: chapterTitle(id),
      pages,
    });
  }

  chapters.sort((a, b) => a.order - b.order);
  _index = { chapters, rootPages, bySlug };
  return _index;
}

export function getChapters(): Chapter[] {
  return buildIndex().chapters;
}

// Top-level pages that belong to no chapter, in reading order before chapters.
export function getRootPages(): Page[] {
  return buildIndex().rootPages;
}

export function getAllPages(): Page[] {
  const { rootPages, chapters } = buildIndex();
  return [...rootPages, ...chapters.flatMap((c) => c.pages)];
}

export function getPage(slug: string): Page | undefined {
  return buildIndex().bySlug.get(slug);
}

// A human "written X ago" string from a YYYY-MM-DD frontmatter date, relative to
// build time. Returns null when there's no date. (Static pages, so it's accurate
// as of the last deploy.)
export function writtenAgo(date: string): string | null {
  if (!date) return null;
  const then = new Date(date);
  if (isNaN(then.getTime())) return null;
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "written today";
  const unit = (n: number, name: string) => `written ${n} ${name}${n === 1 ? "" : "s"} ago`;
  if (days < 30) return unit(days, "day");
  if (days < 365) return unit(Math.floor(days / 30), "month");
  return unit(Math.floor(days / 365), "year");
}

// The page after `slug` in the global reading order (chapters in order, pages
// in their per-chapter order). Returns null if `slug` is the last page.
export function getNextPage(slug: string): Page | null {
  const all = getAllPages();
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1 || i === all.length - 1) return null;
  return all[i + 1];
}

// Expands a {{toc}} token into a bullet list linking to every other page, in
// reading order. Lets a page (e.g. the home note) carry an auto-updating table
// of contents without hardcoding the list — it tracks the files on disk.
function expandToc(markdown: string, currentSlug: string): string {
  if (!markdown.includes("{{toc}}")) return markdown;
  const items = getAllPages()
    .filter((p) => p.slug !== currentSlug)
    .map((p) => `- [${p.title}](/blog/${encodeURIComponent(p.slug)})`)
    .join("\n");
  return markdown.replace(/\{\{toc\}\}/g, items);
}

export function getPageContent(slug: string): { page: Page; markdown: string } | null {
  const page = getPage(slug);
  if (!page) return null;
  const { body } = parseFrontmatter(readFileSync(page.filePath, "utf8"));
  return { page, markdown: stripLeadingH1(rewriteWikilinks(expandToc(body, slug))) };
}

// The default landing page: the first page in the blog, or "" if empty.
export function getHomeSlug(): string {
  return getAllPages()[0]?.slug ?? "";
}

// ---- wikilink rewriting ---------------------------------------------------

// Converts Obsidian-style [[target]] and [[target|display]] into standard
// markdown links pointing at /blog/<target>. Unknown targets become a marked
// broken link so they're visible but don't 404 silently.
export function rewriteWikilinks(markdown: string): string {
  const { bySlug } = buildIndex();
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
    const [targetRaw, displayRaw] = inner.split("|");
    const target = targetRaw.trim();
    const known = bySlug.get(target);
    const display = (displayRaw ?? (known ? known.title : target)).trim();
    if (known) {
      return `[${display}](/blog/${encodeURIComponent(target)})`;
    }
    // broken link: route still goes to /blog/target (which shows a not-found note)
    return `[${display}](/blog/${encodeURIComponent(target)} "missing: ${target}")`;
  });
}
