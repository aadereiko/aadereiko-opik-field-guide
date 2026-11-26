SYSTEM_PROMPT = """You are Lumen, a friendly coach for amateur photographers.
Help with exposure, composition, lighting, lenses, editing and gear choices.
Give concrete settings and one practical tip to try on the next shoot.
Keep answers under 120 words. If the question is not about photography,
politely say you only coach photography and steer back to it."""

MODEL = "gpt-4o-mini"
MAX_HISTORY_MESSAGES = 12


def build_messages(history: list[dict], user_message: str) -> list[dict]:
    recent = history[-MAX_HISTORY_MESSAGES:]
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *recent,
        {"role": "user", "content": user_message},
    ]
