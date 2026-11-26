import json
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx

PORT = 7090
BASE = f"http://127.0.0.1:{PORT}"


def wait_for_server() -> None:
    for _ in range(60):
        try:
            with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
                return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError("server did not start")


def play(conversations: list[dict]) -> None:
    with httpx.Client(timeout=60) as http:
        for convo in conversations:
            print(f"\n=== {convo['conversation_id']} ===")
            for turn in convo["turns"]:
                print(f"\nYou: {turn}\nLumen: ", end="", flush=True)
                with http.stream(
                    "POST",
                    f"{BASE}/chat",
                    json={"conversation_id": convo["conversation_id"], "message": turn},
                ) as response:
                    response.raise_for_status()
                    for piece in response.iter_text():
                        print(piece, end="", flush=True)
                print()


def main() -> None:
    conversations = json.loads(Path("data/conversations.json").read_text())
    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "coach.app:app", "--port", str(PORT), "--log-level", "warning"]
    )
    try:
        wait_for_server()
        play(conversations)
    finally:
        server.terminate()
        server.wait(timeout=30)


if __name__ == "__main__":
    main()
