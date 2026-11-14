import b1 from "@/assets/backs/back-01.jpg.asset.json";
import b2 from "@/assets/backs/back-02.jpg.asset.json";
import b3 from "@/assets/backs/back-03.jpg.asset.json";
import b4 from "@/assets/backs/back-04.jpg.asset.json";
import b5 from "@/assets/backs/back-05.jpg.asset.json";
import b6 from "@/assets/backs/back-06.jpg.asset.json";
import b7 from "@/assets/backs/back-07.jpg.asset.json";
import b8 from "@/assets/backs/back-08.jpg.asset.json";
import b9 from "@/assets/backs/back-09.jpg.asset.json";
import b10 from "@/assets/backs/back-10.jpg.asset.json";
import b11 from "@/assets/backs/back-11.jpg.asset.json";

/** Printed card backs (рубашки), one per rubric number 1..11. */
const BACKS = [b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11].map((b) => b.url);
export const cardBack = (rubricNo: number) => BACKS[(rubricNo - 1 + BACKS.length) % BACKS.length] ?? BACKS[0];
export const ALL_BACKS = BACKS;
