#!/usr/bin/env bash
# Starts n8n in Docker (with Opik tracing hooks), claims the instance, stores the OpenAI credential and imports + activates the workflow.
# Needs docker, curl and python3. Safe to run again: it logs in instead of re-claiming and replaces the workflow.
set -euo pipefail
cd "$(dirname "$0")"

load_env() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.env" ]; then set -a; . "$dir/.env"; set +a; return; fi
    dir="$(dirname "$dir")"
  done
}
load_env
: "${OPENAI_API_KEY:?OPENAI_API_KEY is not set (shell or repo-root .env)}"

# Opik's OTLP endpoint, as seen from inside the container. A local Opik (OPIK_URL_OVERRIDE on localhost) is reached
# through host.docker.internal; without OPIK_URL_OVERRIDE the spans go to Opik Cloud, which also needs OPIK_API_KEY.
OPIK_API_BASE="${OPIK_URL_OVERRIDE:-https://www.comet.com/opik/api/}"
OPIK_API_BASE="${OPIK_API_BASE%/}"
OPIK_API_BASE="${OPIK_API_BASE/localhost/host.docker.internal}"
OPIK_API_BASE="${OPIK_API_BASE/127.0.0.1/host.docker.internal}"
export OPIK_OTLP_ENDPOINT="$OPIK_API_BASE/v1/private/otel"
export OPIK_OTLP_HEADERS="Comet-Workspace=${OPIK_WORKSPACE:-default},projectName=n8n-makerspace-booking-review"
if [ -n "${OPIK_API_KEY:-}" ]; then OPIK_OTLP_HEADERS="Authorization=$OPIK_API_KEY,$OPIK_OTLP_HEADERS"; fi
echo "-> spans go to $OPIK_OTLP_ENDPOINT"

PORT="${N8N_HOST_PORT:-5678}"
BASE="http://localhost:$PORT"
OWNER_EMAIL="owner@foundrylane.example"
OWNER_PASSWORD="Foundry-lane-1"
WORKFLOW_FILE="workflow/makerspace-booking-review.json"
WORKFLOW_NAME="Makerspace booking review"

field() { python3 -c "import json,sys; print(json.load(sys.stdin)$1)"; }

echo "-> starting n8n"
docker compose up -d --build

printf -- "-> waiting for n8n"
for _ in $(seq 1 120); do
  curl -sf "$BASE/healthz/readiness" >/dev/null 2>&1 && break
  printf "."; sleep 2
done
curl -sf "$BASE/healthz/readiness" >/dev/null || { echo " n8n never became ready"; exit 1; }
echo " ready"

JAR="$(mktemp)"; trap 'rm -f "$JAR"' EXIT
# n8n ties the session cookie to a browser-id header, so every /rest call has to send the same one.
rest() { curl -sf -b "$JAR" -c "$JAR" -H "browser-id: foundry-setup" -H 'Content-Type: application/json' "$@"; }

echo "-> claiming the instance"
signed_in=""
for _ in $(seq 1 20); do
  if rest -X POST "$BASE/rest/owner/setup" \
       -d "{\"email\":\"$OWNER_EMAIL\",\"firstName\":\"Foundry\",\"lastName\":\"Owner\",\"password\":\"$OWNER_PASSWORD\"}" >/dev/null 2>&1 \
     || rest -X POST "$BASE/rest/login" \
       -d "{\"emailOrLdapLoginId\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}" >/dev/null 2>&1; then
    signed_in=yes; break
  fi
  sleep 2
done
[ -n "$signed_in" ] || { echo "could not sign in to n8n"; exit 1; }

echo "-> creating an API key for the public API"
N8N_API_KEY=$(rest -X POST "$BASE/rest/api-keys" \
  -d '{"label":"setup-'"$(date +%s)"'","expiresAt":null,"scopes":["workflow:create","workflow:read","workflow:update","workflow:delete","workflow:list","workflow:activate","workflow:deactivate","credential:create","credential:delete","execution:read","execution:list"]}' \
  | field "['data']['rawApiKey']")

api() {
  local method="$1" path="$2"; shift 2
  curl -sf -X "$method" "$BASE/api/v1$path" -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' "$@"
}

echo "-> storing the OpenAI credential"
CRED_ID=$(python3 -c 'import json,os; print(json.dumps({"name":"OpenAI (makerspace bookings)","type":"openAiApi","data":{"apiKey":os.environ["OPENAI_API_KEY"]}}))' \
  | api POST /credentials --data-binary @- | field "['id']")

echo "-> replacing any earlier copy of the workflow"
api GET "/workflows?limit=100" \
  | python3 -c "import json,sys; [print(w['id']) for w in json.load(sys.stdin)['data'] if w['name']==sys.argv[1]]" "$WORKFLOW_NAME" \
  | while read -r old; do
      # n8n refuses to delete a published workflow ("Unpublish it before deleting"), so deactivate it first.
      api POST "/workflows/$old/deactivate" >/dev/null || true
      api DELETE "/workflows/$old" >/dev/null
    done

echo "-> importing and activating the workflow"
WF_ID=$(python3 -c 'import json,sys; print(open(sys.argv[1]).read().replace("__OPENAI_CREDENTIAL_ID__", sys.argv[2]))' "$WORKFLOW_FILE" "$CRED_ID" \
  | api POST /workflows --data-binary @- | field "['id']")
api POST "/workflows/$WF_ID/activate" >/dev/null

echo
echo "n8n editor: $BASE  (sign in as $OWNER_EMAIL / $OWNER_PASSWORD)"
echo "webhook:    $BASE/webhook/makerspace-booking"
echo "next:       ./demo.sh"
