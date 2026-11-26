export type FairProject = { id: string; student: string; grade: number; title: string; summary: string };

export const FAIR_PROJECTS: FairProject[] = [
  {
    id: "bean-sprouts",
    student: "Marisol",
    grade: 6,
    title: "Do bean sprouts grow faster under blue or red light?",
    summary:
      "I grew 6 bean seeds under blue film and 6 under red film for 10 days. The blue ones were 14 cm on average and the red ones 9 cm. I measured once a day with a ruler. I think blue light is better for plants.",
  },
  {
    id: "paper-planes",
    student: "Tobias",
    grade: 7,
    title: "Which paper plane folds fly the farthest?",
    summary:
      "I tested three folds: dart, glider and wide-wing. Each one was thrown 5 times from the same hallway spot. The dart flew 7.2 m on average, the glider 5.1 m and the wide-wing 3.8 m. My little brother threw the wide-wing ones because I was busy timing.",
  },
  {
    id: "salt-ice",
    student: "Anneke",
    grade: 5,
    title: "Does salt really melt ice faster?",
    summary:
      "I put one ice cube on a plate with salt and one on a plate with nothing. After 20 minutes the salted cube was smaller. So salt melts ice faster. My mom says it is because of the cold.",
  },
  {
    id: "soda-battery",
    student: "Ravi",
    grade: 8,
    title: "Can a lemon, a potato and an apple power a small LED?",
    summary:
      "I pushed a copper nail and a zinc nail into each fruit and vegetable and connected them in series to an LED. The lemon lit the LED for 41 minutes, the potato for 63 minutes and the apple never lit it. I used a multimeter to record 0.9 V from the lemon and 0.8 V from the potato.",
  },
  {
    id: "sunscreen-beads",
    student: "Imogen",
    grade: 7,
    title: "Does SPF number change how fast UV beads change color?",
    summary:
      "I smeared sunscreens with SPF 15, 30 and 50 on clear bags holding UV beads and set them in the sun. The SPF 50 bag took 4 minutes to reach full color, SPF 15 took 2 minutes. I did it on one sunny afternoon. I did not test a bag without sunscreen.",
  },
];

export function describeProject(project: FairProject): string {
  return [
    `Student: ${project.student} (grade ${project.grade})`,
    `Project title: ${project.title}`,
    `Project summary: ${project.summary}`,
  ].join("\n");
}
