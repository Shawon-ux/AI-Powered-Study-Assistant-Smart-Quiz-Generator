import useLoad, { Status } from "./useLoad";
import { api } from "../api";

function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const Stat = ({ icon, label, value, hint }) => (
  <div className="card p-5 fade-up">
    <div className="text-2xl">{icon}</div>
    <div className="text-3xl font-extrabold mt-2">{value}</div>
    <div className="text-sm font-medium">{label}</div>
    {hint && <div className="text-xs muted mt-0.5">{hint}</div>}
  </div>
);

export default function Dashboard({ user, docs, go }) {
  const { data: s, loading, error } = useLoad(() => api.stats(), [docs.length]);
  if (!s) return <Status loading={loading} error={error} label="Loading your progress…" />;
  const max = Math.max(1, ...s.week.map((d) => d.reviews));
  const dayName = (iso) => new Date(iso + "T00:00").toLocaleDateString(undefined, { weekday: "short" });

  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="text-3xl font-extrabold">{greet()}, {user.name.split(" ")[0]} 👋</h1>
        <p className="muted mt-1">
          {s.due > 0 ? `You have ${s.due} flashcard${s.due > 1 ? "s" : ""} due today.` : "You're all caught up. Nice work!"}
        </p>
      </div>

      {s.due > 0 && (
        <button onClick={() => go({ page: "review" })}
                className="card p-5 w-full text-left flex items-center justify-between text-white border-0 hover:brightness-110 transition"
                style={{ background: "linear-gradient(135deg,var(--brand),var(--brand-2))" }}>
          <span><b className="text-lg">Start today's review</b><br /><span className="text-white/80 text-sm">{s.due} cards waiting</span></span>
          <span className="text-3xl">→</span>
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon="🔥" label="Day streak" value={s.streak} hint={s.streak ? "Keep it going!" : "Study today to start"} />
        <Stat icon="🃏" label="Cards" value={s.cards} hint={`${s.mastered} mastered`} />
        <Stat icon="📝" label="Avg quiz score" value={s.quiz_avg == null ? "–" : `${s.quiz_avg}%`} />
        <Stat icon="📚" label="Documents" value={s.documents} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-bold mb-4">Reviews this week</h2>
          <div className="flex items-end gap-3 h-36">
            {s.week.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <span className="text-xs muted">{d.reviews || ""}</span>
                <div className="w-full rounded-t-lg" title={`${d.reviews} reviews`}
                     style={{ height: `${Math.max(4, (d.reviews / max) * 100)}%`,
                              background: d.reviews ? "linear-gradient(var(--brand-2),var(--brand))" : "var(--surface-2)" }} />
                <span className="text-xs muted">{dayName(d.day)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold mb-4">Recent quizzes</h2>
          {s.recent_quizzes.length === 0 && <p className="muted text-sm">No quizzes taken yet. Open a document and try one!</p>}
          <ul className="space-y-3">
            {s.recent_quizzes.map((q, i) => {
              const pct = Math.round((100 * q.score) / q.total);
              return (
                <li key={i}>
                  <div className="flex justify-between text-sm"><span className="truncate pr-2">{q.doc}</span><b>{q.score}/{q.total}</b></div>
                  <div className="h-2 rounded-full mt-1" style={{ background: "var(--surface-2)" }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? "var(--ok)" : pct >= 40 ? "var(--warn)" : "var(--bad)" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">📥</div>
          <h2 className="font-bold text-lg">Upload your first document</h2>
          <p className="muted mb-4">Drop in lecture notes or a chapter to generate a summary, flashcards and a quiz.</p>
          <button className="btn btn-primary" onClick={() => go({ page: "upload" })}>Upload material</button>
        </div>
      ) : (
        <div>
          <h2 className="font-bold mb-3">Continue studying</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {docs.slice(0, 6).map((d) => (
              <button key={d.id} onClick={() => go({ page: "doc", id: d.id })} className="card p-4 text-left hover:-translate-y-0.5 transition">
                <div className="font-semibold truncate">📄 {d.name}</div>
                <div className="text-xs muted mt-1">{d.cards} cards · {new Date(d.created).toLocaleDateString()}</div>
                {d.due > 0 && <span className="chip mt-2">{d.due} due</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
