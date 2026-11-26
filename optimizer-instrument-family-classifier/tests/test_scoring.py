import opik
import pytest

from instruments import FAMILIES, INSTRUMENTS
from scoring import family_accuracy, normalize


def test_normalize_strips_punctuation_and_case():
    assert normalize('  "Brass." ') == "brass"


def test_exact_match_scores_one():
    assert family_accuracy({"label": "woodwind"}, "Woodwind.") == 1.0


def test_sentence_scores_zero():
    assert family_accuracy({"label": "strings"}, "This is a strings instrument") == 0.0


def test_dataset_is_balanced_and_valid():
    labels = [label for _, label in INSTRUMENTS]
    assert set(labels) == set(FAMILIES)
    assert all(labels.count(f) == 6 for f in FAMILIES)


@opik.track
def traced_score(item: dict, output: str) -> float:
    return family_accuracy(item, output)


def test_traced_function_runs_with_tracking_disabled():
    assert traced_score({"label": "brass"}, "brass") == 1.0
