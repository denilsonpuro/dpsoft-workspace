import { describe, expect, it } from "vitest";
import { validateOrigin } from "./pairing.js";
describe("pairing destination policy", () => {
  it("accepts an HTTPS origin", () => { expect(validateOrigin("https://dpsoft.space/")).toBe("https://dpsoft.space"); });
  it("rejects unencrypted URLs, embedded credentials and extra URL components", () => {
    for (const origin of ["http://dpsoft.space", "https://user:pass@dpsoft.space", "https://dpsoft.space/path", "https://dpsoft.space?token=x", "https://dpsoft.space#x", "file:///etc/passwd"]) expect(() => validateOrigin(origin)).toThrow();
  });
});
