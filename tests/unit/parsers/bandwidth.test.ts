/**
 * Unit tests for bandwidth parsing utilities
 * Following TDD: Tests written before implementation
 */

import { describe, it, expect } from "vitest";
import {
  parseBandwidthToGbps,
  formatBandwidth,
  getBandwidthTier,
} from "@/lib/parsers/bandwidth";

describe("parseBandwidthToGbps", () => {
  describe("numeric input (bits per second)", () => {
    it("should convert 10 Gbps from bps", () => {
      expect(parseBandwidthToGbps(10000000000)).toBe(10);
    });

    it("should convert 100 Gbps from bps", () => {
      expect(parseBandwidthToGbps(100000000000)).toBe(100);
    });

    it("should convert 50 Gbps from bps", () => {
      expect(parseBandwidthToGbps(50000000000)).toBe(50);
    });

    it("should convert 200 Gbps from bps", () => {
      expect(parseBandwidthToGbps(200000000000)).toBe(200);
    });

    it("should convert 1 Gbps from bps", () => {
      expect(parseBandwidthToGbps(1000000000)).toBe(1);
    });

    it("should handle fractional Gbps", () => {
      expect(parseBandwidthToGbps(2500000000)).toBe(2.5);
    });

    it("should handle 400 Gbps", () => {
      expect(parseBandwidthToGbps(400000000000)).toBe(400);
    });

    it("should handle zero", () => {
      expect(parseBandwidthToGbps(0)).toBe(0);
    });
  });

  describe("string input (various formats)", () => {
    it("should parse '100G'", () => {
      expect(parseBandwidthToGbps("100G")).toBe(100);
    });

    it("should parse '100GE'", () => {
      expect(parseBandwidthToGbps("100GE")).toBe(100);
    });

    it("should parse '100 Gbps'", () => {
      expect(parseBandwidthToGbps("100 Gbps")).toBe(100);
    });

    it("should parse '100Gbps'", () => {
      expect(parseBandwidthToGbps("100Gbps")).toBe(100);
    });

    it("should parse '10G'", () => {
      expect(parseBandwidthToGbps("10G")).toBe(10);
    });

    it("should parse '40GE'", () => {
      expect(parseBandwidthToGbps("40GE")).toBe(40);
    });

    it("should parse '1000M' as 1 Gbps", () => {
      expect(parseBandwidthToGbps("1000M")).toBe(1);
    });

    it("should parse '1000 Mbps' as 1 Gbps", () => {
      expect(parseBandwidthToGbps("1000 Mbps")).toBe(1);
    });

    it("should parse '2500M' as 2.5 Gbps", () => {
      expect(parseBandwidthToGbps("2500M")).toBe(2.5);
    });

    it("should handle fractional values '2.5G'", () => {
      expect(parseBandwidthToGbps("2.5G")).toBe(2.5);
    });

    it("should handle fractional values '10.5 Gbps'", () => {
      expect(parseBandwidthToGbps("10.5 Gbps")).toBe(10.5);
    });

    it("should be case insensitive", () => {
      expect(parseBandwidthToGbps("100gbps")).toBe(100);
      expect(parseBandwidthToGbps("100GBPS")).toBe(100);
      expect(parseBandwidthToGbps("100gE")).toBe(100);
    });

    it("should handle extra whitespace", () => {
      expect(parseBandwidthToGbps("  100  Gbps  ")).toBe(100);
    });
  });

  describe("null and undefined handling", () => {
    it("should return null for null input", () => {
      expect(parseBandwidthToGbps(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(parseBandwidthToGbps(undefined)).toBeNull();
    });
  });

  describe("invalid input handling", () => {
    it("should return null for unrecognized string format", () => {
      expect(parseBandwidthToGbps("invalid")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseBandwidthToGbps("")).toBeNull();
    });

    it("should return null for string without number", () => {
      expect(parseBandwidthToGbps("Gbps")).toBeNull();
    });
  });
});

describe("formatBandwidth", () => {
  it("should format 10 Gbps", () => {
    expect(formatBandwidth(10)).toBe("10 Gbps");
  });

  it("should format 100 Gbps", () => {
    expect(formatBandwidth(100)).toBe("100 Gbps");
  });

  it("should format 50 Gbps", () => {
    expect(formatBandwidth(50)).toBe("50 Gbps");
  });

  it("should format 200 Gbps", () => {
    expect(formatBandwidth(200)).toBe("200 Gbps");
  });

  it("should format 1 Gbps", () => {
    expect(formatBandwidth(1)).toBe("1 Gbps");
  });

  it("should format 400 Gbps", () => {
    expect(formatBandwidth(400)).toBe("400 Gbps");
  });

  it("should format fractional Gbps", () => {
    expect(formatBandwidth(2.5)).toBe("2.5 Gbps");
  });

  it("should format values < 1 Gbps as Mbps", () => {
    expect(formatBandwidth(0.5)).toBe("500 Mbps");
  });

  it("should format 0.1 Gbps as 100 Mbps", () => {
    expect(formatBandwidth(0.1)).toBe("100 Mbps");
  });

  it("should format 0.025 Gbps as 25 Mbps", () => {
    expect(formatBandwidth(0.025)).toBe("25 Mbps");
  });

  it("should return 'Unknown' for null", () => {
    expect(formatBandwidth(null)).toBe("Unknown");
  });

  it("should format 0 as '0 Mbps'", () => {
    expect(formatBandwidth(0)).toBe("0 Mbps");
  });
});

describe("getBandwidthTier", () => {
  it("should return 10 for 10 Gbps link", () => {
    expect(getBandwidthTier(10)).toBe(10);
  });

  it("should return 10 for links < 50 Gbps", () => {
    expect(getBandwidthTier(1)).toBe(10);
    expect(getBandwidthTier(5)).toBe(10);
    expect(getBandwidthTier(25)).toBe(10);
    expect(getBandwidthTier(49)).toBe(10);
  });

  it("should return 50 for 50 Gbps link", () => {
    expect(getBandwidthTier(50)).toBe(50);
  });

  it("should return 50 for links 50-99 Gbps", () => {
    expect(getBandwidthTier(60)).toBe(50);
    expect(getBandwidthTier(75)).toBe(50);
    expect(getBandwidthTier(99)).toBe(50);
  });

  it("should return 100 for 100 Gbps link", () => {
    expect(getBandwidthTier(100)).toBe(100);
  });

  it("should return 100 for links 100-199 Gbps", () => {
    expect(getBandwidthTier(120)).toBe(100);
    expect(getBandwidthTier(150)).toBe(100);
    expect(getBandwidthTier(199)).toBe(100);
  });

  it("should return 200 for 200 Gbps link", () => {
    expect(getBandwidthTier(200)).toBe(200);
  });

  it("should return 200 for links >= 200 Gbps", () => {
    expect(getBandwidthTier(250)).toBe(200);
    expect(getBandwidthTier(400)).toBe(200);
    expect(getBandwidthTier(800)).toBe(200);
  });

  it("should return 0 for null", () => {
    expect(getBandwidthTier(null)).toBe(0);
  });

  it("should return 10 for 0 Gbps", () => {
    expect(getBandwidthTier(0)).toBe(10);
  });

  it("should handle edge case at 49.99 Gbps", () => {
    expect(getBandwidthTier(49.99)).toBe(10);
  });

  it("should handle edge case at 50.01 Gbps", () => {
    expect(getBandwidthTier(50.01)).toBe(50);
  });

  it("should handle edge case at 99.99 Gbps", () => {
    expect(getBandwidthTier(99.99)).toBe(50);
  });

  it("should handle edge case at 100.01 Gbps", () => {
    expect(getBandwidthTier(100.01)).toBe(100);
  });

  it("should handle edge case at 199.99 Gbps", () => {
    expect(getBandwidthTier(199.99)).toBe(100);
  });

  it("should handle edge case at 200.01 Gbps", () => {
    expect(getBandwidthTier(200.01)).toBe(200);
  });
});
