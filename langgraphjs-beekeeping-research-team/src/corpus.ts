import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Section {
  id: string;
  text: string;
}

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

export function splitIntoSections(fileName: string, markdown: string): Section[] {
  const [title = "", ...sections] = markdown.split("\n## ");
  return sections.map((section) => {
    const heading = section.split("\n", 1)[0]?.trim() ?? "";
    return {
      id: `${fileName}#${heading}`,
      text: `${title.replace(/^#\s*/, "").trim()}\n\n## ${section.trim()}`,
    };
  });
}

export function loadSections(dir: string = DATA_DIR): Section[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .flatMap((name) => splitIntoSections(name, readFileSync(join(dir, name), "utf8")));
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "at", "to", "is", "are", "was", "were",
  "what", "which", "how", "did", "do", "does", "for", "with", "by", "any", "this", "that", "hive",
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => !STOPWORDS.has(t));
}

export function search(query: string, sections: Section[], k: number): Section[] {
  const docs = sections.map((s) => new Set(tokenize(s.text)));
  const rarity = (term: string) => {
    const df = docs.filter((d) => d.has(term)).length;
    return df === 0 ? 0 : Math.log(1 + sections.length / df);
  };
  const terms = [...new Set(tokenize(query))];
  return sections
    .map((section, i) => ({
      section,
      score: terms.reduce((sum, t) => sum + (docs[i]?.has(t) ? rarity(t) : 0), 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => r.section);
}
