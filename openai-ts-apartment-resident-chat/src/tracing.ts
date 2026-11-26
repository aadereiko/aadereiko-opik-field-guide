import { Opik, OpikSpanType, type Trace } from "opik";

export const PROJECT_NAME = "openai-ts-apartment-resident-chat";

// projectName pins every trace to one Opik project; without it traces go to "Default Project".
// The URL and workspace come from OPIK_URL_OVERRIDE / OPIK_WORKSPACE (loaded from .env before this runs).
export function createOpik(): Opik {
  return new Opik({ projectName: PROJECT_NAME });
}

// opik-openai 2.3.4 hardcodes type "general" on the spans it creates. Opik shows the LLM badge and
// groups spans as model calls only for type "llm", so we hand it a parent whose span() upgrades the type.
export function withLlmSpans(trace: Trace): Trace {
  return new Proxy(trace, {
    get(target, prop, receiver) {
      if (prop === "span") {
        return (data: Parameters<Trace["span"]>[0]) => target.span({ ...data, type: OpikSpanType.Llm });
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
