import { describe, expect, it } from "vitest";
import { extractOpenAiText } from "./routes.js";

describe("extractOpenAiText", () => {
  it("extracts output_text content from a raw Responses API payload", () => {
    expect(extractOpenAiText({
      id: "resp_1",
      output: [{ type: "message", content: [{ type: "output_text", text: "BWP 482,500.00" }] }],
    })).toBe("BWP 482,500.00");
  });

  it("prefers the SDK convenience field when present", () => {
    expect(extractOpenAiText({ id: "resp_2", output_text: "verified" })).toBe("verified");
  });
});
