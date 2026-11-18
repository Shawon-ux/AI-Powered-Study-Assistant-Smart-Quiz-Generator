const BASE = "http://localhost:8000";
const KEY = "sa_token";

export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch {} };

async function req(path, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  let r;
  try { r = await fetch(BASE + path, { ...opts, headers }); }
  catch { throw new Error("Cannot reach the server. Is the backend running on port 8000?"); }
  if (!r.ok) {
    let msg = r.statusText;
    try {
      const d = (await r.json()).detail;
      msg = Array.isArray(d) ? d.map((x) => x.msg).join(", ") : d || msg;
    } catch {}
    if (r.status === 401 && token) window.dispatchEvent(new Event("sa-unauthorized"));
    throw new Error(msg);
  }
  return r.json();
}

const post = (p, body) =>
  req(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body) });

export const api = {
  register: (b) => post("/auth/register", b),
  login: (b) => post("/auth/login", b),
  me: () => req("/auth/me"),
  logout: () => post("/auth/logout"),
  updateProfile: (name) => req("/auth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
  changePassword: (current, next) => req("/auth/password", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, new: next }) }),
  setAvatar: (image) => req("/auth/avatar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) }),
  removeAvatar: () => req("/auth/avatar", { method: "DELETE" }),
  stats: () => req("/stats"),
  upload: (file) => { const f = new FormData(); f.append("file", file); return req("/upload", { method: "POST", body: f }); },
  docs: () => req("/documents"),
  deleteDoc: (id) => req(`/documents/${id}`, { method: "DELETE" }),
  summary: (id) => post(`/docs/${id}/summary`),
  flashcards: (id) => post(`/docs/${id}/flashcards`),
  quiz: (id, n = 10, regenerate = false) => post(`/docs/${id}/quiz?n=${n}&regenerate=${regenerate}`),
  quizResult: (id, score, total) => post(`/docs/${id}/quiz/result`, { score, total }),
  ask: (id, question) => post(`/docs/${id}/ask`, { question }),
  due: (id) => req(`/study/due${id ? `?doc_id=${id}` : ""}`),
  review: (cardId, rating) => post(`/cards/${cardId}/review`, { rating }),
};
