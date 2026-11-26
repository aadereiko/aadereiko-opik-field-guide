import json
import os
from functools import lru_cache
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

EXAMPLE_DIR = Path(__file__).resolve().parent
DATA_DIR = EXAMPLE_DIR / "data"

load_dotenv(find_dotenv())
# The project name must be set before opik is imported, or traces go to "Default Project".
os.environ["OPIK_PROJECT_NAME"] = "whisper-rescue-radio-log"

import opik
from openai import OpenAI
from opik import Attachment, opik_context
from opik.integrations.openai import track_openai

from calls import RADIO_CALLS
from logbook import EXTRACTION_PROMPT, LogEntry, entry_to_dict, format_entry, parse_entry

TTS_MODEL = "gpt-4o-mini-tts"
TRANSCRIBE_MODEL = "whisper-1"
EXTRACT_MODEL = "gpt-4o-mini"

@lru_cache
def get_client() -> OpenAI:
    # track_openai wraps the client: every TTS and chat call becomes a child llm span under
    # the running tracked function, with token usage and cost. Whisper calls are not wrapped.
    return track_openai(OpenAI())


# @opik.track opens a "general" span named synthesize-audio that groups the per-turn TTS spans.
@opik.track(name="synthesize-audio")
def synthesize_audio(call: dict, audio_path: Path) -> None:
    audio = b""
    for _speaker, voice, text in call["segments"]:
        response = get_client().audio.speech.create(
            model=TTS_MODEL, voice=voice, input=text, response_format="mp3"
        )
        audio += response.content
    audio_path.write_bytes(audio)


@opik.track(name="transcribe")
def transcribe(audio_path: Path) -> str:
    with audio_path.open("rb") as audio_file:
        return get_client().audio.transcriptions.create(
            model=TRANSCRIBE_MODEL, file=audio_file, response_format="text"
        )


@opik.track(name="extract-entry")
def extract_entry(transcript: str) -> LogEntry:
    response = get_client().chat.completions.create(
        model=EXTRACT_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": transcript},
        ],
        response_format={"type": "json_object"},
    )
    return parse_entry(response.choices[0].message.content)


# The outermost tracked function: one call to it is one trace in the project.
@opik.track(name="log-radio-call")
def log_radio_call(call: dict) -> dict:
    audio_path = DATA_DIR / f"{call['id']}.mp3"
    if not audio_path.exists():
        synthesize_audio(call, audio_path)

    transcript = transcribe(audio_path)
    entry = extract_entry(transcript)

    # Attachment uploads the MP3 to the trace, where the UI plays it inline.
    opik_context.update_current_trace(
        attachments=[Attachment(data=str(audio_path), content_type="audio/mpeg")]
    )

    result = {"call": call["title"], "transcript": transcript, "entry": entry_to_dict(entry)}
    (DATA_DIR / f"{call['id']}.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    DATA_DIR.mkdir(exist_ok=True)
    for call in RADIO_CALLS:
        print(f"\n=== {call['title']} ===")
        result = log_radio_call(call)
        print(f"Heard: {result['transcript'].strip()}\n")
        print(format_entry(parse_entry(json.dumps(result["entry"]))))
    # Traces are sent in the background; flush so a short script doesn't exit before they upload.
    opik.flush_tracker()
