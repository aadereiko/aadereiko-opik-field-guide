import dspy

from harbor_tide_qa.corpus import load_tables

TRAIN_TICKETS = [
    ("When is high water on a spring tide in the evening?",
     "19:07 | table: HT-1", "HT-1", "19:07"),
    ("How high does a neap high water reach?",
     "3.4 m | table: HT-2", "HT-2", "3.4 m"),
    ("What time is low water on springs?",
     "12:55 | table: LT-1", "LT-1", "12:55"),
    ("What is the deepest draught allowed over the Gull Bar?",
     "1.8 m | table: BAR-1", "BAR-1", "1.8 m"),
    ("Which VHF channel is used for lock calls?",
     "Channel 14 | table: LOCK-1", "LOCK-1", "14"),
    ("How fast does the ebb run in the Narrows?",
     "Up to 4 knots | table: FLOW-1", "FLOW-1", "4 knots"),
    ("How much is added to predicted heights under the amber pennant?",
     "0.6 m | table: WARN-1", "WARN-1", "0.6 m"),
    ("Which booklet edition of the tables is in force?",
     "TT-2026 | table: POST-1", "POST-1", "TT-2026"),
]

TEST_QUESTIONS = [
    ("At what tide height can the Gull Bar be crossed?",
     "BAR-1", "The answer gives a tide height of 2.5 m"),
    ("How long before high water does the Tern Lock open?",
     "LOCK-1", "The answer gives 90 minutes"),
    ("What time is the morning spring high water?",
     "HT-1", "The answer gives 06:42"),
    ("How much later does neap high water arrive than springs?",
     "HT-2", "The answer gives 50 minutes"),
    ("Below what tide height do the quay berths dry out?",
     "LT-1", "The answer gives 0.8 m"),
    ("How long does slack water last in the Narrows?",
     "FLOW-1", "The answer gives 20 minutes"),
    ("How long after high water does the Tern Lock close?",
     "LOCK-1", "The answer gives 30 minutes"),
    ("When are revised tables posted?",
     "POST-1", "The answer gives Monday at 08:00"),
]

GLOBAL_ASSERTIONS = [
    "The answer ends with a table tag of the exact form '| table: <ID>' "
    "citing exactly one table id, such as HT-1",
    "Apart from the table tag, the answer is one short phrase or sentence "
    "that directly gives the requested value, with no extra explanation",
]


def build_trainset() -> list[dspy.Example]:
    tables = load_tables()
    return [
        dspy.Example(
            context=tables, question=question, answer=answer,
            table=table, key_fact=key_fact,
        ).with_inputs("context", "question")
        for question, answer, table, key_fact in TRAIN_TICKETS
    ]
