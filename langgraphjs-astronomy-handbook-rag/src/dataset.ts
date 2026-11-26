export type QAItem = {
  question: string;
  expected_output: string;
};

export const DATASET_NAME = "langgraphjs-astronomy-handbook-rag";

export const DATASET_ITEMS: QAItem[] = [
  {
    question: "How long should I let a reflector cool down before observing?",
    expected_output: "Set the scope outside 45 minutes before observing, with the dust cover off.",
  },
  {
    question: "What is the maximum brightness of a torch on the observing field?",
    expected_output: "Torches brighter than 5 lumens are not allowed; only dimmable red lights may be used.",
  },
  {
    question: "How much does a Household membership cost and who does it cover?",
    expected_output: "It costs 55 pounds a year and covers up to 4 people living at one address.",
  },
  {
    question: "Which telescopes are in the loan fleet and how long can I keep one?",
    expected_output:
      "A 6-inch Dobsonian, an 8-inch Dobsonian, a 90 mm refractor and a 5-inch Maksutov, for up to 21 days.",
  },
  {
    question: "What happens to my borrowing rights if I return a telescope two weeks late?",
    expected_output: "You lose 1 week of borrowing rights for each week it is overdue, so 2 weeks.",
  },
  {
    question: "What magnification does the 25 mm eyepiece give in a 1200 mm focal length scope?",
    expected_output: "It gives 48x.",
  },
  {
    question: "How many objects does it take to earn the Observer Award?",
    expected_output: "The Observer Award needs 50 logged objects.",
  },
  {
    question: "Does the society run a trip to see the total solar eclipse?",
    expected_output: "The handbook does not say; the assistant should admit it does not know.",
  },
];
