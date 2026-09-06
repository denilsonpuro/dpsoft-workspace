import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

describe("health API", () => {
  it("returns a request-correlated health response", async () => {
    const app = await buildApp({ NODE_ENV: "test", API_PORT: 4000, WEB_ORIGIN: "http://localhost:3000", LOG_LEVEL: "silent", SESSION_SECRET: "test-session-secret-is-long-enough-123", CREDENTIAL_ENCRYPTION_KEY: "test-encryption-secret-is-long-1234", COOKIE_SECURE: false, ALLOW_PRIVATE_CONNECTOR_HOSTS: false, OPENAI_MODEL: "test-model" });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health", headers: { "x-request-id": "REQ-TEST" } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "operational", requestId: "REQ-TEST" });
  });
});
