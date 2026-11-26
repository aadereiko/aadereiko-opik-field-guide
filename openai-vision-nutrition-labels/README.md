# openai-vision-nutrition-labels

Read nutrition-facts labels with a vision model, keep the label image next to every trace, and grade the readings with an Opik test suite.

## Run it

1. `cp .env.example ../.env` (or fill the repo-root `.env`) and set `OPENAI_API_KEY`.
2. `uv sync`
3. `uv run nutrilabel generate` draws six sample labels into `labels/`.
4. `uv run nutrilabel extract granola` reads one label and prints typed fields.
5. `uv run nutrilabel run` reads all six and grades them in a test suite.

Offline tests: `env -u OPENAI_API_KEY OPIK_TRACK_DISABLE=true uv run pytest`

*built with Opik · inspired by Opik's examples and documentation*
