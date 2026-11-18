import { api } from "../api";
import useLoad, { Status } from "./useLoad";

export default function Summary({ docId }) {
  const { data, loading, error } = useLoad(() => api.summary(docId), [docId]);
  if (!data) return <Status loading={loading} error={error} />;
  return (
    <div className="space-y-5 fade-up">
      <Section icon="📌" title="Summary" items={data.bullets} />
      <Section icon="🎯" title="Key takeaways" items={data.key_takeaways} />
      <div>
        <h2 className="font-bold text-lg mb-3">🔑 Key concepts</h2>
        <dl className="grid sm:grid-cols-2 gap-3">
          {data.key_concepts.map((c, i) => (
            <div key={i} className="card p-4">
              <dt className="font-semibold" style={{ color: "var(--brand)" }}>{c.term}</dt>
              <dd className="muted text-sm mt-1">{c.definition}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

const Section = ({ icon, title, items }) => (
  <div className="card p-5">
    <h2 className="font-bold text-lg mb-3">{icon} {title}</h2>
    <ul className="space-y-2">
      {items.map((b, i) => (
        <li key={i} className="flex gap-3"><span style={{ color: "var(--brand)" }}>●</span><span>{b}</span></li>
      ))}
    </ul>
  </div>
);
