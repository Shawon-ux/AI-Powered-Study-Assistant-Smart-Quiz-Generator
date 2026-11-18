import { useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import DocView from "./components/DocView";
import Flashcards from "./components/Flashcards";
import Upload from "./components/Upload";

function useTheme() {
  const [dark, setDark] = useState(() => {
    try { const s = localStorage.getItem("sa_theme"); if (s) return s === "dark"; } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("sa_theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);
  return [dark, setDark];
}

export default function App() {
  const [dark, setDark] = useTheme();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const out = () => { setToken(null); setUser(null); };
    window.addEventListener("sa-unauthorized", out);
    return () => window.removeEventListener("sa-unauthorized", out);
  }, []);

  if (checking) return <div className="min-h-screen flex items-center justify-center"><span className="spinner" /></div>;
  if (!user) return <AuthPage onAuth={setUser} />;
  return <Shell user={user} dark={dark} setDark={setDark}
                onLogout={async () => { try { await api.logout(); } catch {} setToken(null); setUser(null); }} />;
}

function Shell({ user, dark, setDark, onLogout }) {
  const [docs, setDocs] = useState([]);
  const [view, setView] = useState({ page: "dashboard" }); // dashboard | doc | review | upload
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");

  const refresh = useCallback(() => api.docs().then(setDocs).catch(() => {}), []);
  useEffect(() => { refresh(); }, [refresh]);

  const go = (v) => { setView(v); setMenu(false); refresh(); };
  const shown = docs.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  const totalDue = docs.reduce((n, d) => n + d.due, 0);

  const nav = (page, icon, label, badge) => (
    <button className={`navlink ${view.page === page ? "active" : ""}`} onClick={() => go({ page })}>
      <span>{icon}</span><span className="flex-1">{label}</span>
      {badge > 0 && <span className="chip">{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen lg:flex">
      <header className="lg:hidden flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <button className="btn" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
        <b>🎓 Study Assistant</b>
        <button className="btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? "☀️" : "🌙"}</button>
      </header>

      <aside className={`${menu ? "block" : "hidden"} lg:flex lg:flex-col w-full lg:w-72 lg:h-screen lg:sticky lg:top-0 p-4 gap-1 border-r overflow-y-auto`}
             style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="hidden lg:flex items-center gap-2 px-2 py-3 text-lg font-extrabold">🎓 Study Assistant</div>
        {nav("dashboard", "🏠", "Dashboard")}
        {nav("review", "🧠", "Daily review", totalDue)}
        {nav("upload", "⬆️", "Upload material")}

        <p className="text-xs font-semibold uppercase tracking-wide muted px-3 mt-5 mb-1">Your documents</p>
        {docs.length > 3 && <input className="input mb-2 !py-1.5 text-sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />}
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {shown.map((d) => (
            <button key={d.id} className={`navlink ${view.page === "doc" && view.id === d.id ? "active" : ""}`}
                    onClick={() => go({ page: "doc", id: d.id })}>
              <span>📄</span><span className="flex-1 truncate">{d.name}</span>
              {d.due > 0 && <span className="chip">{d.due}</span>}
            </button>
          ))}
          {!docs.length && <p className="text-sm muted px-3">Nothing yet — upload your first file.</p>}
        </div>

        <div className="border-t pt-3 mt-2 flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
          <div className="w-9 h-9 rounded-full grid place-items-center text-white font-bold shrink-0"
               style={{ background: "linear-gradient(135deg,var(--brand),var(--brand-2))" }}>{user.name[0]?.toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs muted truncate">{user.email}</p>
          </div>
          <button className="btn !p-2 hidden lg:inline-flex" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? "☀️" : "🌙"}</button>
          <button className="btn !p-2" onClick={onLogout} title="Sign out" aria-label="Sign out">⎋</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-5 lg:p-10 max-w-5xl w-full mx-auto">
        {view.page === "dashboard" && <Dashboard user={user} docs={docs} go={go} />}
        {view.page === "upload" && (
          <div className="fade-up">
            <h1 className="text-2xl font-bold mb-1">Upload material</h1>
            <p className="muted mb-5">We'll extract the text so you can generate study tools from it.</p>
            <Upload onUploaded={(d) => go({ page: "doc", id: d.id })} />
          </div>
        )}
        {view.page === "review" && (
          <div className="fade-up">
            <h1 className="text-2xl font-bold mb-1">Daily review</h1>
            <p className="muted mb-5">Every flashcard due today, across all your documents.</p>
            <Flashcards key="all" docId={null} />
          </div>
        )}
        {view.page === "doc" && docs.find((d) => d.id === view.id) && (
          <DocView key={view.id} doc={docs.find((d) => d.id === view.id)}
                   onDeleted={() => go({ page: "dashboard" })} onChange={refresh} />
        )}
      </main>
    </div>
  );
}
