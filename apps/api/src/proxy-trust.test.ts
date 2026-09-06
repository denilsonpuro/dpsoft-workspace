import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { proxyTrust } from "./proxy-trust.js";

describe("bounded proxy trust", () => {
  it("ignores forwarded client IPs by default", async () => {
    const app = Fastify({ trustProxy: proxyTrust() });
    try {
      app.get("/", async (request) => ({ ip: request.ip }));
      const response = await app.inject({ url: "/", headers: { "x-forwarded-for": "198.51.100.1" } });
      expect(response.json().ip).toBe("127.0.0.1");
    } finally { await app.close(); }
  });
  it("trusts only the configured two proxy hops, not a spoofed prefix", async () => {
    const app = Fastify({ trustProxy: proxyTrust(2) });
    try {
      app.get("/", async (request) => ({ ip: request.ip }));
      const response = await app.inject({ url: "/", headers: { "x-forwarded-for": "203.0.113.99, 198.51.100.1, 172.18.0.1" } });
      expect(response.json().ip).toBe("198.51.100.1");
    } finally { await app.close(); }
  });
});
