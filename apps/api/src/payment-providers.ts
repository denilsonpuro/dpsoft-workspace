import type { AppConfig } from "./config.js";
import { majorAmount } from "./commerce-config.js";
import { z } from "zod";

const providerPayload = z.object({ access_token: z.string().optional(), id: z.string().optional(), status: z.union([z.string(), z.boolean()]).optional(), links: z.array(z.object({ rel: z.string(), href: z.string() })).optional(), purchase_units: z.array(z.object({ reference_id: z.string().optional(), custom_id: z.string().optional(), payments: z.object({ captures: z.array(z.object({ status: z.string(), amount: z.object({ currency_code: z.string(), value: z.string() }) })).optional() }).optional() })).optional(), data: z.object({ authorization_url: z.string().optional(), status: z.string().optional(), reference: z.string().optional(), currency: z.string().optional(), amount: z.number().optional() }).optional() });

type Payment = { id: string; amountMinor: number; currency: string; providerReference: string | null };
const providerError = () => Object.assign(new Error("The payment provider could not confirm this operation. No access has been granted."), { statusCode: 502, code: "PAYMENT_PROVIDER_ERROR" });
async function jsonRequest(url: string, init: RequestInit) {
  const result = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
  if (!result.ok) throw providerError();
  return providerPayload.parse(await result.json());
}
async function paypal(config: AppConfig) {
  if (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET) throw providerError();
  const origin = config.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const token = await jsonRequest(`${origin}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  if (typeof token.access_token !== "string") throw providerError();
  return { origin, headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" } };
}
export async function initializePayPal(config: AppConfig, payment: Payment) {
  const api = await paypal(config);
  const order = await jsonRequest(`${api.origin}/v2/checkout/orders`, { method: "POST", headers: { ...api.headers, "PayPal-Request-Id": payment.id }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ reference_id: payment.id, custom_id: payment.id, amount: { currency_code: payment.currency, value: majorAmount(payment.amountMinor, payment.currency) } }], payment_source: { paypal: { experience_context: { return_url: `${config.WEB_ORIGIN}/workspace?billing=return&payment=${payment.id}`, cancel_url: `${config.WEB_ORIGIN}/workspace?billing=cancelled`, user_action: "PAY_NOW" } } } }) });
  const url = order.links?.find((link: { rel: string }) => ["payer-action", "approve"].includes(link.rel))?.href;
  if (typeof order.id !== "string" || typeof url !== "string") throw providerError();
  return { reference: order.id as string, url: url as string };
}
export async function verifyPayPal(config: AppConfig, payment: Payment) {
  const api = await paypal(config); const path = `${api.origin}/v2/checkout/orders/${encodeURIComponent(payment.providerReference!)}`;
  let order = await jsonRequest(path, { headers: api.headers });
  if (order.status === "APPROVED") order = await jsonRequest(`${path}/capture`, { method: "POST", headers: { ...api.headers, "PayPal-Request-Id": `capture-${payment.id}` }, body: "{}" });
  const unit = order.purchase_units?.find(entry => entry.reference_id === payment.id);
  const capture = unit?.payments?.captures?.find((entry: { status: string }) => entry.status === "COMPLETED");
  return order.status === "COMPLETED" && unit?.custom_id === payment.id && capture?.amount?.currency_code === payment.currency && capture?.amount?.value === majorAmount(payment.amountMinor, payment.currency);
}
export async function initializePaystack(config: AppConfig, payment: Payment, email: string) {
  if (!config.PAYSTACK_SECRET_KEY) throw providerError();
  const response = await jsonRequest("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, amount: payment.amountMinor, currency: payment.currency, reference: payment.id, callback_url: `${config.WEB_ORIGIN}/workspace?billing=return&payment=${payment.id}`, metadata: { paymentId: payment.id } }) });
  if (!response.status || typeof response.data?.authorization_url !== "string") throw providerError();
  return { reference: payment.id, url: response.data.authorization_url as string };
}
export async function verifyPaystack(config: AppConfig, payment: Payment) {
  const response = await jsonRequest(`https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.providerReference!)}`, { headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}` } });
  return response.status === true && response.data?.status === "success" && response.data?.reference === payment.id && response.data?.currency === payment.currency && response.data?.amount === payment.amountMinor;
}
