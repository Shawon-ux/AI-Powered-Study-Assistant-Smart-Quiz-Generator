import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import useLoad, { Status } from "./useLoad";

export default function Quiz({ docId }) {
  const [round, setRound] = useState(0);
  const [override, setOverride] = useState(null); // retake-missed subset
  const gen = useLoad(() => api.quiz(docId, 10, round > 0 && !override), [docId, round]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [missed, setMissed] = useState([]);
  const [score, setScore] = useState(0);
  const saved = useRef(false);

  const questions = override ?? gen.data;
  const finished = !!questions && i >= questions.length;

  // record completed full quizzes for the dashboard (retakes of missed questions aren't counted)
  useEffect(() => {
    if (finished && !override && !saved.current) {
      saved.current = true;
      api.quizResult(docId, score, questions.length).catch(() => {});
    }
  }, [finished]); // eslint-disable-line

  if (!questions) return <Status loading={gen.loading} error={gen.error} />;

  function restart(subset) {
    saved.current = false;
    setOverride(subset); setI(0); setPicked(null); setMissed([]); setScore(0);
    if (!subset) setRound(round + 1);
  }

  if (finished) {
    const pct = Math.round((100 * score) / questions.length);
    return (
      <div className="space-y-4 fade-up">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-2">{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "💪"}</div>
          <h2 className="text-3xl font-extrabold">{score} / {questions.length}</h2>
          <p className="muted">{pct}% — {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good progress." : "Keep practicing, you'll get there."}</p>
          <div className="flex gap-2 justify-center mt-5">
            {missed.length > 0 && <button onClick={() => restart(missed)} className="btn btn-primary">Retake missed</button>}
            <button onClick={() => restart(null)} className="btn">New quiz</button>
          </div>
        </div>
        {missed.length > 0 && <h3 className="font-bold">Review what you missed</h3>}
        {missed.map((q, k) => (
          <div key={k} className="card p-4">
            <p className="font-semibold">{q.question}</p>
            <p className="text-sm mt-1" style={{ color: "var(--ok)" }}>✓ {q.options[q.correct_index]}</p>
            <p className="muted text-sm mt-1">{q.explanation}</p>
          </div>
        ))}
      </div>
    );
  }

  const q = questions[i];
  const answered = picked !== null;
  function pick(k) {
    if (answered) return;
    setPicked(k);
    if (k === q.correct_index) setScore(score + 1); else setMissed([...missed, q]);
  }

  return (
    <div className="fade-up">
      <div className="flex justify-between text-sm muted mb-2">
        <span>Question {i + 1} of {questions.length}</span><span>Score {score}</span>
      </div>
      <div className="h-2 rounded-full mb-5" style={{ background: "var(--surface-2)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${(i / questions.length) * 100}%`, background: "linear-gradient(90deg,var(--brand),var(--brand-2))" }} />
      </div>
      <h2 className="text-xl font-semibold mb-4">{q.question}</h2>
      <div className="grid gap-2.5">
        {q.options.map((o, k) => {
          let style = {};
          if (answered && k === q.correct_index) style = { background: "var(--ok-soft)", borderColor: "var(--ok)" };
          else if (answered && k === picked) style = { background: "var(--bad-soft)", borderColor: "var(--bad)" };
          return (
            <button key={k} onClick={() => pick(k)} disabled={answered && k !== picked && k !== q.correct_index}
                    className="card text-left p-4 flex gap-3 items-start hover:!border-[var(--brand)] transition disabled:opacity-60" style={style}>
              <b className="chip shrink-0">{"ABCD"[k]}</b><span>{o}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="card p-4 mt-4 fade-up">
          <p className="font-semibold">{picked === q.correct_index ? "✅ Correct!" : "❌ Not quite."}</p>
          <p className="muted text-sm mt-1">{q.explanation}</p>
          <button onClick={() => { setI(i + 1); setPicked(null); }} className="btn btn-primary mt-3">
            {i + 1 === questions.length ? "See results" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
