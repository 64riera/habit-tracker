"use client";

import { useCallback, useRef, useState } from "react";
import { formatMinutesShort } from "@/lib/focus/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (minutes: number) => void;
  ariaLabel: string;
};

/** Drag snaps to coarser steps as the range grows (a couple more minutes
 * matters at the short end, another quarter hour doesn't at the long end) —
 * arrow keys still move by exactly 1 minute regardless, for precise entry. */
const STEP_TIERS: { upTo: number; step: number }[] = [
  { upTo: 10, step: 1 },
  { upTo: 60, step: 5 },
  { upTo: Infinity, step: 15 },
];

function snapToStep(raw: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const tier = STEP_TIERS.find((t) => clamped <= t.upTo) ?? STEP_TIERS[STEP_TIERS.length - 1];
  const snapped = Math.round(clamped / tier.step) * tier.step;
  return Math.min(max, Math.max(min, snapped));
}

const RADIUS = 100;
const STROKE = 16;
const CX = RADIUS + STROKE;
const CY = RADIUS + STROKE;
const VIEW_W = CX * 2;
const VIEW_H = CY + STROKE * 1.5;
const TICK_STEP_MINUTES = 30;

/** 180deg at `min` (left end), 0deg at `max` (right end) — the dial reads
 * left-to-right like a clock face laid on its back. */
function valueToAngle(value: number, min: number, max: number): number {
  const t = (value - min) / (max - min);
  return 180 - t * 180;
}

// Rounded to avoid a last-bit floating point mismatch between the server's
// and the browser's Math.cos/sin implementations, which React's hydration
// treats as a real (if invisible) diff.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function pointOnArc(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: round(CX + r * Math.cos(rad)), y: round(CY - r * Math.sin(rad)) };
}

// Our arcs always start at 180deg (left) and end somewhere in [0,180], so the
// swept angle never exceeds 180deg: large-arc-flag is always 0. sweep-flag=1
// is what actually draws the top dome here (verified by rendering both —
// sweep=0 draws the short way around, not the arc through the top point).
function describeArc(startDeg: number, endDeg: number, r: number): string {
  if (Math.abs(startDeg - endDeg) < 0.01) return "";
  const start = pointOnArc(startDeg, r);
  const end = pointOnArc(endDeg, r);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

/** Pointer position (in viewBox units) -> angle in [0,180]. Pointers below
 * the baseline (dragged off the bottom of the dome) clamp to whichever end
 * they're closer to, instead of jumping erratically. */
function angleFromPoint(px: number, py: number): number {
  const dx = px - CX;
  const dy = CY - py;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle = dx < 0 ? 180 : 0;
  return Math.min(180, Math.max(0, angle));
}

export function FocusDurationDial({ value, min, max, onChange, ariaLabel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);

  const updateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const px = ((clientX - rect.left) / rect.width) * VIEW_W;
      const py = ((clientY - rect.top) / rect.height) * VIEW_H;
      const angle = angleFromPoint(px, py);
      const t = (180 - angle) / 180;
      const raw = min + t * (max - min);
      onChange(snapToStep(raw, min, max));
    },
    [min, max, onChange]
  );

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromClientPoint(e.clientX, e.clientY);
  }
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    updateFromClientPoint(e.clientX, e.clientY);
  }
  function handlePointerUp() {
    setDragging(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = value + 1;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = value - 1;
        break;
      case "PageUp":
        next = value + 15;
        break;
      case "PageDown":
        next = value - 15;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(Math.min(max, Math.max(min, next)));
  }

  const angle = valueToAngle(value, min, max);
  const handlePos = pointOnArc(angle, RADIUS);
  const trackPath = describeArc(180, 0, RADIUS);
  const progressPath = describeArc(180, angle, RADIUS);

  const ticks: number[] = [];
  for (let m = Math.ceil(min / TICK_STEP_MINUTES) * TICK_STEP_MINUTES; m < max; m += TICK_STEP_MINUTES) {
    if (m > min) ticks.push(m);
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={formatMinutesShort(value)}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="relative mx-auto w-full max-w-[260px] touch-none select-none outline-none"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full cursor-pointer"
        aria-hidden
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <path d={trackPath} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} strokeLinecap="round" />

        {ticks.map((m) => {
          const a = valueToAngle(m, min, max);
          const inner = pointOnArc(a, RADIUS - STROKE / 2 - 2);
          const outer = pointOnArc(a, RADIUS + STROKE / 2 + 2);
          return (
            <line
              key={m}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--color-surface)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}

        {progressPath && (
          <path d={progressPath} fill="none" stroke="var(--color-text)" strokeWidth={STROKE} strokeLinecap="round" />
        )}

        {focused && (
          <circle cx={handlePos.x} cy={handlePos.y} r={17} fill="none" stroke="var(--color-text)" strokeWidth={1.5} opacity={0.35} />
        )}
        <circle
          cx={handlePos.x}
          cy={handlePos.y}
          r={dragging ? 12 : 10}
          fill="var(--color-text)"
          stroke="var(--color-surface)"
          strokeWidth={3}
          className="transition-[r] duration-150 ease-out"
        />
      </svg>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-1.5 flex flex-col items-center transition-transform duration-150",
          dragging && "scale-[1.04]"
        )}
      >
        <span className="font-serif-italic text-[32px] leading-none font-semibold tabular-nums">
          {formatMinutesShort(value)}
        </span>
      </div>
    </div>
  );
}
