# voltagent-hair-salon-assistant

![Node](https://img.shields.io/badge/node-20.19%2B-339933?style=flat&logo=node.js&logoColor=white)
![VoltAgent](https://img.shields.io/badge/%40voltagent%2Fcore-2.11.1-1b1f23?style=flat)
![Opik](https://img.shields.io/badge/Opik-OTLP%20ingestion-2f54eb?style=flat)

**A salon booking bot, and the ten lines of attribute mapping that make Opik show what each chat turn cost.**

Willowbrook Hair Studio (fictional) has a front-desk assistant. It answers price questions, finds open chairs, and books or cancels appointments. A booking bot is a good thing to trace: when a customer says "you booked me with the wrong stylist", you want the exact arguments the model sent to `book_appointment`, not just the friendly sentence it replied with.

The catch is how the traces get to Opik. VoltAgent emits plain OpenTelemetry (OTel, the standard wire format for traces). Opik reads one specific naming scheme for model, tokens and tool calls, called `gen_ai.*`. VoltAgent uses its own names (`llm.model`, `llm.usage.prompt_tokens`). If you point VoltAgent's exporter at Opik with no changes, traces arrive, but they look empty. This example fixes that with a small exporter wrapper and shows the before and after.

## What you'll build

- A VoltAgent `Agent` on `gpt-4o-mini` with four tools over an in-memory salon: `list_services`, `check_availability`, `book_appointment`, `cancel_appointment`.
- `src/observability.ts`, the only file that knows Opik exists. It sends spans over OTLP to Opik and renames VoltAgent's attributes to `gen_ai.*` on the way out.
- A demo of three customer messages: a price question, a booking that succeeds (HS-1004), and a request for a slot that is already taken.

## See it in Opik

Open http://localhost:5173, workspace `default`, project `voltagent-hair-salon-assistant`. A clean run has 3 traces, all named `willowbrook-front-desk`, one per customer message.

Open the booking trace (the one whose output says HS-1004). It has four spans:

- `willowbrook-front-desk`, type `general`: the whole turn. Input holds the customer's sentence, output holds the final reply.
- `llm:generateText`, type `llm`, model `gpt-4o-mini`: 561 prompt tokens, 47 completion tokens, 608 total, estimated cost about $0.00011. In the trace list you can add the usage and cost columns and see them for every turn (the price question cost about $0.00008).
- `tool.execution:check_availability` and `tool.execution:book_appointment`, type `tool`. The output of the first lists Ines's free times; the output of the second is the booking with id HS-1004 and the $230 total.

The `llm` span metadata shows `provider: openai`. That field is why a dollar figure appears at all.

Two things to know when you look. The tool span's input is the full attribute bag VoltAgent recorded (operation id, tool name, description, call arguments), not only the arguments. And the `llm` span has no output of its own; the reply text lives on the root span.

## Run it yourself

1. Start Opik locally and put your OpenAI key in a `.env` file in this folder or any folder above it (the app walks up until it finds one). See `.env.example`.
2. `npm install`
3. `npm run demo`
4. Open the project above and click the newest trace.

A run takes about 15 seconds and costs well under a cent.

Offline tests (no keys, no Opik): `env -u OPENAI_API_KEY OPIK_URL_OVERRIDE= npm test`

## Poke around

- Run `SKIP_GENAI_MAPPING=1 npm run demo`. Delete the old traces first if you want a clean view. In that run every span has type `general`, usage is empty and cost is empty. Same code, same model, only the mapping is off.
- Ask for a service a stylist does not offer (for example "color with Tomas") and read the `book_appointment` span output: the refusal reason comes from the tool, not from the model.
- Add a fifth tool, for example `reschedule_appointment`, and see it show up as another `tool` span with no tracing code at all.

## Gotchas we hit

**Traces arrive but every span is `general` and tokens and cost are empty.**
VoltAgent's own attribute names are not the ones Opik reads. Copy them to `gen_ai.*` in a span exporter wrapper, as `mapVoltAgentAttributes` in `src/observability.ts` does: `llm.model` to `gen_ai.request.model`, `llm.usage.*_tokens` to `gen_ai.usage.*_tokens`, and tool `input` to `gen_ai.tool.call.arguments`.

**Tokens show up but the cost is null.**
Opik only prices a span when it knows the provider. VoltAgent never sets one, so the wrapper adds `gen_ai.provider.name = "openai"`. Without it you get usage and no dollars.

**The last trace never appears.**
The batch span processor sends spans in groups on a timer. If the script exits first, the tail is lost. Call `await observability.shutdown()` before `process.exit`, as `src/demo.ts` does.

**A model name that is a substring of another matches the wrong service.**
Our first `findService` used `includes`, and "men's cut" matched "Women's Cut & Style". You could only see this in the `check_availability` span, whose output said `"service": "Women's Cut & Style"` while the reply sounded fine. Match exact ids and names first, then whole words.

## How it's put together

- `src/salon.ts`: services, stylists, and the `Salon` class that holds bookings and rules.
- `src/tools.ts`: the four VoltAgent tools, thin wrappers over `Salon`.
- `src/agent.ts`: the front-desk agent, its instructions and model.
- `src/observability.ts`: OTLP exporter to Opik plus the `gen_ai.*` attribute mapping.
- `src/env.ts`: finds and loads the nearest `.env` before anything reads Opik settings.
- `src/demo.ts`: runs the three messages and flushes.
- `tests/salon.test.ts`: availability, booking, conflicts, cancellation, service lookup.
- `tests/observability.test.ts`: the attribute mapping, and a tool call with no observability attached.

---

*built with Opik · inspired by Opik's examples and documentation*
