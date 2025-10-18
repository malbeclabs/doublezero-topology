/**
 * Unit tests for data completeness classification logic
 *
 * Tests the classifyDataCompleteness function that determines
 * which data sources are available for each link.
 */

import { describe, it, expect } from "vitest";
import { classifyDataCompleteness } from "@/lib/topology/data-completeness";

describe("classifyDataCompleteness", () => {
  it("should classify as COMPLETE when all data sources are available", () => {
    const result = classifyDataCompleteness(true, true);
    expect(result).toBe("COMPLETE");
  });

  it("should classify as MISSING_ISIS when telemetry is available but ISIS is not", () => {
    const result = classifyDataCompleteness(true, false);
    expect(result).toBe("MISSING_ISIS");
  });

  it("should classify as MISSING_TELEMETRY when ISIS is available but telemetry is not", () => {
    const result = classifyDataCompleteness(false, true);
    expect(result).toBe("MISSING_TELEMETRY");
  });

  it("should classify as MISSING_BOTH when both telemetry and ISIS are missing", () => {
    const result = classifyDataCompleteness(false, false);
    expect(result).toBe("MISSING_BOTH");
  });
});

describe("classifyDataCompleteness - edge cases", () => {
  it("should handle multiple MISSING_ISIS cases consistently", () => {
    expect(classifyDataCompleteness(true, false)).toBe("MISSING_ISIS");
    expect(classifyDataCompleteness(true, false)).toBe("MISSING_ISIS");
  });

  it("should handle multiple MISSING_TELEMETRY cases consistently", () => {
    expect(classifyDataCompleteness(false, true)).toBe("MISSING_TELEMETRY");
    expect(classifyDataCompleteness(false, true)).toBe("MISSING_TELEMETRY");
  });

  it("should handle multiple MISSING_BOTH cases consistently", () => {
    expect(classifyDataCompleteness(false, false)).toBe("MISSING_BOTH");
    expect(classifyDataCompleteness(false, false)).toBe("MISSING_BOTH");
  });

  it("should handle multiple COMPLETE cases consistently", () => {
    expect(classifyDataCompleteness(true, true)).toBe("COMPLETE");
    expect(classifyDataCompleteness(true, true)).toBe("COMPLETE");
  });
});

describe("Data completeness priority", () => {
  it("should prioritize MISSING_ISIS over other statuses when telemetry is available", () => {
    // When telemetry is available but ISIS is not, it should be MISSING_ISIS
    // This is high priority for network operators
    const result = classifyDataCompleteness(true, false);
    expect(result).toBe("MISSING_ISIS");
  });

  it("should classify MISSING_BOTH when neither telemetry nor ISIS are available", () => {
    // Worst case scenario - no operational data at all
    const result = classifyDataCompleteness(false, false);
    expect(result).toBe("MISSING_BOTH");
  });
});
