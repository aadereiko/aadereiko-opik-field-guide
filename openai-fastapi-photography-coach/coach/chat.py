from collections import defaultdict
from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from coach.prompts import MODEL, build_messages

client = AsyncOpenAI()
histories: dict[str, list[dict]] = defaultdict(list)


async def stream_reply(conversation_id: str, user_message: str) -> AsyncIterator[str]:
    history = histories[conversation_id]
    messages = build_messages(history, user_message)
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        stream=True,
        temperature=0.4,
    )
    parts: list[str] = []
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            piece = chunk.choices[0].delta.content
            parts.append(piece)
            yield piece
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": "".join(parts)})
