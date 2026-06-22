"use client";

import { useEffect, useState } from "react";
import { writtenAgo } from "@/lib/relative-time";

// Shows "written X ago", recomputed against the visitor's clock. `initial` is the
// build-time value the server rendered: we start from it so the first client
// render matches the SSR HTML (no hydration mismatch, no layout shift, works with
// JS off), then refresh to the real current date on mount — so it's accurate on
// every load, not just as of the last deploy.
export function WrittenAgo({ date, initial }: { date: string; initial: string | null }) {
  const [text, setText] = useState(initial);
  useEffect(() => setText(writtenAgo(date, Date.now())), [date]);
  if (!text) return null;
  return <p className="page-date">{text}</p>;
}
