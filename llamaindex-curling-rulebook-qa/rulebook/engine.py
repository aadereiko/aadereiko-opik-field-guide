import pathlib

import opik
from llama_index.core import Settings, SimpleDirectoryReader, VectorStoreIndex, set_global_handler
from llama_index.llms.openai import OpenAI

from . import corpus
from .settings import MODEL, TOP_K

ANSWER_INSTRUCTIONS = (
    "You answer questions about a curling league's rulebook. Answer only from the retrieved rule "
    "excerpts. Cite the rule number (for example G-3.4) and quote figures exactly. If the excerpts do "
    "not cover the question, say so."
)


def install_tracing() -> None:
    # One call makes LlamaIndex emit retrieve, embedding, synthesize and llm events to Opik,
    # which become nested spans under one trace per query.
    set_global_handler("opik")


def build_query_engine(pdf_dir: pathlib.Path):
    if not list(pdf_dir.glob("*.pdf")):
        corpus.generate_pdfs(pdf_dir)
    Settings.llm = OpenAI(model=MODEL, temperature=0.0)
    # input_files, not input_dir: the directory scan skips every path that has a hidden
    # (dot-prefixed) folder anywhere above the PDFs and then raises "No files found".
    documents = SimpleDirectoryReader(input_files=sorted(str(p) for p in pdf_dir.glob("*.pdf"))).load_data()
    return VectorStoreIndex.from_documents(documents).as_query_engine(similarity_top_k=TOP_K)


def format_question(question: str) -> str:
    return f"{ANSWER_INSTRUCTIONS}\n\nQuestion: {question}"


def make_answerer(query_engine):
    # The engine is captured in a closure, not passed as an argument: @opik.track serializes
    # arguments into the span input, and a whole index would bloat or break the payload.
    # The decorator makes one parent trace per question; LlamaIndex spans nest under it.
    @opik.track(name="rulebook_answer", type="general")
    def answer(question: str) -> dict:
        response = query_engine.query(format_question(question))
        return {
            "answer": str(response),
            "retrieved_excerpts": [node.text for node in response.source_nodes],
        }

    return answer
