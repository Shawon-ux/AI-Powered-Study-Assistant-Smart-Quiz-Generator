import { useState } from "react";
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

  const questions = override ?? gen.data;
  if (!questions) return <Status loading={gen.loading} error={gen.error} />;

  function restart(subset) {
    setOverride(subset); setI(0); setPicked(null); setMissed([]); setScore(0);
    if (!subset) setRound(round + 1);
  }

  if (i >= questions.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Score: {score} / {questions.length}</h2>
        {missed.map((q, k) => (
          <div key={k} className="bg-white border rounded p-3">
            <p className="font-medium">{q.question}</p>
            <p className="text-green-700 text-sm">Correct: {q.options[q.correct_index]}</p>
            <p className="text-slate-600 text-sm">{q.explanation}</p>
          </div>
        ))}
        <div className="flex gap-2">
          {missed.length > 0 && <button onClick={() => restart(missed)} className="px-4 py-2 rounded bg-indigo-600 text-white">Retake missed</button>}
          <button onClick={() => restart(null)} className="px-4 py-2 rounded border">New quiz</button>
        </div>
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
    <div>
      <p className="text-sm text-slate-500 mb-2">Question {i + 1} of {questions.length}</p>
      <h2 className="text-xl font-medium mb-4">{q.question}</h2>
      <div className="grid gap-2">
        {q.options.map((o, k) => {
          let cls = "bg-white hover:bg-slate-100";
          if (answered && k === q.correct_index) cls = "bg-green-100 border-green-500";
          else if (answered && k === picked) cls = "bg-red-100 border-red-500";
          return <button key={k} onClick={() => pick(k)} className={`text-left border rounded p-3 ${cls}`}>{o}</button>;
        })}
      </div>
      {answered && (
        <div className="mt-4">
          <p className="text-slate-700">{picked === q.correct_index ? "✅ Correct! " : "❌ Not quite. "}{q.explanation}</p>
          <button onClick={() => { setI(i + 1); setPicked(null); }}
                  className="mt-3 px-4 py-2 rounded bg-indigo-600 text-white">Next</button>
        </div>
      )}
    </div>
  );
}
