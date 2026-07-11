import { Heatmap } from "@/components/heatmap/heatmap";
import type { DayCell } from "@/lib/queries/history";
import { toISODate } from "@/lib/date";

/** Deterministic PRNG (mulberry32): same result on server and client,
 * unlike Math.random(), which would break hydration. */
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

/** Sample data for the landing page, in the same shape getHeatmapRange()
 * produces: multi-week streaks, the occasional gap, and a few "hollow"
 * days (everything justified/frozen), like a real account would have. */
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
  return <Heatmap cells={DEMO_CELLS} animateIn />;
}
