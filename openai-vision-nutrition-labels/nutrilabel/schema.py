from pydantic import BaseModel, Field


class NutritionFacts(BaseModel):
    product_name: str
    serving_size: str = Field(description="Serving size text exactly as printed, e.g. '1/2 cup (55g)'")
    servings_per_container: float
    calories: int
    total_fat_g: float
    sodium_mg: float
    total_carbs_g: float
    sugars_g: float
    protein_g: float


def json_schema() -> dict:
    schema = NutritionFacts.model_json_schema()
    schema["additionalProperties"] = False
    schema.pop("title", None)
    for prop in schema["properties"].values():
        prop.pop("title", None)
    return schema


def calorie_gap(facts: NutritionFacts) -> float:
    estimated = 4 * facts.total_carbs_g + 4 * facts.protein_g + 9 * facts.total_fat_g
    return abs(estimated - facts.calories) / max(facts.calories, 20)


def check_consistency(facts: NutritionFacts) -> list[str]:
    problems = []
    if facts.sugars_g > facts.total_carbs_g:
        problems.append("sugars exceed total carbohydrate")
    if calorie_gap(facts) > 0.25:
        problems.append("calories do not match the macros (4/4/9 rule)")
    if facts.servings_per_container < 1:
        problems.append("servings_per_container below 1")
    return problems
