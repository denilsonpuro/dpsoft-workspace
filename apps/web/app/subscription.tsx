"use client";
import { useLocale, LocalPrice } from "./locale";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PaymentMethods } from "./commerce-ui";
import { PlanCatalog } from "./plan-catalog";
import { ArrowUpRight, CreditCard, RefreshCw } from "lucide-react";
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Plan = {
    name: string;
    amount: number;
    currency: string;
    interval: string;
    intervalCount: number;
    live: boolean;
};
type BillingState = {
    configured: boolean;
    required: boolean;
    entitled: boolean;
    hasCustomer?: boolean;
    plan: Plan | null;
    subscription: {
        status: string;
        cancelAtPeriodEnd: boolean;
    } | null;
};
async function read<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`${api}${path}`, { method, credentials: "include", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok)
        throw new Error(data.error?.message ?? "Unable to retrieve billing information.");
    return data;
}
export { PlanCatalog as PublicPlan } from "./plan-catalog";
export function LegacyPublicPlan() {
    const { t, localize } = useLocale();
    const [state, setState] = useState<{
        available: boolean;
        plan: Plan | null;
    } | null>(null);
    const [error, setError] = useState("");
    useEffect(() => { let active = true; void read<{
        available: boolean;
        plan: Plan | null;
    }>("/api/v1/plans").then(data => { if (active)
        setState(data); }).catch(() => { if (active)
        setError("Pricing could not be retrieved. Check availability inside your workspace."); }); return () => { active = false; }; }, []);
    return <article className="public-plan"><span className="public-kicker">{t("DPSOFT WORKSPACE")}</span><h3>{localize(state?.plan?.name ?? "A connected business.")}</h3>{localize(state?.plan ? <><strong className="plan-price"><LocalPrice amountMinor={state.plan.amount} baseCurrency={state.plan.currency.toUpperCase()}/><small>{t(" / ")}{localize(state.plan.intervalCount > 1 ? `${state.plan.intervalCount} ` : "")}{localize(state.plan.interval)}</small></strong>{localize(!state.plan.live && <p className="billing-warning">{t("Test mode \u2014 not a live commercial offer.")}</p>)}</> : <p className="plan-availability" role="status">{localize(error || (state ? "Subscription sales are not open yet." : "Checking subscription availability…"))}</p>)}<ul><li>{t("PostgreSQL integration and source authorization")}</li><li>{t("Agent workspace and conversation history")}</li><li>{t("Source metadata and evidence exports")}</li><li>{t("Workspace activity and connection controls")}</li></ul><Link className="public-cta" href="/workspace">{t("Create an account / sign in ")}<ArrowUpRight size={17}/></Link><small>{t("Review the current price and billing details after login. No payment is taken on this page.")}</small></article>;
}
export function Subscription() {
    const [planId, setPlanId] = useState("essential");
    const { t } = useLocale();
    return <><PlanCatalog/><label className="field-label">{t("Plan to purchase")}<select value={planId} onChange={event => setPlanId(event.target.value)}><option value="essential">Essential</option><option value="business">Business</option><option value="scale">Scale</option></select></label><SubscriptionDetails planId={planId}/></>;
}
function SubscriptionDetails({ planId }: { planId: string }) {
    const { t, localize } = useLocale();
    const [state, setState] = useState<BillingState | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const refresh = useCallback(async () => { setBusy(true); setError(""); try {
        setState(await read<BillingState>("/api/v1/billing"));
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load subscription.");
    }
    finally {
        setBusy(false);
    } }, []);
    // Subscription status is synchronized with the external billing API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void refresh(); }, [refresh]);
    async function open(target: "checkout" | "portal") { setBusy(true); setError(""); try {
        const result = await read<{
            url: string;
        }>(`/api/v1/billing/${target}`, "POST", target === "checkout" ? { planId } : undefined);
        const url = new URL(result.url);
        if (url.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname))
            throw new Error("Unexpected billing destination.");
        window.location.assign(url.href);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Could not open billing.");
        setBusy(false);
    } }
    return <><div className="heading-row"><div><h1>{t("Subscription")}</h1><p className="subtitle">{t("Organization billing \u00B7 managed by the owner")}</p></div><button className="icon-button" aria-label={t("Refresh subscription")} disabled={busy} onClick={() => void refresh()}><RefreshCw size={16}/></button></div><section className="panel"><div className="panel-head"><span className="panel-title"><CreditCard size={16}/>{t(" Workspace plan")}</span></div><div className="form-wrap">{localize(!state && !error && <p role="status">{t("Loading subscription\u2026")}</p>)}{localize(state && <>{localize(!state.configured ? <><h2>{t("Payments are not configured.")}</h2><p className="form-note">{t("The operator must configure the payment account, recurring price and customer portal before subscriptions can be purchased.")}</p></> : <><h2>{localize(state.plan?.name)}</h2>{localize(state.plan && <p className="plan-price"><LocalPrice amountMinor={state.plan.amount} baseCurrency={state.plan.currency.toUpperCase()}/> <small>{t("/ ")}{localize(state.plan.intervalCount)} {localize(state.plan.interval)}</small></p>)}<p>{t("Status: ")}<strong>{localize(state.subscription?.status ?? "No subscription")}</strong></p>{localize(state.plan && !state.plan.live && <p className="billing-warning">{t("Stripe test mode. No real subscription sale.")}</p>)}{localize(state.subscription?.cancelAtPeriodEnd && <p>{t("Cancellation is scheduled for the end of the billing period.")}</p>)}<div className="public-actions"><button className="button" disabled={busy || Boolean(state.subscription && !["canceled", "incomplete_expired"].includes(state.subscription.status))} onClick={() => void open("checkout")}>{t("Subscribe securely ")}<ArrowUpRight size={14}/></button>{localize(state.hasCustomer && <button className="secondary-button" disabled={busy} onClick={() => void open("portal")}>{t("Manage subscription / invoices")}</button>)}</div><p className="form-note">{t("Status is verified with the payment provider. Returning from checkout alone does not activate access.")}</p></>)}{localize(!state.required && <p className="billing-warning">{t("Billing enforcement is disabled in this environment. This is not evidence of an active paid subscription.")}</p>)}</>)}{localize(error && <div className="flow-error" role="alert">{localize(error)}</div>)}</div></section><PaymentMethods/></>;
}
