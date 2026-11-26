#!/usr/bin/env bash
# Sends four booking requests to the webhook and prints each decision.
set -euo pipefail
cd "$(dirname "$0")"
URL="http://localhost:${N8N_HOST_PORT:-5678}/webhook/makerspace-booking"

book() {
  local label="$1" body="$2"
  echo "== $label"
  for _ in $(seq 1 15); do
    if reply=$(curl -sf -X POST "$URL" -H 'Content-Type: application/json' -d "$body"); then
      echo "$reply" | python3 -m json.tool; echo; return
    fi
    sleep 2
  done
  echo "no answer from $URL. Did ./setup.sh finish?" >&2; exit 1
}

book "Priya: laser cutter, inducted, 2 h on Saturday afternoon" \
  '{"member":"Priya Raman","member_id":"M-104","tool":"laser cutter","start":"Saturday 14:00","hours":2,"project":"Engraved oak coasters for a craft fair"}'
book "Jonas: CNC router, 5 h running to 23:00" \
  '{"member":"Jonas Pettersson","member_id":"M-221","tool":"cnc router","start":"Thursday 18:00","hours":5,"project":"Plywood bench parts"}'
book "Ada: table saw, no induction, no buddy" \
  '{"member":"Ada Okafor","member_id":"M-317","tool":"table saw","start":"Sunday 10:00","hours":1,"project":"Cutting shelf boards"}'
book "Wei: 3D printer, 9 h overnight print" \
  '{"member":"Wei Chen","member_id":"M-142","tool":"3d printer","start":"Friday 22:00","hours":9,"project":"Replacement drone frame"}'
