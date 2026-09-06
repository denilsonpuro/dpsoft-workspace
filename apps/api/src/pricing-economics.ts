// Planning assumptions, not runtime metering or guaranteed profit.
export const pricingAssumptions = {
  model: "gpt-5.6-luna", inputPerMillion: 0.20, outputPerMillion: 1.20,
  inputTokensPerRun: 8000, outputTokensPerRun: 2000, retryFactor: 2,
  paymentRate: 0.065, paymentFixed: 0.50, contingencyRate: 0.05
} as const;
export function estimateContribution(price: number, runs: number, infrastructure: number, support: number) {
  const a = pricingAssumptions;
  const ai = runs * (a.inputTokensPerRun * a.inputPerMillion + a.outputTokensPerRun * a.outputPerMillion) / 1_000_000 * a.retryFactor;
  const payment = price * a.paymentRate + a.paymentFixed;
  const reserve = price * a.contingencyRate;
  const cost = ai + infrastructure + support + payment + reserve;
  return { ai, payment, reserve, cost, contribution: price - cost, margin: (price - cost) / price };
}
