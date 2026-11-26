from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

import os  # noqa: E402

# Must be set before the first traced call; every trace then lands in this Opik project.
os.environ.setdefault("OPIK_PROJECT_NAME", "openai-fastapi-photography-coach")

from contextlib import asynccontextmanager  # noqa: E402

import opik  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from coach.chat import stream_reply  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    # Opik sends traces from a background thread; flushing on shutdown stops the last turns being lost.
    opik.flush_tracker()


app = FastAPI(title="Lumen photography coach", lifespan=lifespan)


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
