import { reviewReport, saveReport } from "./report-action.js";
import { pairDevice, heartbeat } from "./pairing.js";

async function main() {
  const [command, directory, digest] = process.argv.slice(2);
  if (command === "status" && directory) {
    process.stdout.write(`${JSON.stringify(await heartbeat(directory))}\n`);
    return;
  }
  if (!["review", "execute", "pair"].includes(command ?? "")) throw new Error("Usage: review | execute DIRECTORY DIGEST | pair HTTPS_ORIGIN PRIVATE_DIRECTORY | status PRIVATE_DIRECTORY. Actions and pairing code are JSON on stdin.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += Buffer.byteLength(chunk);
    if (size > 2_000_000) throw new Error("Action payload exceeds 2 MB.");
    chunks.push(Buffer.from(chunk));
  }
  const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (command === "pair") {
    if (!directory || !digest) throw new Error("Pair requires HTTPS_ORIGIN and PRIVATE_DIRECTORY.");
    process.stdout.write(`${JSON.stringify(await pairDevice(directory, digest, input))}\n`);
    return;
  }
  if (command === "review") {
    process.stdout.write(`${JSON.stringify(reviewReport(input), null, 2)}\n`);
    return;
  }
  if (!directory || !digest) throw new Error("An existing output directory and exact approval digest are required.");
  process.stdout.write(`${JSON.stringify(await saveReport(input, directory, digest))}\n`);
}
main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : "Action failed"}\n`); process.exitCode = 1; });
