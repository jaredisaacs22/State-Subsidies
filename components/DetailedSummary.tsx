import { parseDetailedSummary, sectionAnchor } from "@/lib/parseDetailedSummary";

const BULLET_RE = /^[\s]*[•·*\-–—]\s+/;

/**
 * Renders a long-form `detailedSummary` string as structured sections.
 * Recognises:
 *   - section headings (one short line followed by body content)
 *   - bulleted lists (lines starting with •, -, *)
 *   - numbered lists (lines starting with "1.", "2.", …)
 *   - plain paragraphs (joined runs of non-bullet, non-empty lines)
 */
export function DetailedSummary({ text }: { text: string }) {
  const sections = parseDetailedSummary(text);

  return (
    <div className="space-y-6">
      {sections.map((section, idx) => (
        <section key={idx} id={section.heading ? sectionAnchor(section.heading) : undefined} className="scroll-mt-24">
          {section.heading && (
            <h3 className="text-[15px] font-semibold text-slate-900 mb-2 leading-snug">
              {section.heading}
            </h3>
          )}
          <SectionBody body={section.body} />
        </section>
      ))}
    </div>
  );
}

function SectionBody({ body }: { body: string }) {
  // Group consecutive bullet lines into a single <ul>; paragraphs are flushed between groups.
  const blocks: Array<{ type: "bullets" | "paragraph"; lines: string[] }> = [];
  const lines = body.split(/\r?\n/);
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    const joined = currentParagraph.join(" ").trim();
    if (joined) blocks.push({ type: "paragraph", lines: [joined] });
    currentParagraph = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (BULLET_RE.test(line)) {
      flushParagraph();
      const bulletGroup: string[] = [];
      while (i < lines.length && BULLET_RE.test(lines[i])) {
        bulletGroup.push(lines[i].replace(BULLET_RE, ""));
        i++;
      }
      blocks.push({ type: "bullets", lines: bulletGroup });
    } else if (line.trim() === "") {
      flushParagraph();
      i++;
    } else {
      currentParagraph.push(line.trim());
      i++;
    }
  }
  flushParagraph();

  return (
    <div className="space-y-3 text-[14.5px] text-slate-700 leading-relaxed">
      {blocks.map((b, j) =>
        b.type === "bullets" ? (
          <ul key={j} className="space-y-1.5 pl-1">
            {b.lines.map((bl, k) => (
              <li key={k} className="flex gap-2.5">
                <span className="text-forest-600 mt-1.5 flex-shrink-0" aria-hidden>
                  <span className="block w-1.5 h-1.5 rounded-full bg-current" />
                </span>
                <span>{bl.trim()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={j}>{b.lines[0]}</p>
        )
      )}
    </div>
  );
}
