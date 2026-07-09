import { describe, expect, it } from "vitest";
import { bucketHourOfDay } from "./time-of-day";

describe("bucketHourOfDay", () => {
  it("buckets the night wraparound correctly", () => {
    expect(bucketHourOfDay(0)).toBe("night");
    expect(bucketHourOfDay(4)).toBe("night");
    expect(bucketHourOfDay(22)).toBe("night");
    expect(bucketHourOfDay(23)).toBe("night");
  });

  it("buckets the morning range correctly", () => {
    expect(bucketHourOfDay(5)).toBe("morning");
    expect(bucketHourOfDay(11)).toBe("morning");
  });

  it("buckets the afternoon range correctly", () => {
    expect(bucketHourOfDay(12)).toBe("afternoon");
    expect(bucketHourOfDay(17)).toBe("afternoon");
  });

  it("buckets the evening range correctly", () => {
    expect(bucketHourOfDay(18)).toBe("evening");
    expect(bucketHourOfDay(21)).toBe("evening");
  });
});
