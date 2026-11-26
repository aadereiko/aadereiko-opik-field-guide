import base64
from pathlib import Path

from nutrilabel import config

config.load_env()

from openai import OpenAI  # noqa: E402

from nutrilabel.schema import NutritionFacts, json_schema  # noqa: E402

SYSTEM_PROMPT = """\
You read photos of packaged-food nutrition labels and return typed fields.
Read only what is printed on the image. Never guess or invent a value.

- product_name: the product name printed on the label, in normal capitalisation.
- serving_size: the serving size text as printed, for example "1/2 cup (55g)".
- servings_per_container: a number. For "about 6" return 6.
- calories: the calories for ONE serving.
- total_fat_g, sodium_mg, total_carbs_g, sugars_g, protein_g: amounts for ONE
  serving. If the label has a per-serving and a per-container column, use the
  per-serving column. Never return a %DV percentage as an amount.
- Use 0 when the label prints 0 or a dash."""

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def encode_image(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


def extract_facts(image_path: str | Path) -> NutritionFacts:
    path = Path(image_path)
    response = get_client().chat.completions.create(
        model=config.MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract the fields from this nutrition label."},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{encode_image(path)}", "detail": "high"},
                    },
                ],
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "nutrition_facts", "strict": True, "schema": json_schema()},
        },
    )
    return NutritionFacts.model_validate_json(response.choices[0].message.content)
