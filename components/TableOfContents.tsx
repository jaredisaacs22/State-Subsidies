"use client";

import { useEffect, useState } from "react";
import { parseDetailedSummary, sectionAnchor } from "@/lib/parseDetailedSummary";

/**
 * In-page table of contents that auto-generates from `detailedSummary` section
 * headings. Renders nothing unless there are 3+ headings (otherwise the TOC
 * adds visual noise without value). Tracks the active section via
 * IntersectionObserver so the current heading is highlighted while scrolling.
 */
export function TableOfContents({ text }: { text: string }) {
  const sections = parseDetailedSummary(text).filter((s) => s.heading);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (sections.length < 3) return;
    const ids = sections.map((s) => sectionAnchor(s.heading!));
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting entry; fall back to the closest above viewport
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 3) return null;

  return (
    <nav aria-label="Program sections" className="card p-4">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
        On this page
      </p>
      <ul className="space-y-1.5">
        {sections.map((s) => {
          const id = sectionAnchor(s.heading!);
          const active = activeId === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                className={
                  "block text-[12.5px] leading-snug py-1 pl-2.5 -ml-px border-l-2 transition-all " +
                  (active
                    ? "border-forest-600 text-forest-700 font-semibold"
                    : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800")
                }
              >
                {s.heading}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
