import { useEffect, useState } from "react";
import { api } from "./api";
import Upload from "./components/Upload";
import Summary from "./components/Summary";
import Flashcards from "./components/Flashcards";
import Quiz from "./components/Quiz";

const TABS = ["Summary", "Flashcards", "Quiz"];

export default function App() {
  const [docs, setDocs] = useState([]);
  const [docId, setDocId] = useState(null);
  const [tab, setTab] = useState("Summary");

  const refresh = () => api.docs().then(setDocs).catch(() => {});
  useEffect(() => { refresh(); }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Study Assistant</h1>
      <Upload onUploaded={(d) => { refresh(); setDocId(d.id); setTab("Summary"); }} />

      {docs.length > 0 && (
        <select className="mt-4 w-full border rounded p-2 bg-white" value={docId ?? ""}
                onChange={(e) => setDocId(Number(e.target.value) || null)}>
          <option value="">Select a document…</option>
          {docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}

      {docId && (
        <>
          <div className="flex gap-2 mt-6 border-b">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 -mb-px border-b-2 ${tab === t ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-500"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {tab === "Summary" && <Summary key={docId} docId={docId} />}
            {tab === "Flashcards" && <Flashcards key={docId} docId={docId} />}
            {tab === "Quiz" && <Quiz key={docId} docId={docId} />}
          </div>
        </>
      )}
    </div>
  );
}
