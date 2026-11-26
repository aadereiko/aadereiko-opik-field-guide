from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv(usecwd=True))

from smolagents import CodeAgent, OpenAIServerModel  # noqa: E402

from farm import BRIEFING, QUESTIONS  # noqa: E402


def build_agent() -> CodeAgent:
    return CodeAgent(
        tools=[],
        model=OpenAIServerModel(model_id="gpt-4o-mini"),
        additional_authorized_imports=["pandas"],
        max_steps=6,
    )


def main() -> None:
    agent = build_agent()
    for i, question in enumerate(QUESTIONS, 1):
        print(f"\nQuestion {i}: {question}")
        answer = agent.run(BRIEFING + "\nQuestion: " + question, reset=True)
        print(f"Answer {i}: {answer}")


if __name__ == "__main__":
    main()
