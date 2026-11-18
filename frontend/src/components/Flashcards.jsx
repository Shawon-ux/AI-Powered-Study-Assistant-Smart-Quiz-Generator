import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import useLoad, { Status } from "./useLoad";

const RATINGS = [["Again", 1, "var(--bad)"], ["Hard", 3, "var(--warn)"], ["Good", 4, "var(--brand)"], ["Easy", 5, "var(--ok)"]];

// docId = null reviews every due card across all documents
export default function Flashcards({ docId, onChange }) {
  const gen = useLoad(async () => { if (docId) await api.flashcards(docId); return api.due(docId); }, [docId]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [err, setErr] = useState(null);

  const cards = gen.data;
  const card = cards?.[i];

  const rate = useCallback(async (r) => {
    if (!card) return;
    try { await api.review(card.id, r); setErr(null); setFlipped(false); setI((n) => n + 1); onChange?.(); }
    catch (e) { setErr(e.message); }
  }, [card, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (!card || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && "1234".includes(e.key)) rate(RATINGS[Number(e.key) - 1][1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, rate]);

  if (!cards) return <Status loading={gen.loading} error={gen.error} />;
  if (i >= cards.length)
    return (
      <div className="card p-10 text-center fade-up">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-xl font-bold">{cards.length ? "All due cards reviewed!" : "No cards due right now."}</h2>
        <p className="muted mt-1">Come back later — spaced repetition will bring them back at the right time.</p>
      </div>
    );

  return (
    <div className="fade-up">
      <div className="flex justify-between text-sm muted mb-2">
        <span>Card {i + 1} of {cards.length}{card.doc_name && !docId ? ` · ${card.doc_name}` : ""}</span>
        <span>{Math.round((i / cards.length) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full mb-5" style={{ background: "var(--surface-2)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${(i / cards.length) * 100}%`, background: "linear-gradient(90deg,var(--brand),var(--brand-2))" }} />
      </div>

      <div className="flip cursor-pointer" onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} aria-label="Flip card">
        <div className={`flip-inner ${flipped ? "flipped" : ""}`}>
          <div className="flip-face card p-10 min-h-60 flex flex-col items-center justify-center text-center text-xl">
            <span className="chip mb-4">Question</span>{card.front}
          </div>
          <div className="flip-face flip-back card p-10 flex flex-col items-center justify-center text-center text-xl"
               style={{ background: "var(--brand-soft)" }}>
            <span className="chip mb-4" style={{ background: "var(--surface)" }}>Answer</span>{card.back}
          </div>
        </div>
      </div>

      {err && <p role="alert" className="text-sm mt-3 text-center" style={{ color: "var(--bad)" }}>{err}</p>}
      {flipped ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          {RATINGS.map(([label, r, c], k) => (
            <button key={label} onClick={() => rate(r)} className="btn" style={{ borderColor: c, color: c }}>
              {label} <kbd className="text-xs opacity-60">{k + 1}</kbd>
            </button>
          ))}
        </div>
      ) : <p className="text-center muted mt-5 text-sm">Click the card or press <kbd>Space</kbd> to reveal the answer</p>}
    </div>
  );
}
