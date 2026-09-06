import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { reviewReport, saveReport } from "./report-action.js";
const input = { tool: "save_text_report", filename: "report.txt", content: "Observed revenue: 100 USD" };
describe("approved local report action", () => {
  it("writes a real file only with matching approval and never overwrites", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dpsoft-report-test-"));
    try {
      const { digest } = reviewReport(input);
      await expect(saveReport(input, directory, "wrong")).rejects.toThrow("Approval");
      await expect(saveReport({ ...input, content: "changed" }, directory, digest)).rejects.toThrow("Approval");
      await saveReport(input, directory, digest);
      expect(await readFile(join(directory, "report.txt"), "utf8")).toBe(input.content);
      await expect(saveReport(input, directory, digest)).rejects.toThrow();
    } finally { await rm(directory, { recursive: true }); }
  });
  it("rejects traversal, executable filenames and unexpected fields", () => {
    for (const filename of ["../report.txt", "/tmp/report.txt", "run.sh", ".hidden.txt"]) expect(() => reviewReport({ ...input, filename })).toThrow();
    expect(() => reviewReport({ ...input, command: "whoami" })).toThrow();
  });
  it("does not follow a destination symlink", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dpsoft-symlink-test-"));
    try {
      await symlink(join(directory, "target.txt"), join(directory, "report.txt"));
      await expect(saveReport(input, directory, reviewReport(input).digest)).rejects.toThrow();
    } finally { await rm(directory, { recursive: true }); }
  });
});
