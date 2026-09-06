import type { AppConfig } from "./config.js";

export const planCatalog = [
  { id: "essential", name: "Essential", amount: 3900, currency: "usd", interval: "month", proposedMonthlyRuns: 500 },
  { id: "business", name: "Business", amount: 9900, currency: "usd", interval: "month", proposedMonthlyRuns: 1500 },
  { id: "scale", name: "Scale", amount: 24900, currency: "usd", interval: "month", proposedMonthlyRuns: 4000 }
] as const;
export type PlanId = typeof planCatalog[number]["id"];
export function configuredPrice(config: AppConfig, id: PlanId): string | undefined {
  return ({ essential: config.STRIPE_PRICE_ESSENTIAL || config.STRIPE_PRICE_ID, business: config.STRIPE_PRICE_BUSINESS, scale: config.STRIPE_PRICE_SCALE })[id];
}
export function configuredPrices(config: AppConfig): string[] {
  return [...new Set(planCatalog.map(p => configuredPrice(config, p.id)).filter((p): p is string => Boolean(p)))];
}
