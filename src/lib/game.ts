import cardsData from "@/data/cards.json";
import skillsData from "@/data/skills.json";

export const GAME_TITLE = "Раппорт Beauty";

export type Card = {
  id: string;
  rubric_no: number;
  rubric: string;
  title: string;
  situation: string;
  dialogue: { who: string; line: string }[];
  author?: string;
};

export type Skill = {
  id: string;
  title: string;
  formula: string;
  description: string;
  how_to_apply: string[];
  why_learn: string;
  tags: string[];
};

export const cards = cardsData as Card[];
export const skills = skillsData as Skill[];

export const rubrics = Array.from(
  new Map(cards.map((c) => [c.rubric_no, c.rubric])).entries(),
).map(([no, name]) => ({ no, name }));

/** Hue per rubric so each category has its own colour. */
export const rubricHue = (no: number) => Math.round(20 + ((no - 1) * 50) / 10);
