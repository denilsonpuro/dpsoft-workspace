"use client";
import { useLocale, LocaleControls } from "./locale";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Brand } from "./brand";
import { CommerceAdmin } from "./commerce-ui";
import { Subscription } from "./subscription";
import { ReportTools } from "./report-tools";
import { LocalDevices } from "./local-devices";
import { WorkspaceIntelligence } from "./workspace-intelligence";
import { Activity, Bot, Cable, Check, Database, FileClock, LayoutDashboard, LogOut, MessageSquare, Plus, RefreshCw, ScrollText, Trash2 } from "lucide-react";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Section = "overview" | "connectors" | "agents" | "chat" | "audit" | "billing" | "tools" | "admin";
type Principal = {
    userId: string;
    organizationId: string | null;
    email: string;
};
type AuditEvent = {
    id: string;
    action: string;
    resourceType: string;
    status: string;
    occurredAt: string;
    requestId: string;
};
type Dashboard = {
    principal: Principal;
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    metrics: {
        connectedSystems: number;
        activeAgents: number;
        actionsToday: number;
        failedActions: number;
        pendingApprovals: number;
    };
    recentActivity: AuditEvent[];
};
type Connector = {
    id: string;
    name: string;
    status: string;
    configuration: Record<string, unknown>;
    lastSuccessfulAt: string | null;
    definition: {
        name: string;
    };
    _count: {
        tools: number;
        agentLinks: number;
    };
};
type Agent = {
    id: string;
    name: string;
    description: string;
    modelName: string;
    active: boolean;
    connectors: Array<{
        connector: {
            id: string;
            name: string;
            status: string;
        };
    }>;
    tools: Array<{
        tool: {
            id: string;
            name: string;
            mode: string;
            riskLevel: string;
        };
    }>;
    _count: {
        conversations: number;
    };
};
type Conversation = {
    id: string;
    title: string;
    updatedAt: string;
    agent: {
        id: string;
        name: string;
    };
    messages: Array<{
        id: string;
        role: string;
        content: {
            text?: string;
            source?: unknown;
        };
    }>;
};
type Column = {
    schema_name: string;
    table_name: string;
    column_name: string;
    data_type: string;
};
type Runner = (action: () => Promise<void>) => Promise<void>;
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, { ...init, credentials: "include", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
    if (response.status === 204)
        return undefined as T;
    const data = await response.json() as T & {
        error?: {
            message?: string;
            requestId?: string;
        };
    };
    if (!response.ok)
        throw Object.assign(new Error(`${data.error?.message ?? "Request failed."}${data.error?.requestId ? ` Reference: ${data.error.requestId}` : ""}`), { status: response.status });
    return data;
}
export function ProductionConsole() {
    const { t, localize } = useLocale();
    const [principal, setPrincipal] = useState<Principal | null | undefined>();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [connectors, setConnectors] = useState<Connector[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [audit, setAudit] = useState<AuditEvent[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [section, setSection] = useState<Section>("overview");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const loadWorkspace = useCallback(async () => { const [d, c, a, l, h] = await Promise.all([request<Dashboard>("/api/v1/dashboard"), request<{
            connectors: Connector[];
        }>("/api/v1/connectors"), request<{
            agents: Agent[];
        }>("/api/v1/agents"), request<{
            events: AuditEvent[];
        }>("/api/v1/audit-logs"), request<{
            conversations: Conversation[];
        }>("/api/v1/conversations")]); setDashboard(d); setPrincipal(d.principal); setConnectors(c.connectors); setAgents(a.agents); setAudit(l.events); setConversations(h.conversations); }, []);
    const bootstrap = useCallback(async () => { try {
        const s = await request<{
            principal: Principal;
        }>("/api/v1/session");
        setPrincipal(s.principal);
        if (s.principal.organizationId)
            await loadWorkspace();
    }
    catch (cause) {
        if ((cause as {
            status?: number;
        }).status === 401)
            setPrincipal(null);
        else
            setError(cause instanceof Error ? cause.message : "Unable to load workspace.");
    } }, [loadWorkspace]);
    // Bootstrap is an external API synchronization; state updates occur after network I/O.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void bootstrap(); }, [bootstrap]);
    useEffect(() => { const sync = () => { const hash = window.location.hash.slice(1); if (new URLSearchParams(window.location.search).has("billing"))
        setSection("billing");
    else if (["overview", "connectors", "agents", "chat", "audit", "billing", "tools", "admin"].includes(hash))
        setSection(hash as Section); }; sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
    const run: Runner = async (action) => { setBusy(true); setError(""); try {
        await action();
    }
    catch (cause) {
        setError(cause instanceof Error ? cause.message : "Operation failed.");
    }
    finally {
        setBusy(false);
    } };
    if (principal === undefined)
        return <Centered><Activity className="spin"/><p>{t("Loading secure workspace\u2026")}</p>{localize(error && <ErrorBox>{localize(error)}</ErrorBox>)}</Centered>;
    if (principal === null)
        return <AuthScreen busy={busy} error={error} run={run} done={bootstrap}/>;
    if (!principal.organizationId)
        return <OrganizationScreen principal={principal} busy={busy} error={error} run={run} done={loadWorkspace}/>;
    if (!dashboard)
        return <Centered><Activity className="spin"/><p>{t("Loading organization\u2026")}</p>{localize(error && <ErrorBox>{localize(error)}</ErrorBox>)}</Centered>;
    const go = (value: Section) => { setSection(value); setError(""); window.history.replaceState(null, "", `${window.location.pathname}#${value}`); };
    return <div className="shell"><aside className="sidebar"><div className="brand"><Brand /></div><Nav active={section === "overview"} go={() => go("overview")} icon={<LayoutDashboard size={16}/>} label={t("Command center")}/><div className="nav-section"><div className="nav-label">{t("Workspace")}</div><Nav active={section === "connectors"} go={() => go("connectors")} icon={<Cable size={16}/>} label={t("Connectors")}/><Nav active={section === "agents"} go={() => go("agents")} icon={<Bot size={16}/>} label={t("Agents")}/><Nav active={section === "chat"} go={() => go("chat")} icon={<MessageSquare size={16}/>} label={t("Agent chat")}/></div><div className="nav-section"><div className="nav-label">{t("Operations")}</div><Nav active={section === "tools"} go={() => go("tools")} icon={<Database size={16}/>} label={t("Report tools")}/><Nav active={section === "billing"} go={() => go("billing")} icon={<LayoutDashboard size={16}/>} label={t("Subscription")}/><Nav active={section === "admin"} go={() => go("admin")} icon={<LayoutDashboard size={16}/>} label={t("Commerce administration")}/><div className="nav-label">{t("Security")}</div><Nav active={section === "audit"} go={() => go("audit")} icon={<ScrollText size={16}/>} label={t("Audit logs")}/></div><div className="sidebar-footer"><div className="org-name">{localize(dashboard.organization.name)}</div><div className="org-meta">{localize(principal.email)}</div><button className="logout" onClick={() => void run(async () => { await request("/api/v1/auth/logout", { method: "POST" }); setDashboard(null); setPrincipal(null); })}><LogOut size={14}/>{t(" Sign out")}</button></div></aside><main className="main"><header className="topbar"><LocaleControls/><span className="breadcrumb">{localize(dashboard.organization.name)}{t(" / ")}{localize(section)}</span><button className="icon-button" aria-label={t("Refresh workspace")} onClick={() => void run(loadWorkspace)} disabled={busy}><RefreshCw size={15} className={busy ? "spin" : ""}/></button></header><div className="page">{section === "admin" && <CommerceAdmin/>}{localize(section === "billing" && <Subscription />)}{localize(section === "tools" && <ReportTools connectors={connectors}/>)} {localize(section === "overview" && <><WorkspaceIntelligence connectors={connectors} agents={agents} conversations={conversations} go={go}/><Overview dashboard={dashboard} go={go}/></>)} {localize(section === "connectors" && <Connectors items={connectors} busy={busy} run={run} reload={loadWorkspace}/>)} {localize(section === "agents" && <Agents items={agents} connectors={connectors} busy={busy} run={run} reload={loadWorkspace}/>)} {localize(section === "chat" && <Chat agents={agents.filter(a => a.active)} conversations={conversations} busy={busy} run={run} reload={loadWorkspace}/>)} {localize(section === "audit" && <Audit events={audit} busy={busy} run={run} setEvents={setAudit}/>)} {localize(error && <ErrorBox>{localize(error)}</ErrorBox>)}</div></main></div>;
}
function AuthScreen({ busy, error, run, done }: {
    busy: boolean;
    error: string;
    run: Runner;
    done: () => Promise<void>;
}) { const { t, localize } = useLocale(); const [mode, setMode] = useState<"login" | "register">("login"); const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { await request(`/api/v1/auth/${mode}`, { method: "POST", body: JSON.stringify(mode === "register" ? { displayName: f.get("displayName"), email: f.get("email"), password: f.get("password") } : { email: f.get("email"), password: f.get("password") }) }); await done(); }); }; return <Centered><div className="auth-brand"><Link href="/" aria-label={t("DPsoft home")}><Brand /></Link></div><form className="auth-card" onSubmit={submit}><h1>{localize(mode === "login" ? "Sign in" : "Create your account")}</h1><p>{t("Access your isolated integration workspace.")}</p>{localize(mode === "register" && <Field name="displayName" label={t("Full name")}/>)}<Field name="email" label={t("Work email")} type="email"/><Field name="password" label={t("Password")} type="password" minLength={12}/><button className="button" disabled={busy}>{localize(busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account")}</button>{localize(error && <ErrorBox>{localize(error)}</ErrorBox>)}<button type="button" className="text-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{localize(mode === "login" ? "Create a new account" : "I already have an account")}</button></form></Centered>; }
function OrganizationScreen({ principal, busy, error, run, done }: {
    principal: Principal;
    busy: boolean;
    error: string;
    run: Runner;
    done: () => Promise<void>;
}) { const { t, localize } = useLocale(); const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { await request("/api/v1/organizations", { method: "POST", body: JSON.stringify({ name: f.get("name"), slug: f.get("slug") }) }); await done(); }); }; return <Centered><form className="auth-card" onSubmit={submit}><h1>{t("Create organization")}</h1><p>{localize(principal.email)}{t(" \u00B7 resources are tenant-isolated.")}</p><Field name="name" label={t("Organization name")}/><Field name="slug" label={t("Organization slug")} pattern="[a-z0-9-]{2,50}"/><button className="button" disabled={busy}>{t("Create secure workspace")}</button>{localize(error && <ErrorBox>{localize(error)}</ErrorBox>)}</form></Centered>; }
function Overview({ dashboard }: {
    dashboard: Dashboard;
    go: (s: Section) => void;
}) { const { t, localize } = useLocale(); const m = [["Connected systems", dashboard.metrics.connectedSystems], ["Active agents", dashboard.metrics.activeAgents], ["Actions today", dashboard.metrics.actionsToday], ["Failed actions", dashboard.metrics.failedActions]]; return <section className="operations-summary"><Heading title={t("Operational pulse")} subtitle={t("Recorded workspace activity \u00B7 refresh to retrieve the latest state")}/><section className="metrics">{localize(m.map(([l, v]) => <div className="metric" key={l}><div className="metric-label">{localize(l)}</div><div className="metric-value">{localize(v)}</div><div className="metric-note">{t("Organization records")}</div></div>))}</section><Panel title={t("Recent activity")}>{localize(dashboard.recentActivity.length ? <EventList events={dashboard.recentActivity}/> : <Empty icon={<FileClock />} title={t("No activity")} text={t("Connect a system to begin recording audit events.")}/>)}</Panel></section>; }
function Connectors(props: Parameters<typeof DatabaseConnectors>[0]) { return <><LocalDevices/><DatabaseConnectors {...props}/></>; }
function DatabaseConnectors({ items, busy, run, reload }: {
    items: Connector[];
    busy: boolean;
    run: Runner;
    reload: () => Promise<void>;
}) { const { t, localize } = useLocale(); const [creating, setCreating] = useState(false); const [selectedTable, setSelectedTable] = useState(""); const [pending, setPending] = useState<{
    id: string;
    columns: Column[];
} | null>(null); const tables = useMemo(() => [...new Set((pending?.columns ?? []).map(c => `${c.schema_name}.${c.table_name}`))], [pending]); const connect = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { const c = await request<{
    connector: {
        id: string;
    };
}>("/api/v1/connectors/postgresql", { method: "POST", body: JSON.stringify({ name: f.get("name"), connectionString: f.get("connectionString"), ssl: f.get("ssl") === "on" }) }); const s = await request<{
    columns: Column[];
}>(`/api/v1/connectors/${c.connector.id}/schema`); setSelectedTable(""); setPending({ id: c.connector.id, columns: s.columns }); }); }; const authorize = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { await request(`/api/v1/connectors/${pending!.id}/schema`, { method: "PUT", body: JSON.stringify({ invoicesTable: f.get("invoicesTable"), amountColumn: f.get("amountColumn"), dateColumn: f.get("dateColumn"), currency: f.get("currency") }) }); setPending(null); setCreating(false); await reload(); }); }; return <><Heading title={t("Connectors")} subtitle={t("Encrypted, explicitly authorized integrations")}><button className="button" onClick={() => { setCreating(!creating); setPending(null); }}><Plus size={14}/>{t(" PostgreSQL")}</button></Heading>{localize(creating && <Panel title={pending ? "Authorize source" : "Connect PostgreSQL"}><div className="form-wrap">{localize(pending ? <form onSubmit={authorize}><p className="form-note">{localize(pending.columns.length)}{t(" columns discovered. Select the only source the tool may read.")}</p><div className="form-grid"><label className="field"><span>{t("Invoices table")}</span><select name="invoicesTable" required value={selectedTable || tables[0]} onChange={e => setSelectedTable(e.target.value)}>{localize(tables.map(t => <option key={t} value={t}>{localize(t)}</option>))}</select></label><Field name="currency" label={t("Source currency (ISO code, e.g. USD)")} pattern="[A-Z]{3}" maxLength={3}/><Select name="amountColumn" label={t("Amount column")} values={pending.columns.filter(c => `${c.schema_name}.${c.table_name}` === (selectedTable || tables[0])).filter(c => ["smallint", "integer", "bigint", "decimal", "numeric", "real", "double precision", "money"].includes(c.data_type)).map(c => c.column_name)}/><Select name="dateColumn" label={t("Date column")} values={pending.columns.filter(c => `${c.schema_name}.${c.table_name}` === (selectedTable || tables[0])).filter(c => c.data_type.includes("date") || c.data_type.includes("timestamp")).map(c => c.column_name)}/></div><button className="button" disabled={busy}>{t("Authorize controlled tool")}</button></form> : <form onSubmit={connect}><p className="form-note">{t("Use a dedicated SELECT-only database account. Credentials are encrypted and never returned.")}</p><div className="form-grid"><Field name="name" label={t("Connection name")}/><Field name="connectionString" label={t("PostgreSQL connection string")} type="password"/><label className="checkbox"><input name="ssl" type="checkbox"/>{t(" Require verified TLS")}</label></div><button className="button" disabled={busy}>{localize(busy ? "Testing…" : "Test and connect")}</button></form>)}</div></Panel>)}<div className="card-list">{localize(items.map(c => <article className="resource-card" key={c.id}><div><div className="resource-title"><Database size={16}/>{localize(c.name)}<Status value={c.status}/></div><p>{localize(c.definition.name)}{t(" \u00B7 ")}{localize(String(c.configuration.database ?? "Database"))}</p><small>{t("Last success: ")}{localize(date(c.lastSuccessfulAt))}{t(" \u00B7 ")}{localize(c._count.tools)}{t(" tools \u00B7 ")}{localize(c._count.agentLinks)}{t(" agents")}</small></div><div className="row-actions"><button className="secondary-button" disabled={busy} onClick={() => void run(async () => { const schema = await request<{
    columns: Column[];
}>(`/api/v1/connectors/${c.id}/schema`); setSelectedTable(""); setPending({ id: c.id, columns: schema.columns }); setCreating(true); })}>{t("Authorize source")}</button><button className="icon-button" aria-label={`Test ${c.name}`} disabled={busy} onClick={() => void run(async () => { await request(`/api/v1/connectors/${c.id}/test`, { method: "POST" }); await reload(); })}><RefreshCw size={14}/></button><button className="icon-button danger" aria-label={`Delete ${c.name}`} disabled={busy} onClick={() => { if (confirm("Delete connector and permanently erase its stored credential?"))
    void run(async () => { await request(`/api/v1/connectors/${c.id}`, { method: "DELETE" }); await reload(); }); }}><Trash2 size={14}/></button></div></article>))}{localize(!items.length && !creating && <Empty icon={<Cable />} title={t("No connectors")} text={t("Connect PostgreSQL with a least-privilege account.")}/>)}</div></>; }
function Agents({ items, connectors, busy, run, reload }: {
    items: Agent[];
    connectors: Connector[];
    busy: boolean;
    run: Runner;
    reload: () => Promise<void>;
}) { const { t, localize } = useLocale(); const [creating, setCreating] = useState(false); const available = connectors.filter(c => c.status === "CONNECTED" && c._count.tools > 0); const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { await request("/api/v1/agents", { method: "POST", body: JSON.stringify({ name: f.get("name"), description: f.get("description"), connectorId: f.get("connectorId") }) }); setCreating(false); await reload(); }); }; return <><Heading title={t("Agents")} subtitle={t("AI runtimes limited to explicitly authorized tools")}><button className="button" disabled={!available.length} onClick={() => setCreating(!creating)}><Plus size={14}/>{t(" Create agent")}</button></Heading>{localize(creating && <Panel title={t("Create agent")}><form className="form-wrap" onSubmit={submit}><div className="form-grid"><Field name="name" label={t("Name")}/><Field name="description" label={t("Purpose")}/><Select name="connectorId" label={t("Authorized connector")} options={available.map(c => ({ value: c.id, label: c.name }))}/></div><button className="button" disabled={busy}>{t("Create agent")}</button></form></Panel>)}<div className="card-list">{localize(items.map(a => <article className="resource-card" key={a.id}><div><div className="resource-title"><Bot size={16}/>{localize(a.name)}<Status value={a.active ? "ACTIVE" : "INACTIVE"}/></div><p>{localize(a.description)}</p><small>{localize(a.modelName)}{t(" \u00B7 ")}{localize(a.tools.map(t => t.tool.name).join(", "))}{t(" \u00B7 ")}{localize(a._count.conversations)}{t(" conversations")}</small></div>{localize(a.active && <button className="icon-button danger" aria-label={`Deactivate ${a.name}`} disabled={busy} onClick={() => { if (confirm("Deactivate this agent?"))
    void run(async () => { await request(`/api/v1/agents/${a.id}`, { method: "DELETE" }); await reload(); }); }}><Trash2 size={14}/></button>)}</article>))}{localize(!items.length && <Empty icon={<Bot />} title={t("No agents")} text={t("Authorize a connector tool before creating an agent.")}/>)}</div></>; }
function Chat({ agents, conversations, busy, run, reload }: {
    agents: Agent[];
    conversations: Conversation[];
    busy: boolean;
    run: Runner;
    reload: () => Promise<void>;
}) { const { t, localize } = useLocale(); const [answer, setAnswer] = useState<{
    text: string;
    source: unknown;
} | null>(null); const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { const x = await request<{
    answer: string;
    source: unknown;
}>("/api/v1/chat", { method: "POST", body: JSON.stringify({ agentId: f.get("agentId"), question: f.get("question"), month: f.get("month") }) }); setAnswer({ text: x.answer, source: x.source }); await reload(); }); }; return <><Heading title={t("Agent chat")} subtitle={t("Grounded answers with persisted provenance")}/><div className="chat-grid"><Panel title={t("New verified query")}><form className="form-wrap" onSubmit={submit}><Select name="agentId" label={t("Agent")} options={agents.map(a => ({ value: a.id, label: a.name }))}/><Field name="question" label={t("Question")} defaultValue="Qual foi a receita observada neste mês?"/><Field name="month" label={t("Month")} type="month" defaultValue={new Date().toISOString().slice(0, 7)}/><button className="button" disabled={busy || !agents.length}>{localize(busy ? "Executing tool…" : "Ask agent")}</button></form>{localize(answer && <div className="answer"><div className="answer-label"><Check size={15}/>{t(" Verified answer")}</div><p>{localize(answer.text)}</p><details><summary>{t("Structured provenance")}</summary><pre>{localize(JSON.stringify(answer.source, null, 2))}</pre></details></div>)}</Panel><Panel title={t("Conversation history")}>{localize(conversations.length ? conversations.map(c => <details className="conversation" key={c.id}><summary><span>{localize(c.title)}</span><small>{localize(c.agent.name)}{t(" \u00B7 ")}{localize(date(c.updatedAt))}</small></summary>{localize(c.messages.map(m => <div className={`message ${m.role.toLowerCase()}`} key={m.id}><strong>{localize(m.role)}</strong><p>{localize(m.content.text)}</p></div>))}</details>) : <Empty icon={<MessageSquare />} title={t("No conversations")} text={t("Verified answers appear here.")}/>)}</Panel></div></>; }
function Audit({ events, busy, run, setEvents }: {
    events: AuditEvent[];
    busy: boolean;
    run: Runner;
    setEvents: (e: AuditEvent[]) => void;
}) { const { t } = useLocale(); const filter = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run(async () => { const p = new URLSearchParams(); for (const k of ["action", "status", "from", "to"]) {
    const v = String(f.get(k) ?? "");
    if (v)
        p.set(k, v);
} setEvents((await request<{
    events: AuditEvent[];
}>(`/api/v1/audit-logs?${p}`)).events); }); }; return <><Heading title={t("Audit logs")} subtitle={t("Tenant-scoped security and execution trail")}/><Panel title={t("Filters")}><form className="filter-row" onSubmit={filter}><Field name="action" label={t("Action contains")} required={false}/><Select name="status" label={t("Status")} values={["", "SUCCESS", "FAILURE", "DENIED", "PENDING_APPROVAL"]}/><Field name="from" label={t("From")} type="date" required={false}/><Field name="to" label={t("To")} type="date" required={false}/><button className="button" disabled={busy}>{t("Apply")}</button></form></Panel><Panel title={`${events.length} events`}><EventList events={events}/></Panel></>; }
function Heading({ title, subtitle, children }: {
    title: string;
    subtitle: string;
    children?: ReactNode;
}) { const { localize } = useLocale(); return <div className="heading-row"><div><h1>{localize(title)}</h1><p className="subtitle">{localize(subtitle)}</p></div>{localize(children)}</div>; }
function Panel({ title, children }: {
    title: string;
    children: ReactNode;
}) { const { localize } = useLocale(); return <section className="panel"><div className="panel-head"><span className="panel-title">{localize(title)}</span></div>{localize(children)}</section>; }
function Nav({ active, go, icon, label }: {
    active: boolean;
    go: () => void;
    icon: ReactNode;
    label: string;
}) { const { localize } = useLocale(); return <button className={`nav-link nav-button ${active ? "active" : ""}`} onClick={go} aria-label={label} aria-current={active ? "page" : undefined}>{localize(icon)}<span>{localize(label)}</span></button>; }
function Centered({ children }: {
    children: ReactNode;
}) { const { localize } = useLocale(); return <main className="centered"><div className="auth-preferences"><LocaleControls/></div>{localize(children)}</main>; }
function ErrorBox({ children }: {
    children: ReactNode;
}) { const { localize } = useLocale(); return <div className="flow-error" role="alert">{localize(children)}</div>; }
function Field(props: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
}) { const { localize } = useLocale(); const { label, required = true, ...input } = props; return <label className="field"><span>{localize(label)}</span><input {...input} required={required}/></label>; }
function Select({ name, label, values, options }: {
    name: string;
    label: string;
    values?: string[];
    options?: Array<{
        value: string;
        label: string;
    }>;
}) { const { localize } = useLocale(); return <label className="field"><span>{localize(label)}</span><select name={name} required={!values?.includes("")}>{localize(options?.map(o => <option value={o.value} key={o.value}>{localize(o.label)}</option>) ?? values?.map(v => <option value={v} key={v || "all"}>{localize(v || "All")}</option>))}</select></label>; }
function Status({ value }: {
    value: string;
}) { const { localize } = useLocale(); const good = ["CONNECTED", "ACTIVE", "SUCCESS"].includes(value); return <span className={`badge ${good ? "good" : ["FAILURE", "ERROR"].includes(value) ? "bad" : ""}`}>{localize(value)}</span>; }
function Empty({ icon, title, text }: {
    icon: ReactNode;
    title: string;
    text: string;
}) { const { localize } = useLocale(); return <div className="empty"><div><div className="empty-icon">{localize(icon)}</div><div className="empty-title">{localize(title)}</div><p className="empty-copy">{localize(text)}</p></div></div>; }
function EventList({ events }: {
    events: AuditEvent[];
}) { const { t, localize } = useLocale(); return <div className="event-list">{localize(events.map(e => <div className="event-row" key={e.id}><div><strong>{localize(e.action)}</strong><small>{localize(e.resourceType)}{t(" \u00B7 ")}{localize(date(e.occurredAt))}</small></div><Status value={e.status}/><code>{localize(e.requestId.slice(0, 8))}</code></div>))}</div>; }
function date(v: string | null) { return v ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "Never"; }
