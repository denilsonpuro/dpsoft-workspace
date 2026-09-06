import { describe, expect, it } from "vitest";
import type { ConnectorHealth } from "./connector.js";

describe("connector health contract", () => {
  it("represents an enrolled outbound connector", () => {
    const health: ConnectorHealth = { state: "CONNECTED", checkedAt: "2026-09-02T00:00:00.000Z", latencyMs: 12, version: "0.1.0", details: {} };
    expect(health.state).toBe("CONNECTED");
  });
});
