const BASE = "http://localhost:8000";

async function req(path, opts) {
  const r = await fetch(BASE + path, opts);
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return r.json();
}

const post = (p, body) =>
  req(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });

export const api = {
  upload: (file) => { const f = new FormData(); f.append("file", file); return req("/upload", { method: "POST", body: f }); },
  docs: () => req("/documents"),
  summary: (id) => post(`/docs/${id}/summary`),
  flashcards: (id) => post(`/docs/${id}/flashcards`),
  quiz: (id, n = 10, regenerate = false) => post(`/docs/${id}/quiz?n=${n}&regenerate=${regenerate}`),
  due: (id) => req(`/study/due?doc_id=${id}`),
  review: (cardId, rating) => post(`/cards/${cardId}/review`, { rating }),
};
