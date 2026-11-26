import threading
import time

import httpx
import opik
import uvicorn

from app import PROJECT_NAME, create_app

PORT = 7100

CONVERSATIONS = {
    "patron-mystery-fan": [
        "Hi! I just finished a lighthouse mystery and loved it. What should I read next?",
        "Is there anything else by that same author?",
        "How long can I keep a book before it's due?",
    ],
    "patron-weekend-reader": [
        "I need something short for a weekend, under 200 pages.",
        "Something with a cozy, found-family feel, if possible.",
        "Do you have any good books about building a pizza oven?",
    ],
}


def main() -> None:
    server = uvicorn.Server(uvicorn.Config(create_app(), port=PORT, log_level="warning"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    while not server.started:
        time.sleep(0.1)

    with httpx.Client(base_url=f"http://localhost:{PORT}", timeout=60) as client:
        for session_id, turns in CONVERSATIONS.items():
            print(f"\n=== {session_id} ===")
            for message in turns:
                r = client.post("/chat", json={"message": message, "session_id": session_id})
                r.raise_for_status()
                print(f"\nPatron: {message}\nBot:    {r.json()['reply']}")

    # Tracers batch in the background; flush so short-lived runs don't lose the last turns.
    opik.flush_tracker()
    server.should_exit = True
    thread.join(timeout=5)
    print(f'\nDone. Open the "{PROJECT_NAME}" project in Opik, Threads tab.')


if __name__ == "__main__":
    main()
