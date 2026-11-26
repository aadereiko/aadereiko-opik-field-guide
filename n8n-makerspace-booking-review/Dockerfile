FROM n8nio/n8n:2.41.7

USER root
# n8n-observability hooks into n8n's execution lifecycle: each workflow run becomes one OTel trace and each node a span.
# Nothing in the workflow changes; Opik receives the spans on its OTLP endpoint (configured in docker-compose.yml).
RUN npm install -g n8n-observability@1.0.3
ENV EXTERNAL_HOOK_FILES=/usr/local/lib/node_modules/n8n-observability/dist/hooks.cjs
USER node
