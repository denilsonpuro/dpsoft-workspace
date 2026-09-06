"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LocalPrice, useLocale } from "./locale";

type Plan = { id: string; name: string; amount: number; currency: string; interval: string; intervalCount: number; available: boolean; proposed: boolean; live: boolean };
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export function PlanCatalog() {
  const { t } = useLocale();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void fetch(`${api}/api/v1/plans`, { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error("Unable to load plans.");
      const result = await response.json();
      setPlans(result.plans ?? []);
    }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, []);
  return <div className="plan-catalog">{error && <p role="alert">{t(error)}</p>}{!plans.length && !error && <p role="status">{t("Loading subscription…")}</p>}{plans.map(plan => <article className="public-plan" key={plan.id}>
    <span className="public-kicker">DPSOFT / {plan.id.toUpperCase()}</span>
    <h3>{plan.name}</h3>
    <strong className="plan-price"><LocalPrice amountMinor={plan.amount} baseCurrency={plan.currency.toUpperCase()}/><small> / {plan.intervalCount > 1 ? plan.intervalCount : ""} {t(plan.interval)}</small></strong>
    <p>{t(plan.proposed ? "Proposed launch price. Purchases are not available yet." : !plan.live ? "Stripe test mode. No real subscription sale." : "Price verified with the payment provider.")}</p>
    <p>{t("Plan-specific allowances and automation availability must be finalized before sales open.")}</p>
    <Link className="public-cta" href={`/workspace?plan=${plan.id}#billing`}>{t("Create an account / sign in ")}</Link>
  </article>)}</div>;
}
