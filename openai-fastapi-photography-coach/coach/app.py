from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

from fastapi import FastAPI  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from coach.chat import stream_reply  # noqa: E402

app = FastAPI(title="Lumen photography coach")


class ChatRequest(BaseModel):
    conversation_id: str
    message: str


@app.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_reply(request.conversation_id, request.message),
        media_type="text/plain; charset=utf-8",
    )


@app.get("/health")
async def health() -> dict:
    return {"ok": True}
