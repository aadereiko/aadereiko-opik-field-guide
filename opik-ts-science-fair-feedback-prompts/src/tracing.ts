import { Opik, OpikSpanType, type Span, type Trace } from "opik";

export const PROJECT_NAME = "opik-ts-science-fair-feedback-prompts";

// The URL and workspace come from OPIK_URL_OVERRIDE / OPIK_WORKSPACE (loaded from .env before this runs).
// projectName decides which Opik project receives every trace this client creates.
export function createOpik(): Opik {
  return new Opik({ projectName: PROJECT_NAME });
}

// opik-openai 2.3.4 hardcodes type "general" on the spans it creates. Opik only shows the LLM badge
// for type "llm", so we hand it a parent whose span() upgrades the type.
export function withLlmSpans<T extends Trace | Span>(parent: T): T {
  return new Proxy(parent, {
    get(target, prop, receiver) {
      if (prop === "span") {
        return (data: Parameters<T["span"]>[0]) => target.span({ ...data, type: OpikSpanType.Llm });
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
