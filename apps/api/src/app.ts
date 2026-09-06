import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import Fastify, { type FastifyError } from "fastify";
import type { AppConfig } from "./config.js";
import { registerRoutes } from "./routes.js";
import { database } from "@dpsoft/database";
import { ZodError } from "zod";
import { registerBilling } from "./billing.js";
import { registerCommerce } from "./commerce.js";
import { proxyTrust } from "./proxy-trust.js";

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: config.NODE_ENV !== "test" ? { level: config.LOG_LEVEL, redact: ["req.headers.authorization", "req.headers.cookie", "body.password", "body.token"] } : false,
    genReqId: (request) => String(request.headers["x-request-id"] ?? randomUUID()),
    trustProxy: proxyTrust(config.TRUST_PROXY_HOPS)
  });
  await app.register(helmet);
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(cookie, { secret: config.SESSION_SECRET });

  app.addHook("onRequest", async (request) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && origin !== config.WEB_ORIGIN) {
      throw Object.assign(new Error("The request origin is not allowed."), { statusCode: 403, code: "INVALID_ORIGIN" });
    }
  });

  app.get("/live", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try { await database.$queryRaw`SELECT 1`; return reply.code(200).send({ status: "ready", checks: { api: "ok", database: "ok" } }); }
    catch { return reply.code(503).send({ status: "not_ready", checks: { api: "ok", database: "unavailable" } }); }
  });
  app.get("/health", async (request) => ({ status: "operational", service: "dpsoft-api", version: "0.1.0", requestId: request.id }));
  app.get("/api/v1", async (request) => ({ name: "DPsoft API", version: "v1", requestId: request.id }));
  await registerRoutes(app, config);
  await registerBilling(app, config);
  await registerCommerce(app, config);

  app.setNotFoundHandler(async (request, reply) => reply.code(404).send({ error: { code: "NOT_FOUND", message: "The requested resource was not found.", requestId: request.id } }));
  app.setErrorHandler(async (error: FastifyError, request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: { code: "INVALID_INPUT", message: "Review the supplied fields and try again.", requestId: request.id } });
    request.log.error({ err: error }, "request failed");
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode <= 599 ? error.statusCode : 500;
    return reply.code(status).send({ error: { code: error.code ?? "INTERNAL_ERROR", message: status < 500 || status === 502 || status === 503 ? error.message : "The request could not be completed.", requestId: request.id } });
  });
  return app;
}
