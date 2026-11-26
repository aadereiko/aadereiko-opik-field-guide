# n8n-makerspace-booking-review

**An n8n workflow that reviews maker-space bookings with gpt-4o-mini, traced into Opik without a single tracing node.**

![n8n](https://img.shields.io/badge/n8n-2.41.7-ea4b71) ![n8n-observability](https://img.shields.io/badge/n8n--observability-1.0.3-blue) ![Docker](https://img.shields.io/badge/runs%20in-Docker-2496ed)

A community workshop takes equipment bookings through a form. Each request goes to an n8n workflow, and a model decides whether it fits the house rules: who holds which tool induction, how long each machine may be booked, when the shop is staffed. It works until a member asks why their booking was declined. A no-code workflow keeps no record of what the model was told or what it answered, so nobody can say.

This example adds that record without touching the workflow. A hooks package inside the n8n container turns every execution into an Opik trace and every node into a span.

## What you'll build

- A self-hosted n8n (in Docker) with a five-node workflow: **Booking request** (webhook) → **Look up inductions** (sets the member's tool inductions from a small fictional roster) → **Review booking (gpt-4o-mini)** → **Shape the decision** → **Reply to member**.
- The model answers with `decision` (`approve`, `approve_with_changes` or `decline`), a one-sentence `reason` and a list of `changes`.
- Tracing comes from [`n8n-observability`](https://github.com/comet-ml/n8n-observability), installed into the image and loaded through n8n's `EXTERNAL_HOOK_FILES`. The workflow JSON contains no Opik node and no code.
- `setup.sh` does everything an admin would click through: it claims the instance, creates an API key, stores the OpenAI credential, and imports and activates the workflow through n8n's REST API.

## See it in Opik

Open project **`n8n-makerspace-booking-review`** (workspace `default`). After `./demo.sh` it holds **4 traces**, one per booking, each named **`Makerspace booking review`**.

Each trace has **6 spans**: the workflow execution plus one per node, in the order n8n ran them. All are type `general`. Click **`Review booking (gpt-4o-mini)`**. Its input panel lists the node's OpenTelemetry attributes. Three of them answer "why did the model say that?":

- `n8n.node.input`: the item the node received, i.e. the booking body plus the `inductions` list added by the previous node. For Priya Raman it shows `"tool": "laser cutter"` and `"inductions": ["laser cutter", "3d printer"]`.
- `n8n.node.parameters.messages.values.0.content` and `...1.content`: the house rules and the request template the node was configured with.
- `n8n.node.output`: the model's JSON verdict, e.g. `{"decision": "approve_with_changes", "reason": "Maximum booking length for CNC router is 3 hours."}` for Jonas Pettersson's 5-hour booking.

In the verified run the four verdicts were: Priya `approve`, Jonas `approve_with_changes`, Ada `decline` (no table saw induction and no buddy), Wei `approve` (the 3D printer may run overnight). Model answers vary between runs. An earlier run declined Jonas outright and told Wei the printer could not start after 21:00, which the rules never say. That is the point of the trace: you can put the rules and the exact input side by side and see whether the model misread them.

Two things you will **not** see. The trace's own output column is empty (the hooks put the data on the spans). And there is no token usage or cost: with this n8n version and node type, no `gen_ai.*` attributes are emitted, so Opik has nothing to price. Check n8n's execution log if you need token counts.

To print the same facts from the API: `uv run verify.py`.

## Run it yourself

You need Docker, `curl`, `python3`, [uv](https://docs.astral.sh/uv/) (for `verify.py` only) and an OpenAI key.

1. Have Opik running. For a local install, follow [Opik self-hosting](https://www.comet.com/docs/opik/self-host/local_deployment); the UI is then at `http://localhost:5173`.
2. Copy `.env.example` to the repo-root `.env` (or add its lines there) and fill in `OPENAI_API_KEY`. Keep `OPIK_URL_OVERRIDE=http://localhost:5173/api/` and `OPIK_WORKSPACE=default` for a local Opik. For Opik Cloud, remove `OPIK_URL_OVERRIDE`, set your workspace and add `OPIK_API_KEY`.
3. `./setup.sh`: builds the image, starts n8n on port 5678, and imports and activates the workflow. It prints where spans go, e.g. `-> spans go to http://host.docker.internal:5173/api/v1/private/otel`. The first build pulls the n8n image and takes a few minutes; after that, setup plus the demo took 23 s.
4. `./demo.sh`: sends four bookings and prints each verdict.
5. Open the project in Opik, or run `uv run verify.py`.
6. When you are done: `docker compose down -v` removes the container and its data.

The n8n editor is at http://localhost:5678 (sign in as `owner@foundrylane.example` / `Foundry-lane-1`, a local demo account created by `setup.sh`).

## Poke around

- **Book something yourself:** `curl -X POST localhost:5678/webhook/makerspace-booking -H 'Content-Type: application/json' -d '{"member":"Lena Brandt","member_id":"M-388","tool":"table saw","start":"Tuesday 19:30","hours":2,"buddy":"Jonas Pettersson","project":"Workbench top"}'`. Lena holds the table saw induction, but the booking runs past 21:00, and the roster lookup only covers the person booking, so the model cannot check whether Jonas holds a table saw induction (he does not). See what the verdict makes of it.
- **Edit the rules in the n8n editor** (open the Review node) and resend a booking. The new rules show up in `n8n.node.parameters.messages.values.0.content` on the next trace, so you can tell which version of the prompt produced which verdict.
- **Drop the noise:** add `N8N_OTEL_NODE_EXCLUDE: "Shape the decision,Reply to member"` to `docker-compose.yml`, rerun `./setup.sh`, and the traces keep only the nodes you care about.
- **Run `./demo.sh` three times** and compare the Jonas and Wei verdicts across traces. Consistent answers are not a given.

## Gotchas we hit

**No traces at all on the newest n8n.** With `n8nio/n8n:2.49.7` and `n8n-observability@1.0.3`, every execution succeeded but the project never appeared in Opik. The container log showed `OpenTelemetry diagnostics error` three times at startup and nothing else. The same setup on `n8nio/n8n:2.41.7` exports every execution. Fix: pin the image, as the `Dockerfile` here does (`FROM n8nio/n8n:2.41.7`), until the hooks support newer n8n.

**`Cannot delete a published workflow. Unpublish it before deleting.`** Re-running `setup.sh` replaces the workflow, and n8n's public API refuses to delete an active one. Fix: call `POST /api/v1/workflows/{id}/deactivate` before `DELETE`, as `setup.sh` does.

**A laser-cutter booking declined for the table saw rule.** With the first version of the prompt, Priya's laser cutter booking came back `decline` with the reason "Table saw bookings need a buddy...", and so did the CNC router booking. The node's input showed the right tool and the right inductions, so the data was fine and the rules were being misapplied. That prompt sent a `Buddy: none` line with every request and stated rule 4 without saying which tool it covers. Fix: rule 4 now starts with "Table saw only", the model is told to check only the rules for the requested tool, and the request template adds the `Buddy:` line only when `tool` is `table saw`. After that change the laser cutter booking was approved in every run.

## How it's put together

- `workflow/makerspace-booking-review.json`: the five-node workflow, with the induction roster and house rules inline. The OpenAI credential id is a placeholder that `setup.sh` fills in, so no key is ever in this file.
- `Dockerfile`: the pinned n8n image plus `n8n-observability`, wired in through `EXTERNAL_HOOK_FILES`.
- `docker-compose.yml`: the n8n service, the OTLP endpoint and headers (the `projectName` header picks the Opik project), and `host.docker.internal` so the container can reach an Opik on your machine.
- `setup.sh`: reads the repo-root `.env`, derives the OTLP endpoint, starts n8n, claims it, creates the credential, and imports and activates the workflow.
- `demo.sh`: four sample bookings against the webhook.
- `verify.py`: reads the traces back with the Opik SDK and prints each request, the inductions the model saw, and its decision.
- `.env.example`: the variables the scripts read.

---

*built with Opik · inspired by Opik's examples and documentation*
