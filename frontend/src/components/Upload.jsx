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
      if (d.truncated) setMsg("Document was very long and was truncated.");
      onUploaded(d);
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
      className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${over ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"}`}>
      <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md"
             onChange={(e) => handle(e.target.files[0])} />
      {busy ? "Uploading…" : "Drop a PDF, DOCX, TXT or MD file here, or click to browse"}
      {msg && <p className="text-amber-700 mt-2 text-sm">{msg}</p>}
    </label>
  );
}
