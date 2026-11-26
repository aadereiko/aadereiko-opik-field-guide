import json
import uuid
from pathlib import Path

from agents import function_tool

POLICIES = json.loads((Path(__file__).parent / "data" / "policies.json").read_text())

REPAIR_RATES_USD = {
    "water damage": 180,
    "fire": 320,
    "storm": 150,
    "theft": 0,
    "collision": 95,
    "glass": 60,
}


def lookup_policy_data(policy_id: str) -> dict:
    policy = POLICIES.get(policy_id.upper())
    if policy is None:
        return {"error": f"no policy {policy_id}"}
    return {"policy_id": policy_id.upper(), **policy}


def estimate_payout_data(policy_id: str, damage_type: str, repair_hours: float, parts_cost_usd: float) -> dict:
    policy = POLICIES.get(policy_id.upper())
    if policy is None:
        return {"error": f"no policy {policy_id}"}
    if not policy["active"]:
        return {"error": "policy is not active", "payout_usd": 0}
    if damage_type.lower() not in policy["covers"]:
        return {"error": f"{damage_type} is not covered", "payout_usd": 0}
    gross = REPAIR_RATES_USD.get(damage_type.lower(), 100) * repair_hours + parts_cost_usd
    payout = max(0.0, min(gross - policy["deductible_usd"], policy["limit_usd"]))
    return {"gross_usd": gross, "deductible_usd": policy["deductible_usd"], "payout_usd": payout}


FILED_CLAIMS: dict[tuple[str, str], dict] = {}


def file_claim_data(policy_id: str, damage_type: str, description: str) -> dict:
    policy = POLICIES.get(policy_id.upper())
    if policy is None:
        return {"error": f"no policy {policy_id}"}
    if not policy["active"]:
        return {"error": "policy is not active"}
    key = (policy_id.upper(), damage_type.lower())
    if key in FILED_CLAIMS:
        return {**FILED_CLAIMS[key], "status": "already_filed"}
    claim = {
        "status": "filed",
        "claim_id": f"CLM-{uuid.uuid4().hex[:6].upper()}",
        "policy_id": policy_id.upper(),
        "damage_type": damage_type,
        "description": description,
    }
    FILED_CLAIMS[key] = claim
    return claim


@function_tool
def lookup_policy(policy_id: str) -> str:
    """Look up a policy by id: holder, type, coverage, deductible and whether it is active."""
    return json.dumps(lookup_policy_data(policy_id))


@function_tool
def estimate_payout(policy_id: str, damage_type: str, repair_hours: float, parts_cost_usd: float) -> str:
    """Estimate the payout for a repair after the deductible, given hours of labor and parts cost."""
    return json.dumps(estimate_payout_data(policy_id, damage_type, repair_hours, parts_cost_usd))


@function_tool
def file_claim(policy_id: str, damage_type: str, description: str) -> str:
    """File a claim on an active policy and return the claim id."""
    return json.dumps(file_claim_data(policy_id, damage_type, description))
