import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Section {
  manual: string;
  heading: string;
  text: string;
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "can", "do", "does", "for", "how", "i", "in", "is", "it", "my",
  "of", "on", "or", "should", "the", "to", "use", "what", "when", "with", "you", "long",
]);

export function parseManual(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const manual = (lines.find((l) => l.startsWith("# ")) ?? "# Manual").slice(2).trim();
  const sections: Section[] = [];
  let heading: string | undefined;
  let body: string[] = [];
  const flush = () => {
    if (heading !== undefined) {
      sections.push({ manual, heading, text: body.join(" ").replace(/\s+/g, " ").trim() });
    }
  };
  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
      body = [];
    } else if (heading !== undefined) {
      body.push(line);
    }
  }
  flush();
  return sections;
}

export function loadSections(dir: string): Section[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .flatMap((f) => parseManual(readFileSync(join(dir, f), "utf8")));
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => w.length > 1 && !STOPWORDS.has(w),
  );
}

export function retrieve(question: string, sections: Section[], k = 3): Section[] {
  const wanted = new Set(tokenize(question));
  return sections
    .map((section) => {
      const words = new Set(tokenize(`${section.manual} ${section.heading} ${section.text}`));
      let score = 0;
      for (const w of wanted) if (words.has(w)) score += 1;
      return { section, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.section);
}

export function formatContext(sections: Section[]): string {
  return sections.map((s) => `[${s.manual} / ${s.heading}]\n${s.text}`).join("\n\n");
}
