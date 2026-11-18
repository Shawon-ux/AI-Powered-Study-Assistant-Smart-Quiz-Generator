import { api } from "../api";
import useLoad, { Status } from "./useLoad";

export default function Summary({ docId }) {
  const { data, loading, error } = useLoad(() => api.summary(docId), [docId]);
  if (!data) return <Status loading={loading} error={error} />;
  return (
    <div className="space-y-6">
      <Section title="Summary" items={data.bullets} />
      <Section title="Key takeaways" items={data.key_takeaways} />
      <div>
        <h2 className="font-semibold text-lg mb-2">Key concepts</h2>
        <dl className="grid gap-2">
          {data.key_concepts.map((c, i) => (
            <div key={i} className="bg-white border rounded p-3">
              <dt className="font-medium">{c.term}</dt>
              <dd className="text-slate-600 text-sm">{c.definition}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

const Section = ({ title, items }) => (
  <div>
    <h2 className="font-semibold text-lg mb-2">{title}</h2>
    <ul className="list-disc pl-5 space-y-1">{items.map((b, i) => <li key={i}>{b}</li>)}</ul>
  </div>
);
