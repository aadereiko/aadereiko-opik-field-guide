import json
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

EXAMPLE_DIR = Path(__file__).resolve().parent
DATA_DIR = EXAMPLE_DIR / "data"

load_dotenv(find_dotenv())

from openai import OpenAI

from calls import RADIO_CALLS
from logbook import EXTRACTION_PROMPT, LogEntry, entry_to_dict, format_entry, parse_entry

TTS_MODEL = "gpt-4o-mini-tts"
TRANSCRIBE_MODEL = "whisper-1"
EXTRACT_MODEL = "gpt-4o-mini"

client = OpenAI()


def synthesize_audio(call: dict, audio_path: Path) -> None:
    audio = b""
    for _speaker, voice, text in call["segments"]:
        response = client.audio.speech.create(
            model=TTS_MODEL, voice=voice, input=text, response_format="mp3"
        )
        audio += response.content
    audio_path.write_bytes(audio)


def transcribe(audio_path: Path) -> str:
    with audio_path.open("rb") as audio_file:
        return client.audio.transcriptions.create(
            model=TRANSCRIBE_MODEL, file=audio_file, response_format="text"
        )


def extract_entry(transcript: str) -> LogEntry:
    response = client.chat.completions.create(
        model=EXTRACT_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_PROMPT},
            {"role": "user", "content": transcript},
        ],
        response_format={"type": "json_object"},
    )
    return parse_entry(response.choices[0].message.content)


def log_radio_call(call: dict) -> dict:
    audio_path = DATA_DIR / f"{call['id']}.mp3"
    if not audio_path.exists():
        synthesize_audio(call, audio_path)

    transcript = transcribe(audio_path)
    entry = extract_entry(transcript)

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
