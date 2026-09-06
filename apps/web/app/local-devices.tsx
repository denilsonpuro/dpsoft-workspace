"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "./locale";
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type Device = { id: string; name: string; pairedAt: string | null; lastSeenAt: string | null; revokedAt: string | null; tokenExpiresAt: string | null; pairingExpiresAt: string };
async function request(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${api}/api/v1/devices${path}`, { method, credentials: "include", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "Device request failed.");
  return data;
}
export function LocalDevices() {
  const { t } = useLocale();
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!pairing) return;
    const timer = setTimeout(() => setPairing(null), Math.max(0, new Date(pairing.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [pairing]);
  async function refresh() { setDevices((await request("")).devices); setLoaded(true); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Device request failed."); }
    finally { setBusy(false); }
  }
  function pair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("deviceName"));
    void run(async () => { setPairing(await request("/pairing", "POST", { name })); await refresh(); });
  }
  return <section className="panel"><div className="panel-head"><h2>{t("Local devices")}</h2><button className="secondary-button" disabled={busy} onClick={() => void run(refresh)}>{t("Refresh")}</button></div><div className="form-wrap">
    <p>{t("Pairing preview: connection status only. Remote task execution and desktop control are not enabled.")}</p>
    <form onSubmit={pair}><label className="field"><span>{t("Device name")}</span><input name="deviceName" required minLength={2} maxLength={80} placeholder="Office Mac"/></label><button className="button" disabled={busy}>{t("Generate pairing code")}</button></form>
    {pairing && <div role="status"><p>{t("One-time code. Expires in 10 minutes. Do not share it or paste it into chat.")}</p><label className="field"><span>{t("Pairing code")}</span><input readOnly value={pairing.code} autoComplete="off" onFocus={e => e.currentTarget.select()}/></label><button className="text-button" onClick={() => setPairing(null)}>{t("Hide code")}</button></div>}
    {error && <p role="alert" className="flow-error">{t(error)}</p>}
    {loaded && !devices.length && <p>{t("No local devices registered.")}</p>}
    {devices.map(device => <article className="resource-card" key={device.id}><div><strong>{device.name}</strong><p>{t(device.revokedAt ? "Revoked" : !device.pairedAt ? new Date(device.pairingExpiresAt) <= new Date() ? "Pairing expired" : "Awaiting pairing" : device.tokenExpiresAt && new Date(device.tokenExpiresAt) <= new Date() ? "Credential expired" : "Paired")}</p><small>{t("Last contact")}: {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "—"}</small></div>{!device.revokedAt && <button className="secondary-button" disabled={busy} onClick={() => { if (window.confirm(t("Revoke this device? Its credential will stop working."))) void run(async () => { await request(`/${device.id}`, "DELETE"); setPairing(null); await refresh(); }); }}>{t("Revoke")}</button>}</article>)}
  </div></section>;
}
