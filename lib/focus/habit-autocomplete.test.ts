import { describe, expect, it } from "vitest";
import {
  BINARY_HABIT_AUTO_COMPLETE_MINUTES,
  habitAutoCompleteThresholdSeconds,
  shouldAutoCompleteHabit,
} from "./habit-autocomplete";

describe("habitAutoCompleteThresholdSeconds", () => {
  it("is 20 minutes for binary habits, regardless of goalTarget", () => {
    expect(habitAutoCompleteThresholdSeconds({ goalType: "binary", goalTarget: null })).toBe(
      BINARY_HABIT_AUTO_COMPLETE_MINUTES * 60
    );
  });

  it("is the habit's own target (in minutes, converted to seconds) for duration habits", () => {
    expect(habitAutoCompleteThresholdSeconds({ goalType: "duration", goalTarget: 15 })).toBe(15 * 60);
  });

  it("is null for a duration habit with no target set", () => {
    expect(habitAutoCompleteThresholdSeconds({ goalType: "duration", goalTarget: null })).toBeNull();
  });

  it("is null for quantitative habits — not driven by focus time", () => {
    expect(habitAutoCompleteThresholdSeconds({ goalType: "quantitative", goalTarget: 10 })).toBeNull();
  });
});

describe("shouldAutoCompleteHabit", () => {
  it("a binary habit does not complete at exactly 20 minutes", () => {
    expect(shouldAutoCompleteHabit(20 * 60, { goalType: "binary", goalTarget: null })).toBe(false);
  });

  it("a binary habit completes the first second past 20 minutes", () => {
    expect(shouldAutoCompleteHabit(20 * 60 + 1, { goalType: "binary", goalTarget: null })).toBe(true);
  });

  it("a duration habit does not complete at exactly its target", () => {
    expect(shouldAutoCompleteHabit(15 * 60, { goalType: "duration", goalTarget: 15 })).toBe(false);
  });

  it("a duration habit completes the first second past its target", () => {
    expect(shouldAutoCompleteHabit(15 * 60 + 1, { goalType: "duration", goalTarget: 15 })).toBe(true);
  });

  it("a quantitative habit never auto-completes from focus time", () => {
    expect(shouldAutoCompleteHabit(999_999, { goalType: "quantitative", goalTarget: 10 })).toBe(false);
  });
});
