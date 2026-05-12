/**
 * Parses a multi-section detailed summary string into structured sections.
 *
 * Convention used by scrapers:
 *   <Section Heading>\n
 *   <Paragraph or bulleted body…>\n
 *   \n
 *   <Next Section Heading>\n
 *   <…>
 *
 * A "section heading" is a single short line (≤80 chars) that does NOT start with
 * a bullet character (•, -, *) or a digit. Anything else is body content.
 */
export type DetailSection = {
  heading: string | null;
  body: string;
};

const BULLET_PREFIXES = ["•", "-", "*", "·", "—", "–"];

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  if (BULLET_PREFIXES.some((p) => trimmed.startsWith(p))) return false;
  if (/^\d/.test(trimmed)) return false; // numbered list item ("1. …")
  if (trimmed.endsWith(":")) return true; // explicit heading ("Eligible models:")
  // No terminal punctuation that suggests a sentence
  if (/[.!?]$/.test(trimmed)) return false;
  // Looks like a heading: short, no period, not bullet
  return true;
}

export function parseDetailedSummary(raw: string): DetailSection[] {
  const lines = raw.split(/\r?\n/);
  const sections: DetailSection[] = [];
  let currentHeading: string | null = null;
  let bodyBuffer: string[] = [];

  const flush = () => {
    const body = bodyBuffer.join("\n").trim();
    if (currentHeading || body) {
      sections.push({ heading: currentHeading, body });
    }
    bodyBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const isHeading =
      looksLikeHeading(line) &&
      // Heading must be followed by non-empty content (otherwise it's just a stray short line)
      next !== undefined &&
      next.trim().length > 0;

    if (isHeading) {
      flush();
      currentHeading = line.trim().replace(/:$/, "");
    } else {
      bodyBuffer.push(line);
    }
  }
  flush();
  return sections;
}
