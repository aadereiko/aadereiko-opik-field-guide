import pytest

from tools import FILED_CLAIMS, estimate_payout_data, file_claim_data, lookup_policy, lookup_policy_data


@pytest.fixture(autouse=True)
def clear_filed_claims():
    FILED_CLAIMS.clear()


def test_lookup_is_case_insensitive_and_reports_unknown():
    assert lookup_policy_data("ho-4471")["holder"] == "Marta Okonkwo"
    assert "error" in lookup_policy_data("HO-0000")


def test_payout_subtracts_deductible():
    result = estimate_payout_data("HO-4471", "water damage", 12, 1800)
    assert result["gross_usd"] == 12 * 180 + 1800
    assert result["payout_usd"] == result["gross_usd"] - 1000


def test_payout_never_negative_and_respects_coverage():
    assert estimate_payout_data("AU-9082", "glass", 1, 0)["payout_usd"] == 0
    assert estimate_payout_data("HO-5120", "storm", 5, 100)["payout_usd"] == 0
    assert "not covered" in estimate_payout_data("HO-5120", "storm", 5, 100)["error"]


def test_inactive_policy_cannot_file():
    assert file_claim_data("AU-3317", "glass", "cracked")["error"] == "policy is not active"


def test_filing_returns_claim_id():
    claim = file_claim_data("AU-9082", "collision", "rear bumper")
    assert claim["status"] == "filed" and claim["claim_id"].startswith("CLM-")


def test_tool_names_exposed_to_the_model():
    assert lookup_policy.name == "lookup_policy"


def test_filing_twice_returns_the_same_claim():
    first = file_claim_data("AU-9082", "collision", "rear bumper")
    second = file_claim_data("au-9082", "Collision", "rear bumper again")
    assert second["status"] == "already_filed"
    assert second["claim_id"] == first["claim_id"]
