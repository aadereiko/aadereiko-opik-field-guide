export interface Character {
  id: string;
  name: string;
  race: string;
  charClass: string;
  age: number;
  traits: string[];
  outfit: string;
  signatureProp: string;
}

export const PROMPT_NAME = "rpg-portrait-brief";

export const BRIEF_V1 = `Portrait of {{name}}, a {{age}}-year-old {{race}} {{charClass}}.
Personality: {{traits}}.
Wearing {{outfit}}, carrying {{signature_prop}}.
Fantasy tabletop RPG character art.`;

export const BRIEF_V2 = `Portrait of {{name}}, a {{age}}-year-old {{race}} {{charClass}}.
Personality, shown through expression and posture: {{traits}}.
Wearing {{outfit}}, with {{signature_prop}} clearly visible near the shoulder.

Style rules:
- Painterly digital illustration, warm lamplight, soft brush texture.
- Head-and-shoulders bust, centered, facing three-quarters toward the viewer.
- Plain dark charcoal background with no scenery.
- No text, letters, runes, borders, frames or watermarks anywhere in the image.
- Both eyes visible and in focus.`;

export const V2_CHANGE_DESCRIPTION =
  "Add house style: painterly bust, charcoal background, no text or frames, eyes in focus";

export const PARTY: Character[] = [
  {
    id: "thessaly",
    name: "Thessaly Vane",
    race: "half-elf",
    charClass: "rogue",
    age: 29,
    traits: ["wry", "watchful", "quietly generous"],
    outfit: "a patched slate-grey travelling cloak over a dark leather jerkin",
    signatureProp: "a brass lockpick roll",
  },
  {
    id: "brom",
    name: "Brom Ironquill",
    race: "dwarf",
    charClass: "bard",
    age: 74,
    traits: ["boisterous", "sentimental", "proud of his beard"],
    outfit: "a wine-red doublet with copper buttons",
    signatureProp: "a battered lute strapped across his back",
  },
  {
    id: "ysolde",
    name: "Ysolde Marrowmoth",
    race: "tiefling",
    charClass: "druid",
    age: 41,
    traits: ["serene", "curious", "slightly unsettling"],
    outfit: "a robe stitched from moss-green linen and pale feathers",
    signatureProp: "a gnarled staff hung with small glass bells",
  },
];
