import pytest

from nutrilabel.catalog import PRODUCTS
from nutrilabel.schema import NutritionFacts, calorie_gap, check_consistency, json_schema


@pytest.mark.parametrize("product", PRODUCTS, ids=lambda p: p.slug)
def test_ground_truth_is_internally_consistent(product):
    assert check_consistency(product.truth) == []


def test_flags_sugars_above_carbs():
    facts = PRODUCTS[0].truth.model_copy(update={"sugars_g": 99})
    assert "sugars exceed total carbohydrate" in check_consistency(facts)


def test_flags_calories_far_from_macros():
    facts = PRODUCTS[0].truth.model_copy(update={"calories": 900})
    assert calorie_gap(facts) > 0.25
    assert any("calories" in p for p in check_consistency(facts))


def test_json_schema_is_strict():
    schema = json_schema()
    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(NutritionFacts.model_fields)
