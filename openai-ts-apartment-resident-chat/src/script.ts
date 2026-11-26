export type Conversation = {
  id: string;
  resident: string;
  questions: string[];
  rating: { value: number; reason: string };
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: "laundry-and-quiet-hours",
    resident: "unit-3B",
    questions: [
      "What time does the laundry room close?",
      "I start a night shift and get home at 21:30. Can I still start a wash?",
      "And if I run the dryer at 23:00, is that a noise problem?",
    ],
    rating: { value: 1, reason: "Resident thanked Lark and closed the chat" },
  },
  {
    id: "parking-and-packages",
    resident: "unit-5D",
    questions: [
      "I don't have a garage space. What are my options?",
      "My sister visits for a long weekend. How long can her car stay?",
      "Also a 30 kg treadmill is arriving Thursday. Where should it be delivered?",
    ],
    rating: { value: 0, reason: "Resident found the answer about how long her sister's car can stay confusing" },
  },
];

export type FeedbackScore = { id: string; name: string; value: number; reason: string };

export function ratingsFor(
  conversations: Conversation[],
  finalTraceIds: Map<string, string>,
): FeedbackScore[] {
  return conversations.flatMap((convo) => {
    const id = finalTraceIds.get(convo.id);
    return id ? [{ id, name: "resident-satisfaction", ...convo.rating }] : [];
  });
}
