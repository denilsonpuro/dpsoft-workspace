import { describe, expect, it } from "vitest";
import { deviceBearer } from "./local-devices.js";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
describe("device boundary", () => {
  it("only accepts the exact device bearer format", () => {
    expect(deviceBearer(`Bearer ${"a".repeat(43)}`)).toBe("a".repeat(43));
    for (const value of [undefined, "Basic abc", "Bearer short", `Bearer ${"a".repeat(43)} extra`]) expect(() => deviceBearer(value)).toThrow();
  });
  it("rejects anonymous management and heartbeat without a device token", async () => {
    const app = await buildApp(readConfig({ NODE_ENV: "test" }));
    try {
      for (const [method, url] of [["GET", "/api/v1/devices"], ["POST", "/api/v1/devices/pairing"], ["DELETE", "/api/v1/devices/550e8400-e29b-41d4-a716-446655440000"], ["POST", "/api/v1/devices/heartbeat"]] as const) expect((await app.inject({ method, url })).statusCode).toBe(401);
    } finally { await app.close(); }
  });
});
