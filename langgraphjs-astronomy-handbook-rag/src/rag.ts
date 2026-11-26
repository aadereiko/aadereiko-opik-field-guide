import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { loadChunks, type IndexedChunk } from "./corpus.js";
import { buildGraph } from "./graph.js";

export async function createApp(k?: number) {
  const embedder = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const chunks = loadChunks();
  const vectors = await embedder.embedDocuments(chunks.map((chunk) => chunk.text));
  const index: IndexedChunk[] = chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] ?? [] }));
  const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  return buildGraph({ index, embedder, llm, k });
}
