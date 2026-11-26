import uuid
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True) or Path(__file__).resolve().parent.parent / ".env")

import os

os.environ.setdefault("OPIK_PROJECT_NAME", "openai-agents-insurance-claims")

import opik
from agents import Agent, Runner, set_trace_processors, trace
from opik.integrations.openai.agents import OpikTracingProcessor

from tools import estimate_payout, file_claim, lookup_policy

# OpikTracingProcessor receives every Agents SDK span: agent, handoff, function (tool) and
# generation (llm). Without it the SDK traces only to OpenAI's own dashboard, not Opik.
set_trace_processors([OpikTracingProcessor()])

MODEL = "gpt-4o-mini"

home_agent = Agent(
    name="Home Claims Agent",
    handoff_description="Handles home claims: water damage, fire, theft, storm.",
    instructions=(
        "You handle home insurance claims. Always lookup_policy first. If it is not covered "
        "or inactive, say so plainly. Otherwise ask for repair hours and parts cost if the "
        "customer has not given them, and never guess them. Call estimate_payout only with "
        "numbers the customer stated. Call file_claim only after the customer explicitly "
        "asks to file, and at most once per claim. Keep replies short."
    ),
    model=MODEL,
    tools=[lookup_policy, estimate_payout, file_claim],
)

auto_agent = Agent(
    name="Auto Claims Agent",
    handoff_description="Handles auto claims: collision, glass, theft of a vehicle.",
    instructions=(
        "You handle auto insurance claims. Always lookup_policy first. If it is not covered "
        "or inactive, say so plainly. Otherwise ask for repair hours and parts cost if the "
        "customer has not given them, and never guess them. Call estimate_payout only with "
        "numbers the customer stated. Call file_claim only after the customer explicitly "
        "asks to file, and at most once per claim. Keep replies short."
    ),
    model=MODEL,
    tools=[lookup_policy, estimate_payout, file_claim],
)

triage_agent = Agent(
    name="Intake Triage Agent",
    instructions=(
        "You are the intake desk of an insurance company. Decide if the claim is about a "
        "home or an auto policy and hand off to the matching specialist. Policy ids start "
        "with HO- for home and AU- for auto. Never answer claim questions yourself."
    ),
    model=MODEL,
    handoffs=[home_agent, auto_agent],
)

DEMO_CONVERSATIONS = {
    "kitchen-leak": [
        "Hi, policy HO-4471. A pipe burst in my kitchen and flooded the floor.",
        "Repairs need 12 hours of labor and $1800 in parts. What would I get paid? "
        "If it looks fine, file the claim.",
    ],
    "fender-bender": [
        "Policy AU-9082, someone backed into me in a parking lot, rear bumper is crushed.",
        "The shop says 6 hours and $700 in parts. Please file the claim.",
    ],
    "lapsed-policy": [
        "My windshield cracked on the highway. Policy AU-3317.",
    ],
    "storm-roof": [
        "Policy HO-5120, a storm took shingles off my roof.",
    ],
}


def run_demo() -> None:
    for conversation_id, user_turns in DEMO_CONVERSATIONS.items():
        thread_id = f"{conversation_id}-{uuid.uuid4().hex[:8]}"
        print(f"\n=== Conversation: {conversation_id} (thread {thread_id}) ===")
        conversation_input = []
        current_agent = triage_agent
        for user_message in user_turns:
            print(f"\nCustomer: {user_message}")
            conversation_input.append({"role": "user", "content": user_message})
            # group_id becomes the Opik thread id, so all turns of one conversation
            # appear as a single thread in the Threads tab instead of loose traces.
            with trace(workflow_name="Claim intake", group_id=thread_id):
                result = Runner.run_sync(current_agent, conversation_input)
            print(f"Agent ({result.last_agent.name}): {result.final_output}")
            conversation_input = result.to_input_list()
            # Resume with the specialist, not triage: restarting at triage let it answer claim math itself, with no tools.
            current_agent = result.last_agent


if __name__ == "__main__":
    try:
        run_demo()
    finally:
        # Traces are sent in batches in the background; flushing stops the last ones being lost at exit.
        opik.flush_tracker()
