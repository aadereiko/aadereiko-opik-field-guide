<div align="center">

# Appliance Manual Q&A, With Receipts

**`openai-ts-appliance-manual-qa`**

*A support bot that must quote the manual word for word, and a test suite that checks every quote.*

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-20%2B-339933?style=flat&logo=nodedotjs&logoColor=white)
![OpenAI SDK](https://img.shields.io/badge/openai-7.x-412991?style=flat&logo=openai&logoColor=white)
[![Opik](https://img.shields.io/badge/opik-2.3.4-2f54eb?style=flat)](https://github.com/comet-ml/opik)

</div>

---

"Descale every 4 weeks" and "descale every 2 weeks" read almost the same, and only one
of them is in the kettle's manual. A support bot that paraphrases a manual will
eventually tell someone to use table salt in their dishwasher. The cheap defence is to
make the model show its work: every claim comes with a quote copied from the manual.
The hard part is checking that the quotes are real, for every answer, every time you
change a prompt.

This example answers questions about three made-up appliances (a smart kettle, a
dishwasher and an air fryer). Quotes are required, and an Opik **test suite** checks
them. A test suite is a dataset whose items carry plain-English assertions. An LLM
judge decides whether each assertion holds for each answer, and Opik records a pass or
fail per item.

## What you'll build

- Three short manuals in `data/manuals/`, split into sections, with a keyword
  retriever that picks the three best sections for a question.
- An answerer (OpenAI `gpt-4o-mini` through the OpenAI TypeScript SDK) that must wrap
  every supporting excerpt in `<quote>` tags, copied character for character.
- A local guardrail that checks each quote against the text the model was given.
- A test suite of six questions. Three assertions apply to every item. Five items add
  one of their own, such as "the answer says 200 C and 18 minutes".
- An execution policy of 3 runs per item, where an item passes if 2 runs pass. The
  judge is an LLM too, so it is a little noisy.

```
question -> retrieve sections (tool span)
         -> gpt-4o-mini answers with <quote> tags (generation span)
         -> verbatim_quote_check (guardrail span)
         -> judge checks the suite's assertions -> pass / fail per item
```

## See it in Opik

Open the `openai-ts-appliance-manual-qa` project. A full `npm run demo` leaves 18
traces there: 6 questions times 3 runs each. Every trace is named `llm_task` and holds:

- `answer_question`, the root of the app's own work, with the question as input.
- Under it, `retrieve_manual_sections` (type `tool`) listing the excerpts the model saw,
  `answer_with_quotes` (type `llm`: the OpenAI call, with prompt and completion tokens
  and an estimated cost) and `verbatim_quote_check` (type `guardrail`).
- Next to it, `metrics_calculation` with an `llm_judge` span and the judge's own
  `model.generateText` call (also type `llm`).

In my run that came to 144 spans, about 27,000 tokens in total, and roughly one cent of
estimated cost, counting the judge.

Open the `verbatim_quote_check` span on any "table salt" trace. Its output lists the
quote it could not find in the manual: the model put curly quotation marks around the
real sentence, so the quote is not character for character what the manual says.
That check fires on all three runs of that question.

Then open the `manual-qa-citations` test suite and its run `manual-qa-strict-prompt`.
It reports 5 of 6 items passed. The failing item is the error-code question: the model
states "F4 means a leak was detected" and the advice that follows without any
`<quote>` tags, and the judge's reason on that row says so. It passed 0 of its 3 runs.
The table-salt item passed 3 of 3 even though the guardrail flagged its quote every
time, which shows what a judge can and cannot see (see Gotchas). Your numbers will
differ a little, because both the answer and the judge are sampled: in other runs the
error-code item passed 1 of 3, and the table-salt item passed 2 of 3.

## Run it yourself

1. Start a local Opik, or use Opik Cloud. Copy `.env.example` to `.env` here, or put the
   same values in a `.env` at the repo root. The app walks up from this folder until it
   finds one.
2. `npm install`
3. `npm run demo` (about 15 seconds). It creates the suite on the first run, runs the
   six questions three times each, and prints PASS or FAIL per item with the judge's
   reasons for failures.
4. In Opik, open the project `openai-ts-appliance-manual-qa`, then the test suite
   `manual-qa-citations` and its newest run.
5. Try one question without the suite: `npm run ask -- "How long does keep-warm last on the kettle?"`
6. Offline tests: `OPIK_TRACK_DISABLE=true npm test`. They stub the model and need no
   keys. `OPIK_TRACK_DISABLE=true` is the SDK's switch for turning tracing off.

Each `demo` run adds an experiment to the same suite. The suite items are only
inserted once.

## Poke around

- Compare prompts. Run `PROMPT_VARIANT=loose npm run demo`. It drops the
  character-for-character rule and the "no unquoted facts" rule, and logs a second
  experiment, `manual-qa-loose-prompt`. Compare the two experiments in Opik and see
  which items change.
- Add an assertion that must fail, for example "The answer is written in French", to
  `GLOBAL_ASSERTIONS` in `src/suite.ts`. Re-run: every item fails and every row carries
  the judge's reason.
- Add a question the manuals cannot answer ("Is the dishwasher quiet?") to
  `src/questions.ts`, with the assertion "The output says the manuals do not cover this
  and contains no <quote> tags". The suite items were created on the first run, so
  insert it with `suite.insert` or delete the `manual-qa-citations` suite and run again.
- Fix the table-salt blind spot. The guardrail span sees the curly quotes and the judge
  does not. Try rewording the first assertion, or switch `JUDGE_MODEL` in
  `src/suite.ts`, and see whether item results change.

## Gotchas we hit

**`npm install opik-openai` fails with `ERESOLVE ... peer opik@"^1.8.61"`.**
`opik-openai@2.3.4` still declares a peer dependency on the 1.x `opik` package, while
the current `opik` is 2.3.4. Tell npm they belong together with an `overrides` block in
`package.json`:

```json
"overrides": { "opik-openai": { "opik": "$opik" } }
```

**A warning says a trace "exceeded the payload size limit of 20 MB; truncated field(s):
input", and the trace input is cut off.** `track()` records every argument of the
wrapped function as the trace input. Passing the `OpenAI` client in as an argument made
Opik try to serialize the whole client. Capture it in a closure instead, as
`makeAnswerer(client)` in `src/qa.ts` does, so the input is only the question.

**The OpenAI generation span has type `general`, not `llm`.** `trackOpenAI` (2.3.4)
sets the type itself, after copying your data, so you cannot ask for `llm`. Tokens and
cost are recorded either way, but the span is missing from any view filtered to `llm`.
Hand it a parent whose `span()` forces the type, as `asLlmSpans` in `src/qa.ts` does:

```ts
new Proxy(parent, {
  get: (t, p, r) =>
    p === "span" ? (d) => t.span({ ...d, type: OpikSpanType.Llm }) : Reflect.get(t, p, r),
});
```

**The judge fails an item whose answer is correct but contains no quotes.** The first
version of the assertions said "every quote appears in the manual". On the question the
manuals cannot answer, the right answer has no quotes, and the judge failed the item on
all 3 runs because it found nothing to check. Write the assertions so the no-quote case
is explicit: "If the output has text in quote tags, ... An output with no quote tags
passes this check."

**The judge says a quote is verbatim when it is not.** The suite judge reads only two
fields, `input` and `output`, so `task` must return the manual excerpts inside `input`
(`buildUserMessage` in `src/qa.ts` does this). Even then, a language model reading text
can miss a single changed character: it passed the curly-quote answer in most
of its runs. Keep a deterministic check (`findMissingQuotes`, shown as the guardrail span) next
to the judge for anything that must be exact.

## How it's put together

- `src/main.ts`: the demo. Creates the suite, runs it with `runTests`, prints results.
- `src/suite.ts`: the suite name, the three global assertions, the per-item assertions,
  the execution policy and the idempotent create-and-fill step.
- `src/qa.ts`: prompts, retrieval, the OpenAI call, and the tracing wrappers
  (`track` for the tool, guardrail and root spans, `trackOpenAI` for the generation,
  plus the small proxy that makes that span type `llm`).
- `src/manuals.ts`: manual parsing, keyword retrieval and context formatting.
- `src/quotes.ts`: pulls `<quote>` text out of an answer and checks it against the context.
- `src/questions.ts`: the six suite questions.
- `src/ask.ts`: answer one question from the command line, traced.
- `src/env.ts`: finds and loads the nearest `.env` before Opik starts.
- `data/manuals/`: the three fictional manuals.
- `tests/`: vitest tests for parsing, retrieval, quote checking, the answerer with a
  stub client (including a traced call with tracking disabled) and the suite definition.

---

*built with Opik · inspired by Opik's examples and documentation*
