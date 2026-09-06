"use client";
import { useLocale } from "./locale";
import { useState } from "react";
import { ArrowRight, Bot, Database, Download, Search, Sparkles } from "lucide-react";
type Props = {
    connectors: Array<{
        id: string;
        name: string;
        status: string;
        lastSuccessfulAt: string | null;
        _count: {
            tools: number;
        };
    }>;
    agents: Array<{
        id: string;
        name: string;
        active: boolean;
        connectors: Array<{
            connector: {
                id: string;
            };
        }>;
        _count: {
            conversations: number;
        };
    }>;
    conversations: Array<{
        id: string;
        title: string;
        updatedAt: string;
        agent: {
            name: string;
        };
        messages: Array<{
            role: string;
            content: {
                text?: string;
                source?: unknown;
            };
        }>;
    }>;
    go: (section: "connectors" | "agents" | "chat") => void;
};
export function WorkspaceIntelligence({ connectors, agents, conversations, go }: Props) {
    const { t, localize } = useLocale();
    const [query, setQuery] = useState("");
    const [exported, setExported] = useState(false);
    const matches = (value: string) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const sources = connectors.filter(c => matches(c.name) || agents.some(a => a.connectors.some(link => link.connector.id === c.id) && matches(a.name)));
    const evidence = conversations.filter(c => c.messages.some(m => m.content.source != null));
    const visibleEvidence = evidence.filter(c => matches(`${c.title} ${c.agent.name}`));
    const steps = [
        { title: "Connect your source", detail: "Bring a PostgreSQL source into the workspace.", done: connectors.some(c => c.status === "CONNECTED"), section: "connectors" as const },
        { title: "Define the boundary", detail: "Explicitly authorize a tool before the agent can query.", done: connectors.some(c => c._count.tools > 0), section: "connectors" as const },
        { title: "Activate an agent", detail: "Give your team a purpose-built business assistant.", done: agents.some(a => a.active), section: "agents" as const },
        { title: "Capture the evidence", detail: "Run a query and retain its source alongside the answer.", done: evidence.length > 0, section: "chat" as const },
    ];
    function exportEvidence() {
        const blob = new Blob([JSON.stringify({ format: "dpsoft-evidence-v1", exportedAt: new Date().toISOString(), scope: "Currently loaded conversations with source metadata; not a complete audit archive or certified report.", conversations: visibleEvidence }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `dpsoft-evidence-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExported(true);
    }
    return <>
    <section className="intelligence-hero">
      <div><span className="eyebrow"><Sparkles size={14}/>{t(" DPSOFT / INTELLIGENCE OPERATIONS")}</span><h2>{t("Your data.")}<br />{t("A clearer line to decisions.")}</h2><p>{t("Connect the source. Control the agent. Keep the evidence.")}</p><button className="button" onClick={() => go(agents.some(a => a.active) ? "chat" : "connectors")}>{t("Open your workspace ")}<ArrowRight size={16}/></button></div>
      <div className="hero-orbit" aria-hidden="true"><span>{t("01 / SOURCE")}</span><Database size={28}/><i /><strong>{t("DP")}</strong><i /><Bot size={28}/><span>{t("02 / INTELLIGENCE")}</span></div>
    </section>
    <div className="intelligence-heading"><div><span className="eyebrow">{t("WORKSPACE GRAPH")}</span><h2>{t("From connection to conversation")}</h2></div><label className="workspace-search"><Search size={16}/><input aria-label={t("Search sources, agents and evidence")} placeholder={t("Search sources, agents, evidence\u2026")} value={query} onChange={e => { setQuery(e.target.value); setExported(false); }}/></label></div>
    <div className="intelligence-grid"><section className="panel"><div className="panel-head"><span className="panel-title">{t("Source \u2192 agent map")}</span><span className="muted">{localize(sources.length)}{t(" sources")}</span></div><div className="source-map">{localize(sources.map(c => <article className="source-path" key={c.id}><div className="source-node"><Database size={18}/><div><strong>{localize(c.name)}</strong><small>{localize(c.status)}{t(" \u00B7 ")}{localize(c._count.tools)}{t(" authorized tools")}</small><small>{t("Last successful check: ")}{localize(c.lastSuccessfulAt ? new Date(c.lastSuccessfulAt).toLocaleString() : "Not recorded")}</small></div></div><div className="linked-agents">{localize(agents.filter(a => a.connectors.some(link => link.connector.id === c.id)).map(a => <button key={a.id} onClick={() => go("agents")}><Bot size={15}/><span>{localize(a.name)}<small>{localize(a.active ? "Active" : "Inactive")}{t(" \u00B7 ")}{localize(a._count.conversations)}{t(" conversations")}</small></span><ArrowRight size={14}/></button>))}{localize(!agents.some(a => a.connectors.some(link => link.connector.id === c.id)) && <button onClick={() => go("agents")}>{t("Assign your first agent ")}<ArrowRight size={14}/></button>)}</div></article>))}{localize(!sources.length && <p className="empty-copy">{localize(query ? "No sources match your search." : "Your integration map begins with the first connected source.")}</p>)}</div></section>
      <section className="panel"><div className="panel-head"><span className="panel-title">{t("Activation checklist")}</span><span className="muted">{localize(steps.filter(s => s.done).length)}{t(" / 4")}</span></div><div className="activation-list">{localize(steps.map((step, index) => <button key={step.title} onClick={() => go(step.section)}><span className={step.done ? "step-number completed" : "step-number"}>{localize(step.done ? "✓" : `0${index + 1}`)}</span><span><strong>{localize(step.title)}</strong><small>{localize(step.detail)}</small></span><ArrowRight size={14}/></button>))}</div></section></div>
    <section className="panel evidence-panel"><div className="panel-head"><div><span className="panel-title">{t("Evidence library")}</span><p className="muted">{t("Source metadata from loaded conversations. Exports may contain business-sensitive data.")}</p></div><button className="secondary-button" onClick={exportEvidence} disabled={!visibleEvidence.length}><Download size={14}/>{t(" Export JSON (")}{localize(visibleEvidence.length)}{t(")")}</button></div><span className="export-status" role="status">{localize(exported ? "Evidence export prepared for download." : "")}</span>{localize(visibleEvidence.map(c => <details className="conversation" key={c.id}><summary><span>{localize(c.title)}</span><small>{localize(c.agent.name)}{t(" \u00B7 ")}{localize(new Date(c.updatedAt).toLocaleDateString())}</small></summary>{localize(c.messages.filter(m => m.content.source != null).map((m, i) => <div className="message" key={i}><p>{localize(m.content.text)}</p><pre>{localize(JSON.stringify(m.content.source, null, 2))}</pre></div>))}</details>))}{localize(!visibleEvidence.length && <p className="empty-copy">{localize(query ? "No evidence matches this search." : "Run a source-backed query to start building your evidence library.")}</p>)}</section>
  </>;
}
