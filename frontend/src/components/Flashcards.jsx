import { useState } from "react";
import { api } from "../api";
import useLoad, { Status } from "./useLoad";

const RATINGS = [["Again", 1], ["Hard", 3], ["Good", 4], ["Easy", 5]];

export default function Flashcards({ docId }) {
  const gen = useLoad(async () => { await api.flashcards(docId); return api.due(docId); }, [docId]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!gen.data) return <Status loading={gen.loading} error={gen.error} />;
  const cards = gen.data;
  if (i >= cards.length)
    return <p className="text-lg">🎉 {cards.length ? "All due cards reviewed!" : "No cards due right now."} Come back later.</p>;

  const card = cards[i];
  async function rate(r) {
    await api.review(card.id, r);
    setFlipped(false); setI(i + 1);
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-2">Card {i + 1} of {cards.length}</p>
      <div onClick={() => setFlipped(!flipped)}
           className="bg-white border rounded-lg shadow p-10 min-h-48 flex items-center justify-center text-center text-xl cursor-pointer">
        {flipped ? card.back : card.front}
      </div>
      {flipped ? (
        <div className="flex gap-2 mt-4 justify-center">
          {RATINGS.map(([label, r]) => (
            <button key={label} onClick={() => rate(r)}
                    className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">{label}</button>
          ))}
        </div>
      ) : <p className="text-center text-slate-400 mt-4 text-sm">Click the card to reveal the answer</p>}
    </div>
  );
}
