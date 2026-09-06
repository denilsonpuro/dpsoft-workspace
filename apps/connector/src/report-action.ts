import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";

const inputSchema = z.object({
  tool: z.literal("save_text_report"),
  filename: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.txt$/),
  content: z.string().min(1).max(1_000_000)
}).strict();

export function reviewReport(input: unknown) {
  const action = inputSchema.parse(input);
  const digest = createHash("sha256").update(JSON.stringify(action)).digest("hex");
  return { action, digest };
}

// The directory must already exist and be explicitly selected by the operator.
// No overwrite, arbitrary file extension, shell command or network access.
export async function saveReport(input: unknown, directory: string, approvedDigest: string) {
  const { action, digest } = reviewReport(input);
  if (approvedDigest !== digest) throw new Error("Approval does not match the exact report payload.");
  const root = await realpath(directory);
  const destination = join(root, action.filename);
  const file = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { await file.writeFile(action.content, "utf8"); await file.sync(); }
  finally { await file.close(); }
  return { status: "completed", tool: action.tool, destination, sha256: createHash("sha256").update(action.content).digest("hex") };
}
