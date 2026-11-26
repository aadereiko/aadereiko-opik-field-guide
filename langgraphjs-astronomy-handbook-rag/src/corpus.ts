import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Chunk {
  id: string;
  text: string;
}

export interface IndexedChunk extends Chunk {
  vector: number[];
}

export const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");

export function splitIntoChunks(fileName: string, markdown: string): Chunk[] {
  const [title = "", ...sections] = markdown.split("\n## ");
  return sections.map((section) => {
    const heading = section.split("\n", 1)[0]?.trim() ?? "";
    return {
      id: `${fileName}#${heading}`,
      text: `${title.replace(/^#\s*/, "").trim()}\n\n## ${section.trim()}`,
    };
  });
}

export function loadChunks(dir: string = DOCS_DIR): Chunk[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .flatMap((name) => splitIntoChunks(name, readFileSync(join(dir, name), "utf8")));
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export function topK(queryVector: number[], index: IndexedChunk[], k: number): IndexedChunk[] {
  return [...index]
    .map((chunk) => ({ chunk, score: cosine(queryVector, chunk.vector) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map(({ chunk }) => chunk);
}
