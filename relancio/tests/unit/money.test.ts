import { describe, expect, it } from "vitest";
import { computeHtCents, computeTtcCents, formatCents, parseAmountToCents, parseVatRateToBp, centsToInput } from "@/lib/domain/money";

describe("parseAmountToCents", () => {
  it.each([
    ["1 234,56 €", 123456],
    ["1234,5", 123450],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["12500", 1250000],
    ["12 500 € HT", 1250000],
    ["1 234,00", 123400],
    ["3450.00", 345000],
    ["1.234", 123400],
    ["0.5", 50],
    ["1 234 567,89", 123456789],
    ["-12,50", -1250],
    ["99,999", 10000],
  ])("%s → %d", (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "12a", "1,2,3"])("rejette %s", (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });
});

describe("TVA", () => {
  it("lit les taux", () => {
    expect(parseVatRateToBp("20 %")).toBe(2000);
    expect(parseVatRateToBp("5,5")).toBe(550);
    expect(parseVatRateToBp("0.1")).toBe(1000);
    expect(parseVatRateToBp("abc")).toBeNull();
  });
  it("calcule TTC et HT au centime", () => {
    expect(computeTtcCents(345000, 1000)).toBe(379500);
    expect(computeTtcCents(1280000, 550)).toBe(1350400);
    expect(computeHtCents(1350400, 550)).toBe(1280000);
    expect(computeTtcCents(333, 2000)).toBe(400);
  });
});

describe("formatage", () => {
  it("formate en euros français", () => {
    expect(formatCents(123456).replace(/\s/g, " ")).toBe("1 234,56 €");
    expect(formatCents(null)).toBe("—");
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(120000)).toBe("1200");
  });
});
