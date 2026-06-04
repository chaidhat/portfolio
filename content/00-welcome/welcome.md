# Welcome

This is the blog. It renders the markdown files under `content/` the same way
[quantum.chaidhat.com](https://quantum.chaidhat.com) renders its notes — same
engine, separate copy, so the look is free to drift over time.

## How it works

- Each numbered folder in `content/` (like `00-welcome`) is a section in the
  sidebar. Each `.md` file inside it is a page.
- The page title comes from the first `# heading`.
- Obsidian-style wikilinks work: `[[slug]]` or `[[slug|display text]]` link to
  another post by its filename.

## What you can write

Math renders with KaTeX, inline like $e^{i\pi} + 1 = 0$ and as a block:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

Tables, code, and quotes all work too:

| feature   | supported |
| --------- | --------- |
| math      | yes       |
| tables    | yes       |
| wikilinks | yes       |

> Replace this file with your first real post.

To add a post, drop a new `.md` file under a folder in `content/`.
