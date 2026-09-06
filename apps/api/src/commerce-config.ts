import { z } from "zod";
import { database } from "@dpsoft/database";
import type { AppConfig } from "./config.js";
import { requirePrincipal } from "./auth.js";
import type { FastifyRequest } from "fastify";

export const languageCodes = ["en", "pt", "fr", "es", "de"] as const;
export const currencyCode = z.string().regex(/^[A-Z]{3}$/).refine(value => Intl.supportedValuesOf("currency").includes(value), "Unsupported currency code");
export const commerceSchema = z.object({
  defaultLanguage: z.enum(languageCodes),
  defaultCurrency: currencyCode,
  displayCurrencies: z.array(currencyCode).min(1).max(100),
  // A manually priced access pass is separate from Stripe's recurring price.
  passAmountMinor: z.number().int().min(0).max(100_000_000),
  passCurrency: currencyCode,
  accessDays: z.number().int().min(1).max(366),
  gateways: z.object({ stripe: z.boolean(), paypal: z.boolean(), paystack: z.boolean(), offline: z.boolean() }),
  bankInstructions: z.string().max(4000)
}).strict().refine(value => value.displayCurrencies.includes(value.defaultCurrency), "Default currency must be enabled").refine(value => !value.gateways.offline || value.bankInstructions.trim().length >= 20, "Bank instructions are required").refine(value => !(value.gateways.paypal || value.gateways.paystack || value.gateways.offline) || value.passAmountMinor > 0, "A positive access-pass price is required");
export type CommerceConfiguration = z.infer<typeof commerceSchema>;
export const defaultCommerce: CommerceConfiguration = { defaultLanguage: "en", defaultCurrency: "USD", displayCurrencies: ["USD", "EUR", "GBP", "BRL", "AOA", "MZN", "CVE", "BWP", "ZAR", "NGN", "GHS", "KES", "XOF", "CAD", "MXN", "CHF"], passAmountMinor: 0, passCurrency: "USD", accessDays: 30, gateways: { stripe: true, paypal: false, paystack: false, offline: false }, bankInstructions: "" };
export async function commerceSettings() { const row = await database.commerceSettings.findUnique({ where: { id: "global" } }); return { version: row?.version ?? 0, configuration: row ? commerceSchema.parse(row.configuration) : defaultCommerce }; }
export function isPlatformAdmin(config: AppConfig, userId: string) { return (config.PLATFORM_ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean).includes(userId); }
export async function requirePlatformAdmin(request: FastifyRequest, config: AppConfig) { const principal = await requirePrincipal(request); if (!isPlatformAdmin(config, principal.userId)) throw Object.assign(new Error("Platform administrator access is required."), { statusCode: 403, code: "PLATFORM_ADMIN_REQUIRED" }); return principal; }
export function minorDigits(currency: string) { return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2; }
export function majorAmount(minor: number, currency: string) { return (minor / 10 ** minorDigits(currency)).toFixed(minorDigits(currency)); }
