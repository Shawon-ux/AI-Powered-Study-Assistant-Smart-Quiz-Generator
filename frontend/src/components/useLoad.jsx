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
  if (loading) return <p className="text-slate-500 animate-pulse">{label}</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;
  return null;
}
