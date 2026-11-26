import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))
if not os.getenv("OPIK_URL_OVERRIDE"):
    load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableConfig, RunnableLambda, RunnableSequence
from opik.integrations.langchain import OpikTracer
from pydantic import BaseModel

from catalog import format_catalog, load_catalog

PROJECT_NAME = "langchain-fastapi-library-books-chat"
STATIC_DIR = Path(__file__).parent / "static"

SYSTEM_PROMPT = """You are the book-recommendation assistant on the website of the
Marlowe Street Public Library. Keep replies to 2-4 short sentences.

Only recommend books from this catalog, and mention the title and author:
{catalog}

If nothing in the catalog fits, say so honestly. Never invent titles.
Books are loaned for 21 days and can be renewed once online."""

sessions: dict[str, list] = {}


def load_session_history(message: str, config: RunnableConfig) -> dict:
    session_id = config["configurable"]["session_id"]
    return {"history": sessions.setdefault(session_id, []), "message": message}


def build_chain(llm):
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder("history"),
            ("human", "{message}"),
        ]
    ).partial(catalog=format_catalog(load_catalog()))
    # str in, str out: the root run's input/output are plain text, which is
    # what the Threads view shows as the transcript for each turn.
    return RunnableSequence(
        RunnableLambda(load_session_history).with_config(run_name="load-session-history"),
        prompt,
        llm,
        StrOutputParser(),
    )


def make_tracer(session_id: str) -> OpikTracer:
    # thread_id groups every turn of one patron into a single Opik thread;
    # without it each POST /chat shows up as an unrelated trace.
    return OpikTracer(project_name=PROJECT_NAME, thread_id=session_id)


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str


def create_app(llm=None) -> FastAPI:
    if llm is None:
        from langchain_openai import ChatOpenAI

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    chain = build_chain(llm)
    api = FastAPI(title="Marlowe Street Library chat")

    @api.get("/")
    def index():
        return FileResponse(STATIC_DIR / "index.html")

    @api.post("/chat", response_model=ChatResponse)
    def chat(req: ChatRequest):
        if not req.message.strip() or not req.session_id.strip():
            raise HTTPException(400, "message and session_id must be non-empty")
        reply = chain.invoke(
            req.message,
            config={
                # The tracer turns the whole chain run into one trace with a span per step (prompt, llm with usage and cost, parser).
                "callbacks": [make_tracer(req.session_id)],
                "run_name": "library-chat-turn",
                "configurable": {"session_id": req.session_id},
            },
        )
        sessions[req.session_id].extend([HumanMessage(req.message), AIMessage(reply)])
        return ChatResponse(reply=reply, session_id=req.session_id)

    return api


def get_app() -> FastAPI:
    return create_app()
