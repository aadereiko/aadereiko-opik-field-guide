import opik

from rulebook.settings import PDF_DIR, configure_environment

configure_environment()

from rulebook import engine, suite  # noqa: E402

def main() -> None:
    engine.install_tracing()
    query_engine = engine.build_query_engine(PDF_DIR)
    answer = engine.make_answerer(query_engine)

    for question in [
        "What is the registration fee?",
        "How many ends are in a regular-season game?",
        "What is the league's policy on sweeping noise?",
    ]:
        result = answer(question)
        print(f"Q: {question}\nA: {result['answer']}\n")

    client = opik.Opik()
    rule_suite = suite.build_suite(client)
    suite.print_summary(suite.run_suite(rule_suite, answer))

    # Traces are sent in batches from a background thread; without a flush the process can exit first.
    opik.flush_tracker()


if __name__ == "__main__":
    main()
