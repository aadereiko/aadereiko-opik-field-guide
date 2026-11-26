def normalize(answer: str) -> str:
    return answer.strip().lower().strip(".!\"'` *")


def family_accuracy(dataset_item: dict, llm_output: str) -> float:
    return 1.0 if normalize(llm_output) == dataset_item["label"] else 0.0
