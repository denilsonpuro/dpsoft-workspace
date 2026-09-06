import { describe, expect, it } from "vitest";
import { validateConnectorTarget } from "./postgres.js";

describe("PostgreSQL connector target policy", () => {
  it("rejects non-PostgreSQL protocols", () => {
    expect(() => validateConnectorTarget("https://database.example.com", false)).toThrow("Only PostgreSQL");
  });

  it("blocks private targets in cloud mode", () => {
    expect(() => validateConnectorTarget("postgresql://reader:secret@127.0.0.1/finance", false)).toThrow("Local Connector");
  });

  it("allows an explicit private target in local development mode", () => {
    expect(() => validateConnectorTarget("postgresql://reader:secret@localhost/finance", true)).not.toThrow();
  });
});
