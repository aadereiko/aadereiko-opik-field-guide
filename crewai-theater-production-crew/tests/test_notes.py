import pytest

from theater_crew.notes import extract_budget_ceiling, load_notes


def test_bundled_notes_load_and_list_roles():
    notes = load_notes()
    assert "Morwenna Pell" in notes and "Grange Hall" in notes


@pytest.mark.parametrize(
    "text,expected",
    [("- Budget ceiling: $3,200. Above needs a vote.", 3200), ("budget ceiling is $950", 950), ("no money talk", None)],
)
def test_extract_budget_ceiling(text, expected):
    assert extract_budget_ceiling(text) == expected


def test_bundled_notes_have_a_ceiling():
    assert extract_budget_ceiling(load_notes()) == 3200
