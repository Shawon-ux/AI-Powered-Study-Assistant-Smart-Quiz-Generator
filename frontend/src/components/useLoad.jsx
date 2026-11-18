import { useEffect, useState } from "react";

export default function useLoad(fn, deps) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let live = true;
    set({ data: null, error: null, loading: true });
    fn().then((data) => live && set({ data, error: null, loading: false }))
        .catch((e) => live && set({ data: null, error: e.message, loading: false }));
    return () => { live = false; };
  }, deps); // eslint-disable-line
  return state;
}

export function Status({ loading, error, label = "Generating with AI… this can take a moment" }) {
  if (loading) return <div className="card p-8 flex items-center justify-center gap-3 muted"><span className="spinner" />{label}</div>;
  if (error) return <div role="alert" className="card p-5" style={{ color: "var(--bad)", background: "var(--bad-soft)" }}>⚠️ {error}</div>;
  return null;
}
