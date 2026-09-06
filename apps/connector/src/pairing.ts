import { constants } from "node:fs";
import { open, realpath, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export function validateOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Use an HTTPS origin without credentials, path, query or fragment.");
  return url.origin;
}
const credentialsSchema = z.object({ origin: z.string(), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), device: z.object({ id: z.string().uuid(), name: z.string(), organizationId: z.string().uuid() }), expiresAt: z.string().datetime() });

async function credentialPath(directory: string) {
  const root = await realpath(directory);
  const info = await stat(root);
  if (!info.isDirectory() || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) throw new Error("Choose an existing private directory owned by you, with permissions 700.");
  return join(root, "device.json");
}
export async function pairDevice(origin: string, directory: string, input: unknown) {
  const endpoint = validateOrigin(origin);
  const { code } = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict().parse(input);
  const destination = await credentialPath(directory);
  const file = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try {
    const response = await fetch(`${endpoint}/api/v1/devices/claim`, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Pairing failed (${response.status}). Generate a new code if the previous attempt was consumed.`);
    const claimed = credentialsSchema.omit({ origin: true }).parse(await response.json());
    const credential = { ...claimed, origin: endpoint };
    await file.writeFile(JSON.stringify(credential), "utf8");
    await file.sync();
    return { deviceId: credential.device.id, name: credential.device.name, expiresAt: credential.expiresAt, capabilities: ["heartbeat"] };
  } catch (error) {
    await file.close();
    await unlink(destination);
    throw error;
  } finally { await file.close(); }
}
export async function heartbeat(directory: string) {
  const file = await open(await credentialPath(directory), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 10_000 || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) throw new Error("Credential file must be a private regular file owned by you.");
    const credentials = credentialsSchema.parse(JSON.parse(await file.readFile("utf8")));
    const origin = validateOrigin(credentials.origin);
    if (new Date(credentials.expiresAt) <= new Date()) throw new Error("Device credential expired. Pair again.");
    const response = await fetch(`${origin}/api/v1/devices/heartbeat`, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${credentials.token}` }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Device connection rejected (${response.status}). Check expiry, revocation and owner membership.`);
    return await response.json();
  } finally { await file.close(); }
}
