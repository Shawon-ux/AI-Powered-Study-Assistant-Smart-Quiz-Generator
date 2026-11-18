import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const SUGGEST = ["What are the main ideas?", "Explain the hardest concept simply", "Give me an example"];

export default function Chat({ docId }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send(q) {
    q = (q ?? text).trim();
    if (q.length < 2 || busy) return;
    setText(""); setMsgs((m) => [...m, { role: "user", text: q }]); setBusy(true);
    try {
      const { answer } = await api.ask(docId, q);
      setMsgs((m) => [...m, { role: "ai", text: answer }]);
    } catch (e) { setMsgs((m) => [...m, { role: "ai", text: e.message, error: true }]); }
    setBusy(false);
  }

  return (
    <div className="card p-4 flex flex-col" style={{ minHeight: 420 }}>
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[55vh] p-1">
        {!msgs.length && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💬</div>
            <p className="muted mb-4">Ask anything about this document.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGEST.map((s) => <button key={s} className="btn !py-1.5 !text-sm" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap text-sm"
                 style={m.role === "user" ? { background: "linear-gradient(135deg,var(--brand),var(--brand-2))", color: "#fff" }
                   : m.error ? { background: "var(--bad-soft)", color: "var(--bad)" } : { background: "var(--surface-2)" }}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && <div className="flex"><div className="rounded-2xl px-4 py-3" style={{ background: "var(--surface-2)" }}><span className="spinner" /></div></div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input" placeholder="Ask a question…" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        <button className="btn btn-primary" disabled={busy || text.trim().length < 2}>Send</button>
      </form>
    </div>
  );
}
