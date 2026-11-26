from collections import defaultdict
from collections.abc import AsyncIterator

from openai import AsyncOpenAI
from opik import opik_context, track
from opik.integrations.openai import track_openai

from coach.prompts import MODEL, build_messages

# track_openai wraps the client: each completion becomes an llm span with token usage and cost,
# nested under the current trace. Streaming works because Opik records the span once the stream ends.
client = track_openai(AsyncOpenAI())
histories: dict[str, list[dict]] = defaultdict(list)


# @track on an async generator opens one trace per chat turn, closed when the stream is exhausted.
# Without it the llm span would land alone, with no per-turn trace root to hang a thread on.
@track(name="coach-turn", type="general")
async def stream_reply(conversation_id: str, user_message: str) -> AsyncIterator[str]:
    # thread_id groups every turn of one conversation into a single row in the Threads tab.
    opik_context.update_current_trace(thread_id=conversation_id)
    history = histories[conversation_id]
    messages = build_messages(history, user_message)
    stream = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        stream=True,
        temperature=0.4,
        stream_options={"include_usage": True},
    )
    parts: list[str] = []
    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            piece = chunk.choices[0].delta.content
            parts.append(piece)
            yield piece
    reply = "".join(parts)
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": reply})
    # Sets the trace input/output explicitly so the Threads view and online rules read one clean
    # user message and one assistant reply instead of the generator's raw chunk list.
    opik_context.update_current_trace(input={"message": user_message}, output={"reply": reply})
