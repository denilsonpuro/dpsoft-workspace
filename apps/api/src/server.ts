import "dotenv/config";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const app = await buildApp(config);
await app.listen({ host: "0.0.0.0", port: config.API_PORT });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
