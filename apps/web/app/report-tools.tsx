"use client";
import { useLocale } from "./locale";
import { useState, type FormEvent } from "react";
import { ArrowRightLeft, Download, FileSpreadsheet } from "lucide-react";
type Revenue = {
    amount: string;
    records: number;
    currency: string;
    month: string;
};
type Report = {
    current: Revenue;
    previous: Revenue | null;
    difference: string | null;
    source: {
        connectorName: string;
        table: string;
        observedAt: string;
    };
    methodology: string;
};
export function ReportTools({ connectors }: {
    connectors: Array<{
        id: string;
        name: string;
        _count: {
            tools: number;
        };
    }>;
}) {
    const { t, localize } = useLocale();
    const [mode, setMode] = useState<"monthly" | "comparison">("monthly");
    const [report, setReport] = useState<Report | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const available = connectors.filter(c => c._count.tools > 0);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        setReport(null);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/reports/revenue`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectorId: form.get("connectorId"), month: form.get("month"), ...(mode === "comparison" ? { comparisonMonth: form.get("comparisonMonth") } : {}) }) });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error?.message ?? "Report could not be generated.");
            setReport(data);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Report failed.");
        }
        finally {
            setBusy(false);
        }
    }
    function download() {
        if (!report)
            return;
        const rows = [report.current, ...(report.previous ? [report.previous] : [])];
        const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
        const csv = ["month,amount,currency,records", ...rows.map(row => [row.month, row.amount, row.currency, row.records].map(cell).join(","))].join("\r\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `dpsoft-revenue-${report.current.month}.csv`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return <><div className="heading-row"><div><h1>{t("Report tools")}</h1><p className="subtitle">{t("Direct calculations from your authorized source. No language-model call required.")}</p></div></div><div className="tool-selector"><button aria-pressed={mode === "monthly"} onClick={() => { setMode("monthly"); setReport(null); }}><FileSpreadsheet size={20}/><strong>{t("Monthly revenue")}</strong><span>{t("Observed invoice total and record count.")}</span></button><button aria-pressed={mode === "comparison"} onClick={() => { setMode("comparison"); setReport(null); }}><ArrowRightLeft size={20}/><strong>{t("Period comparison")}</strong><span>{t("Two periods, with an exact decimal difference.")}</span></button></div><section className="panel"><div className="panel-head"><span className="panel-title">{localize(mode === "monthly" ? "Run monthly revenue" : "Compare reporting periods")}</span></div><form className="form-wrap" onSubmit={submit}><div className="form-grid"><label className="field"><span>{t("Authorized source")}</span><select name="connectorId" required>{localize(available.map(c => <option key={c.id} value={c.id}>{localize(c.name)}</option>))}</select></label><label className="field"><span>{t("Reporting month")}</span><input name="month" type="month" required defaultValue={new Date().toISOString().slice(0, 7)}/></label>{localize(mode === "comparison" && <label className="field"><span>{t("Comparison month")}</span><input name="comparisonMonth" type="month" required/></label>)}</div>{localize(!available.length && <p className="form-note">{t("Connect and authorize a PostgreSQL source first.")}</p>)}<button className="button" disabled={busy || !available.length}>{localize(busy ? "Querying source…" : "Run report")}</button></form>{localize(error && <div className="flow-error" role="alert">{localize(error)}</div>)}</section>{localize(report && <section className="panel evidence-panel"><div className="panel-head"><span className="panel-title">{t("Observed result")}</span><button className="secondary-button" onClick={download}><Download size={14}/>{t(" Export CSV")}</button></div><div className="form-wrap"><div className="report-values">{localize([report.current, ...(report.previous ? [report.previous] : [])].map((period, index) => <div key={index}><small>{localize(period.month)}</small><strong>{localize(period.amount)}</strong><span>{localize(period.currency)}{t(" \u00B7 ")}{localize(period.records)}{t(" records")}</span></div>))}</div>{localize(report.difference !== null && <p>{t("Difference: ")}<strong>{localize(report.difference)} {localize(report.current.currency)}</strong></p>)}{localize(report.current.currency === "UNSPECIFIED" && <p className="billing-warning">{t("Currency is not configured. Authorize the source with its correct currency before interpreting this as a monetary report.")}</p>)}<p className="form-note">{localize(report.source.connectorName)}{t(" \u00B7 ")}{localize(report.source.table)}<br />{t("Retrieved ")}{localize(new Date(report.source.observedAt).toLocaleString())}</p><details><summary>{t("Methodology and source")}</summary><p className="form-note">{localize(report.methodology)}</p><pre className="report-source">{localize(JSON.stringify(report.source, null, 2))}</pre></details></div></section>)}</>;
}
