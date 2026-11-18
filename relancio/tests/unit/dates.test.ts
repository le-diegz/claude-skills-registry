import { describe, expect, it } from "vitest";
import { parseFrenchDate, parisDayKey, startOfParisDay, formatDate } from "@/lib/domain/dates";

describe("parseFrenchDate", () => {
  it.each([
    ["31/12/2026", "2026-12-31"],
    ["1/2/2026", "2026-02-01"],
    ["05/03/26", "2026-03-05"],
    ["05-03-2026", "2026-03-05"],
    ["05.03.2026", "2026-03-05"],
    ["2026-03-05", "2026-03-05"],
    ["2026-03-05T10:00:00Z", "2026-03-05"],
    ["05/03/2026 14:30", "2026-03-05"],
    ["12 nov. 2026", "2026-11-12"],
    ["3 février 2026", "2026-02-03"],
  ])("%s → %s", (input, expected) => {
    expect(parseFrenchDate(input)).toBe(expected);
  });
  it.each(["31/02/2026", "13/13/2026", "hier", "", "2026/31/12"])("rejette %s", (input) => {
    expect(parseFrenchDate(input)).toBeNull();
  });
});

describe("fuseau Europe/Paris", () => {
  it("un instant UTC tard le soir appartient au lendemain à Paris", () => {
    expect(parisDayKey("2026-06-30T22:30:00Z")).toBe("2026-07-01");
    expect(parisDayKey("2026-12-31T22:30:00Z")).toBe("2026-12-31");
  });
  it("début de journée Paris en heure d'été et d'hiver", () => {
    expect(startOfParisDay("2026-07-01T10:00:00Z").toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(startOfParisDay("2026-12-01T10:00:00Z").toISOString()).toBe("2026-11-30T23:00:00.000Z");
  });
  it("formate en français", () => {
    expect(formatDate("2026-11-04")).toBe("4 nov. 2026");
  });
});
