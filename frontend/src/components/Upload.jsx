import { useState } from "react";
import { api } from "../api";

export default function Upload({ onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [over, setOver] = useState(false);

  async function handle(file) {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const d = await api.upload(file);
      onUploaded(d);
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
      className="card block border-2 !border-dashed p-12 text-center cursor-pointer transition"
      style={{ borderColor: over ? "var(--brand)" : "var(--border)", background: over ? "var(--brand-soft)" : undefined }}>
      <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={(e) => handle(e.target.files[0])} />
      <div className="text-5xl mb-3">{busy ? <span className="spinner !w-8 !h-8 inline-block" /> : "📥"}</div>
      <p className="font-semibold">{busy ? "Reading your file…" : "Drop a file here, or click to browse"}</p>
      <p className="muted text-sm mt-1">PDF, DOCX, TXT or MD · up to 20 MB</p>
      {msg && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--bad)" }}>{msg}</p>}
    </label>
  );
}
