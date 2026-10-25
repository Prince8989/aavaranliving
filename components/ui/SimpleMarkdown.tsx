import type { ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for journal articles: "## " headings, "- " lists, **bold**,
 * and paragraphs. Output is built from React elements — no raw HTML is ever injected.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-aavaran">
      {blocks.map((block, i) => {
        const b = block.trim();
        if (!b) return null;
        if (b.startsWith("## ")) return <h2 key={i}>{inline(b.slice(3))}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (lines[0].startsWith("## ")) {
          return (
            <div key={i}>
              <h2>{inline(lines[0].slice(3))}</h2>
              <p>{inline(lines.slice(1).join(" "))}</p>
            </div>
          );
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
