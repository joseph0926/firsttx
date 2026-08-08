import { describe, expect, it } from "vitest";
import { isSupportedLocale, routing } from "./routing";

describe("isSupportedLocale", () => {
  it("accepts every configured locale", () => {
    for (const locale of routing.locales) {
      expect(isSupportedLocale(locale)).toBe(true);
    }
  });

  it("rejects the segments that used to reach the landing page and crash it", () => {
    for (const segment of ["mockServiceWorker.js", "definitely-not-a-locale", "favicon.ico", ".well-known"]) {
      expect(isSupportedLocale(segment), `${segment} must not be treated as a locale`).toBe(false);
    }
  });

  it("rejects near-miss locale strings rather than coercing them", () => {
    for (const segment of ["", "KO", "ko-KR", "en-US", "kor", " ko"]) {
      expect(isSupportedLocale(segment), `${segment} must not be treated as a locale`).toBe(false);
    }
  });

  it("does not inherit matches from Object.prototype", () => {
    for (const segment of ["constructor", "toString", "__proto__"]) {
      expect(isSupportedLocale(segment), `${segment} must not be treated as a locale`).toBe(false);
    }
  });
});
