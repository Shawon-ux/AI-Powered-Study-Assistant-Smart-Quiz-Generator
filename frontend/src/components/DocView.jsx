import { useState } from "react";
import { api } from "../api";
import Summary from "./Summary";
import Flashcards from "./Flashcards";
import Quiz from "./Quiz";
import Chat from "./Chat";

const TABS = [["Summary", "✨"], ["Flashcards", "🃏"], ["Quiz", "📝"], ["Ask AI", "💬"]];

export default function DocView({ doc, onDeleted, onChange }) {
  const [tab, setTab] = useState("Summary");
  const [confirm, setConfirm] = useState(false);

  async function del() {
    await api.deleteDoc(doc.id);
    onDeleted();
  }

  return (
    <div className="fade-up">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{doc.name}</h1>
          <p className="muted text-sm">{Math.round(doc.chars / 1000)}k characters · added {new Date(doc.created).toLocaleDateString()}</p>
        </div>
        {confirm ? (
          <div className="flex gap-2 shrink-0">
            <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn" style={{ color: "var(--bad)" }} onClick={del}>Delete</button>
          </div>
        ) : (
          <button className="btn shrink-0" onClick={() => setConfirm(true)} title="Delete document">🗑️</button>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-xl mb-6 overflow-x-auto" style={{ background: "var(--surface-2)" }}>
        {TABS.map(([t, i]) => (
          <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? "card !shadow-sm" : "muted"}`}>
            {i} {t}
          </button>
        ))}
      </div>

      {tab === "Summary" && <Summary docId={doc.id} />}
      {tab === "Flashcards" && <Flashcards docId={doc.id} onChange={onChange} />}
      {tab === "Quiz" && <Quiz docId={doc.id} />}
      {tab === "Ask AI" && <Chat docId={doc.id} />}
    </div>
  );
}
