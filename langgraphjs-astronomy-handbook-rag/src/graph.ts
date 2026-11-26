import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { topK, type IndexedChunk } from "./corpus.js";

export const RETRIEVE_K = 3;

export const SYSTEM_PROMPT =
  "You are the assistant for the Larkfield Astronomical Society observing handbook. " +
  "Answer using only the handbook excerpts below. If they do not cover the question, " +
  "say you don't know. Be concise.";

export interface Embedder {
  embedQuery(text: string): Promise<number[]>;
}

export interface ChatModel {
  invoke(messages: [string, string][]): Promise<{ content: unknown }>;
}

export const GraphState = Annotation.Root({
  question: Annotation<string>(),
  context: Annotation<string[]>(),
  answer: Annotation<string>(),
});

export function formatContext(context: string[]): string {
  return context.join("\n\n---\n\n");
}

export function buildGraph(deps: {
  index: IndexedChunk[];
  embedder: Embedder;
  llm: ChatModel;
  k?: number;
}) {
  const k = deps.k ?? RETRIEVE_K;

  const retrieve = async (state: typeof GraphState.State) => {
    const vector = await deps.embedder.embedQuery(state.question);
    return { context: topK(vector, deps.index, k).map((chunk) => chunk.text) };
  };

  const generate = async (state: typeof GraphState.State) => {
    const reply = await deps.llm.invoke([
      ["system", `${SYSTEM_PROMPT}\n\n${formatContext(state.context)}`],
      ["user", state.question],
    ]);
    return { answer: String(reply.content) };
  };

  return new StateGraph(GraphState)
    .addNode("retrieve", retrieve)
    .addNode("generate", generate)
    .addEdge(START, "retrieve")
    .addEdge("retrieve", "generate")
    .addEdge("generate", END)
    .compile();
}
