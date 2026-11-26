from dataclasses import dataclass

from nutrilabel.schema import NutritionFacts


@dataclass(frozen=True)
class Product:
    slug: str
    style: str
    kind: str
    brand_line: str
    serving_text: str
    truth: NutritionFacts
    per_container_multiplier: int | None = None
    servings_prefix: str = ""


PRODUCTS: list[Product] = [
    Product(
        slug="granola",
        style="classic",
        kind="Classic vertical panel with %DV column",
        brand_line="HEARTHFIELD OAT & HONEY GRANOLA",
        serving_text="1/2 cup (55g)",
        truth=NutritionFacts(
            product_name="Hearthfield Oat & Honey Granola",
            serving_size="1/2 cup (55g)",
            servings_per_container=8,
            calories=240,
            total_fat_g=8,
            sodium_mg=95,
            total_carbs_g=37,
            sugars_g=12,
            protein_g=6,
        ),
    ),
    Product(
        slug="chickpea",
        style="classic",
        kind="Classic panel, 'about 6' servings and decimals",
        brand_line="KITE & KETTLE SMOKED CHICKPEA CRUNCH",
        serving_text="28 pieces (30g)",
        truth=NutritionFacts(
            product_name="Kite & Kettle Smoked Chickpea Crunch",
            serving_size="28 pieces (30g)",
            servings_per_container=6,
            calories=140,
            total_fat_g=5,
            sodium_mg=310,
            total_carbs_g=18,
            sugars_g=1,
            protein_g=5,
        ),
        servings_prefix="about ",
    ),
    Product(
        slug="tonic",
        style="dual",
        kind="Dual-column panel: per serving and per container",
        brand_line="BRIGHTWELL POMEGRANATE TONIC",
        serving_text="1/2 bottle (240mL)",
        truth=NutritionFacts(
            product_name="Brightwell Pomegranate Tonic",
            serving_size="1/2 bottle (240mL)",
            servings_per_container=2,
            calories=90,
            total_fat_g=0,
            sodium_mg=25,
            total_carbs_g=23,
            sugars_g=22,
            protein_g=0,
        ),
        per_container_multiplier=2,
    ),
    Product(
        slug="almond-cups",
        style="photo",
        kind="Tilted, blurry, low-contrast phone photo of a panel",
        brand_line="MARROW LANE ALMOND BUTTER CUPS",
        serving_text="2 cups (34g)",
        truth=NutritionFacts(
            product_name="Marrow Lane Almond Butter Cups",
            serving_size="2 cups (34g)",
            servings_per_container=6,
            calories=190,
            total_fat_g=14,
            sodium_mg=55,
            total_carbs_g=13,
            sugars_g=10,
            protein_g=3,
        ),
    ),
    Product(
        slug="oat-drink",
        style="tabular",
        kind="Horizontal grid layout with no %DV column",
        brand_line="TALLOW CREEK BARLEY OAT DRINK",
        serving_text="1 cup (240mL)",
        truth=NutritionFacts(
            product_name="Tallow Creek Barley Oat Drink",
            serving_size="1 cup (240mL)",
            servings_per_container=4,
            calories=120,
            total_fat_g=2.5,
            sodium_mg=100,
            total_carbs_g=24,
            sugars_g=7,
            protein_g=3,
        ),
    ),
    Product(
        slug="cold-brew",
        style="classic",
        kind="Near-zero label: dashes of 0g and a single serving",
        brand_line="NORTHPIER UNSWEETENED COLD BREW",
        serving_text="1 bottle (325mL)",
        truth=NutritionFacts(
            product_name="Northpier Unsweetened Cold Brew",
            serving_size="1 bottle (325mL)",
            servings_per_container=1,
            calories=5,
            total_fat_g=0,
            sodium_mg=15,
            total_carbs_g=1,
            sugars_g=0,
            protein_g=0,
        ),
    ),
]

BY_SLUG = {p.slug: p for p in PRODUCTS}
