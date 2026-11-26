from typing import Any

from nutrilabel import config

config.load_env()

import opik  # noqa: E402

from nutrilabel.catalog import PRODUCTS  # noqa: E402
from nutrilabel.extract import extract_facts  # noqa: E402
from nutrilabel.render import generate_all, path_for  # noqa: E402

GLOBAL_ASSERTIONS = [
    "The output has all nine fields and none of them is null or empty",
    "Every nutrient amount is a plain number for ONE serving, not a %DV percentage and not a per-container total",
    "The product name is a real product name, not a placeholder like 'unknown', 'N/A' or 'product'",
]

EXPECTED_TEXT = {
    "granola": [
        "The product is Hearthfield Oat & Honey Granola (any capitalisation) and the serving size is 1/2 cup (55g)",
        "servings_per_container is 8, calories is 240, total_fat_g is 8, sodium_mg is 95",
        "total_carbs_g is 37, sugars_g is 12 and protein_g is 6 (not the 13% daily value)",
    ],
    "chickpea": [
        "The product is Kite & Kettle Smoked Chickpea Crunch (any capitalisation) and the serving size is 28 pieces (30g)",
        "servings_per_container is 6 (the label says 'about 6'), calories is 140, total_fat_g is 5, sodium_mg is 310",
        "total_carbs_g is 18, sugars_g is 1 and protein_g is 5",
    ],
    "tonic": [
        "The product is Brightwell Pomegranate Tonic (any capitalisation) and the serving size is 1/2 bottle (240mL)",
        "The amounts come from the per-serving column: calories 90, sodium_mg 25, total_carbs_g 23 "
        "(not the per-container 180, 50 and 46)",
        "servings_per_container is 2, sugars_g is 22 and both total_fat_g and protein_g are 0",
    ],
    "almond-cups": [
        "The product is Marrow Lane Almond Butter Cups (any capitalisation) and the serving size is 2 cups (34g)",
        "servings_per_container is 6, calories is 190, total_fat_g is 14, sodium_mg is 55",
        "total_carbs_g is 13, sugars_g is 10 and protein_g is 3",
    ],
    "oat-drink": [
        "The product is Tallow Creek Barley Oat Drink (any capitalisation) and the serving size is 1 cup (240mL)",
        "servings_per_container is 4, calories is 120, total_fat_g is 2.5, sodium_mg is 100",
        "total_carbs_g is 24, sugars_g is 7 and protein_g is 3",
    ],
    "cold-brew": [
        "The product is Northpier Unsweetened Cold Brew (any capitalisation) and the serving size is 1 bottle (325mL)",
        "servings_per_container is 1, calories is 5, sodium_mg is 15, total_carbs_g is 1",
        "total_fat_g, sugars_g and protein_g are all 0",
    ],
}


def build_items() -> list[dict[str, Any]]:
    return [
        {
            "data": {"label": p.slug, "layout": p.kind},
            "assertions": EXPECTED_TEXT[p.slug],
        }
        for p in PRODUCTS
    ]


def extraction_task(item: dict[str, Any]) -> dict[str, Any]:
    facts = extract_facts(path_for(item["label"]))
    return {"input": item, "output": facts.model_dump()}


def run_suite(experiment_name: str = "label-reader-gpt-4o-mini"):
    generate_all()
    client = opik.Opik(project_name=config.PROJECT_NAME)
    # A test suite stores the items plus plain-language assertions; Opik shows it under Test suites.
    suite = client.get_or_create_test_suite(
        name=config.PROJECT_NAME,
        project_name=config.PROJECT_NAME,
        global_assertions=GLOBAL_ASSERTIONS,
    )
    suite.insert(build_items())
    # run_tests runs the task per item, has an LLM judge grade every assertion, and records an experiment.
    result = opik.run_tests(
        test_suite=suite,
        task=extraction_task,
        experiment_name=experiment_name,
        worker_threads=3,
        generate_report=False,
    )
    client.flush()
    return result
