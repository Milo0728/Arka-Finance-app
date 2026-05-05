import { describe, expect, it } from "vitest";
import { __test } from "@/store/useFinanceStore";

const { equalByIdAndUpdatedAt } = __test;

interface Row {
  id: string;
  updatedAt?: string;
  createdAt?: string;
}

describe("equalByIdAndUpdatedAt", () => {
  it("same reference → equal", () => {
    const a: Row[] = [{ id: "1", updatedAt: "2026-05-04" }];
    expect(equalByIdAndUpdatedAt(a, a)).toBe(true);
  });

  it("different lengths → not equal", () => {
    const a: Row[] = [{ id: "1" }];
    const b: Row[] = [{ id: "1" }, { id: "2" }];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(false);
  });

  it("same ids and same updatedAt at each position → equal", () => {
    const a: Row[] = [
      { id: "1", updatedAt: "2026-05-04T10:00Z" },
      { id: "2", updatedAt: "2026-05-04T11:00Z" },
    ];
    const b: Row[] = [
      { id: "1", updatedAt: "2026-05-04T10:00Z" },
      { id: "2", updatedAt: "2026-05-04T11:00Z" },
    ];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(true);
  });

  it("differs by id at any position → not equal", () => {
    const a: Row[] = [{ id: "1" }, { id: "2" }];
    const b: Row[] = [{ id: "1" }, { id: "3" }];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(false);
  });

  it("reordering → not equal (positional comparison)", () => {
    const a: Row[] = [{ id: "1" }, { id: "2" }];
    const b: Row[] = [{ id: "2" }, { id: "1" }];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(false);
  });

  it("differs by updatedAt → not equal", () => {
    const a: Row[] = [{ id: "1", updatedAt: "2026-05-04T10:00Z" }];
    const b: Row[] = [{ id: "1", updatedAt: "2026-05-04T11:00Z" }];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(false);
  });

  it("falls back to createdAt when updatedAt is missing", () => {
    const a: Row[] = [{ id: "1", createdAt: "2026-05-04T10:00Z" }];
    const b: Row[] = [{ id: "1", createdAt: "2026-05-04T10:00Z" }];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(true);

    const c: Row[] = [{ id: "1", createdAt: "2026-05-04T10:00Z" }];
    const d: Row[] = [{ id: "1", createdAt: "2026-05-05T10:00Z" }];
    expect(equalByIdAndUpdatedAt(c, d)).toBe(false);
  });

  it("both timestamps absent → equal as long as ids match", () => {
    const a: Row[] = [{ id: "1" }, { id: "2" }];
    const b: Row[] = [{ id: "1" }, { id: "2" }];
    expect(equalByIdAndUpdatedAt(a, b)).toBe(true);
  });

  it("empty vs empty → equal", () => {
    expect(equalByIdAndUpdatedAt<Row>([], [])).toBe(true);
  });
});
