import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, hashPassword, verifyPassword } from "./security.js";

describe("credential security", () => {
  it("encrypts connector credentials with authenticated encryption", () => {
    const secret = "a-production-shaped-secret-with-32-chars";
    const cleartext = { connectionString: "postgresql://readonly:secret@database/finance" };
    const encrypted = encryptJson(cleartext, secret);
    expect(encrypted.toString("utf8")).not.toContain("readonly");
    expect(decryptJson(encrypted, secret)).toEqual(cleartext);
  });

  it("hashes and verifies passwords without storing plaintext", async () => {
    const hash = await hashPassword("a-long-demo-password");
    expect(hash).not.toContain("a-long-demo-password");
    await expect(verifyPassword("a-long-demo-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
