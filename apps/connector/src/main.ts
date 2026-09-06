import { reviewReport, saveReport } from "./report-action.js";

async function main() {
  const [command, directory, digest] = process.argv.slice(2);
  if (command !== "review" && command !== "execute") throw new Error("Usage: connector review | connector execute APPROVED_DIRECTORY APPROVAL_SHA256. Supply action JSON on stdin.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += Buffer.byteLength(chunk);
    if (size > 2_000_000) throw new Error("Action payload exceeds 2 MB.");
    chunks.push(Buffer.from(chunk));
  }
  const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (command === "review") {
    process.stdout.write(`${JSON.stringify(reviewReport(input), null, 2)}\n`);
    return;
  }
  if (!directory || !digest) throw new Error("An existing output directory and exact approval digest are required.");
  process.stdout.write(`${JSON.stringify(await saveReport(input, directory, digest))}\n`);
}
main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : "Action failed"}\n`); process.exitCode = 1; });
