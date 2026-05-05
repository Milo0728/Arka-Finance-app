import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CURRENCY,
  FALLBACK_RATES,
  convert,
  fetchRates,
  fromUSD,
  toUSD,
} from "@/lib/exchange";

const fixedRates = {
  ...FALLBACK_RATES,
  USD: 1,
  EUR: 0.9,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("convert / fromUSD / toUSD", () => {
  it("returns the input unchanged when from === to", () => {
    expect(convert(100, "USD", "USD", fixedRates)).toBe(100);
  });

  it("round-trips USD ⇄ EUR using the rate table", () => {
    const eur = fromUSD(100, "EUR", fixedRates);
    expect(eur).toBeCloseTo(90, 5);
    expect(toUSD(eur, "EUR", fixedRates)).toBeCloseTo(100, 5);
  });

  it("convert between two non-USD currencies anchors via USD", () => {
    // EUR=0.9, MXN=18 → 90 EUR = 100 USD = 1800 MXN.
    const rates = { ...FALLBACK_RATES, EUR: 0.9, MXN: 18, USD: 1 };
    expect(convert(90, "EUR", "MXN", rates)).toBeCloseTo(1800, 5);
  });

  it("falls back to a rate of 1 when a currency is missing from the table", () => {
    const rates = { ...FALLBACK_RATES };
    // Manually drop a key to simulate a corrupt rates map.
    delete (rates as Record<string, number>).EUR;
    // toUSD divides by the missing rate (treated as 1) → identity.
    expect(toUSD(100, "EUR", rates)).toBe(100);
  });

  it("BASE_CURRENCY is USD (storage anchor)", () => {
    expect(BASE_CURRENCY).toBe("USD");
  });
});

describe("fetchRates", () => {
  it("returns 'live' rates when the API responds with a non-empty rates object", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          rates: { EUR: 0.95, GBP: 0.82, MXN: 17.5 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchRates();
    expect(result.source).toBe("live");
    expect(result.rates.EUR).toBe(0.95);
    expect(result.rates.GBP).toBe(0.82);
    expect(result.rates.MXN).toBe(17.5);
    // Currencies the API didn't return must fall back to the static table.
    expect(result.rates.ARS).toBe(FALLBACK_RATES.ARS);
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall = fetchMock.mock.calls[0] as unknown as [string];
    const url = firstCall[0];
    expect(url).toContain("frankfurter");
    expect(url).toContain("base=USD");
  });

  it("returns 'fallback' when the API response has no rates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ rates: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    const result = await fetchRates();
    expect(result.source).toBe("fallback");
    expect(result.rates).toEqual(FALLBACK_RATES);
  });

  it("returns 'fallback' on HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500 }))
    );
    const result = await fetchRates();
    expect(result.source).toBe("fallback");
    expect(result.rates).toEqual(FALLBACK_RATES);
  });

  it("returns 'fallback' on network errors (catches throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    const result = await fetchRates();
    expect(result.source).toBe("fallback");
    expect(result.rates).toEqual(FALLBACK_RATES);
  });

  it("ignores non-numeric or non-positive rates returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            rates: { EUR: 0.9, GBP: 0, MXN: -1, BRL: "garbage" as unknown as number },
          }),
          { status: 200 }
        )
      )
    );
    const result = await fetchRates();
    expect(result.source).toBe("live"); // EUR was a valid live quote.
    expect(result.rates.EUR).toBe(0.9);
    // Invalid quotes must keep the static fallback value.
    expect(result.rates.GBP).toBe(FALLBACK_RATES.GBP);
    expect(result.rates.MXN).toBe(FALLBACK_RATES.MXN);
    expect(result.rates.BRL).toBe(FALLBACK_RATES.BRL);
  });
});
