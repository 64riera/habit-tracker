import { Heatmap } from "@/components/heatmap/heatmap";
import type { DayCell } from "@/lib/queries/history";
import { toISODate } from "@/lib/date";

/** PRNG determinístico (mulberry32): mismo resultado en servidor y cliente,
 * a diferencia de Math.random(), que rompería la hidratación. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEEKS = 18;
const DAYS = WEEKS * 7;

/** Datos de muestra para la landing, con la misma forma que produce
 * getHeatmapRange(): rachas de varias semanas, algún bache y algunos días
 * "hollow" (todo justificado/congelado), como en una cuenta real. */
function buildDemoCells(): DayCell[] {
  const random = mulberry32(20260710);
  const today = new Date();
  const cells: DayCell[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const roll = random();
    let level: DayCell["level"];
    if (roll < 0.14) level = 0;
    else if (roll < 0.3) level = 1;
    else if (roll < 0.5) level = 2;
    else if (roll < 0.74) level = 3;
    else level = 4;
    const allJustified = level > 0 && random() < 0.08;
    cells.push({ date: toISODate(date), level, allJustified });
  }

  return cells;
}

const DEMO_CELLS = buildDemoCells();

export function HeatmapPreview() {
  return <Heatmap cells={DEMO_CELLS} />;
}
