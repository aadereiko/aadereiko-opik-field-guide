export const FEEDBACK_ASSERTIONS = [
  "The feedback refers to a specific detail of this project (a measurement, a method step or a result), not just generic praise",
  "The feedback is 4 sentences or fewer",
  "The feedback does not give a grade, score, ranking or prediction of a prize",
  "The feedback names one concrete change the student could make to the experiment, instead of rewriting the project for them",
];

export function countSentences(text: string): number {
  const matches = text.trim().match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return (matches ?? []).filter((part) => /\w/.test(part)).length;
}
