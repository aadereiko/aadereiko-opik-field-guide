import { describe, expect, it } from "vitest";
import { mapVoltAgentAttributes } from "../src/observability.ts";
import { createSalonTools } from "../src/tools.ts";
import { Salon } from "../src/salon.ts";

describe("mapVoltAgentAttributes", () => {
  it("copies usage, model and provider onto gen_ai.* for llm spans", () => {
    const attrs: Record<string, unknown> = {
      "span.type": "llm",
      "llm.model": "gpt-4o-mini",
      "llm.usage.prompt_tokens": 120,
      "llm.usage.completion_tokens": 30,
      "llm.usage.total_tokens": 150,
    };
    mapVoltAgentAttributes(attrs);
    expect(attrs["gen_ai.request.model"]).toBe("gpt-4o-mini");
    expect(attrs["gen_ai.provider.name"]).toBe("openai");
    expect(attrs["gen_ai.usage.prompt_tokens"]).toBe(120);
    expect(attrs["gen_ai.usage.total_tokens"]).toBe(150);
  });

  it("moves tool arguments to gen_ai.tool.call.arguments", () => {
    const attrs: Record<string, unknown> = { "span.type": "tool", input: '{"day":"2026-12-02"}', "tool.parameters": "{}" };
    mapVoltAgentAttributes(attrs);
    expect(attrs["gen_ai.tool.call.arguments"]).toBe('{"day":"2026-12-02"}');
    expect(attrs).not.toHaveProperty("input");
  });

  it("leaves other spans alone", () => {
    const attrs: Record<string, unknown> = { "span.type": "agent" };
    mapVoltAgentAttributes(attrs);
    expect(Object.keys(attrs)).toEqual(["span.type"]);
  });
});

describe("tools", () => {
  it("run normally with the observability layer absent", async () => {
    const tools = createSalonTools(new Salon());
    const check = tools.find((t) => t.name === "check_availability")!;
    const out = (await check.execute!({ service: "balayage", day: "2026-12-02" } as never, undefined as never)) as {
      slots: { stylistId: string; times: string[] }[];
    };
    expect(out.slots.find((s) => s.stylistId === "priya")?.times).not.toContain("09:00");
  });
});
