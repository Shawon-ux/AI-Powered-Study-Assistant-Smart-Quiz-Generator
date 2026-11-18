import { useRef, useState } from "react";
import { api, setToken } from "../api";

const FEATURES = [
  ["📄", "Upload any PDF, DOCX, TXT or MD"],
  ["✨", "AI summaries, flashcards and quizzes"],
  ["🧠", "Spaced repetition keeps it in memory"],
  ["💬", "Ask questions about your own notes"],
];

function strength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [anim, setAnim] = useState(""); // CSS class driving the slide animation
  const busyAnim = useRef(false);
  const reg = mode === "register";

  function switchMode() {
    if (busyAnim.current) return;
    busyAnim.current = true;
    const toReg = !reg;
    setAnim(toReg ? "auth-out-left" : "auth-out-right");
    setTimeout(() => {
      setMode(toReg ? "register" : "login"); setErr(null);
      setAnim(toReg ? "auth-in-right" : "auth-in-left");
      setTimeout(() => { setAnim(""); busyAnim.current = false; }, 380);
    }, 220);
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const st = strength(f.password);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    if (reg) {
      if (f.password.length < 8) return setErr("Password must be at least 8 characters.");
      if (f.password !== f.confirm) return setErr("Passwords do not match.");
    }
    setBusy(true);
    try {
      const res = reg
        ? await api.register({ name: f.name, email: f.email, password: f.password })
        : await api.login({ email: f.email, password: f.password });
      setToken(res.token);
      onAuth(res.user);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center p-16 text-white"
           style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed 60%,#c026d3)" }}>
        <div className="text-5xl mb-4">🎓</div>
        <div key={mode} className="fade-up">
          <h1 className="text-4xl font-extrabold leading-tight">
            {reg ? <>Join in,<br />it's free.</> : <>Study smarter,<br />not longer.</>}
          </h1>
          <p className="mt-3 text-white/80 max-w-md">
            {reg ? "Create an account to save your documents, streaks and progress."
                 : "Turn your notes into summaries, flashcards and quizzes in seconds."}
          </p>
        </div>
        <ul className="mt-10 space-y-4">
          {FEATURES.map(([i, t]) => (
            <li key={t} className="flex items-center gap-3 text-lg"><span className="text-2xl">{i}</span>{t}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className={`card w-full max-w-md p-8 ${anim || "fade-up"}`} noValidate>
          <div className="lg:hidden text-4xl mb-2">🎓</div>
          <h2 className="text-2xl font-bold">{reg ? "Create your account" : "Welcome back"}</h2>
          <p className="muted text-sm mt-1 mb-6">{reg ? "Start studying with AI in under a minute." : "Sign in to continue studying."}</p>

          {reg && (
            <Field label="Name"><input className="input" value={f.name} onChange={set("name")} autoComplete="name" required /></Field>
          )}
          <Field label="Email">
            <input className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input className="input pr-16" type={show ? "text" : "password"} value={f.password} onChange={set("password")}
                     autoComplete={reg ? "new-password" : "current-password"} required />
              <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold muted">{show ? "Hide" : "Show"}</button>
            </div>
            {reg && f.password && (
              <div className="flex gap-1 mt-2" aria-label="Password strength">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-1.5 flex-1 rounded-full"
                       style={{ background: n <= st ? ["", "var(--bad)", "var(--warn)", "var(--ok)", "var(--ok)"][st] : "var(--border)" }} />
                ))}
              </div>
            )}
          </Field>
          {reg && (
            <Field label="Confirm password">
              <input className="input" type={show ? "text" : "password"} value={f.confirm} onChange={set("confirm")} autoComplete="new-password" required />
            </Field>
          )}

          {err && <p role="alert" className="text-sm rounded-lg p-3 mb-4" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>{err}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? <span className="spinner" /> : reg ? "Create account" : "Sign in"}
          </button>
          <p className="text-sm text-center mt-5 muted">
            {reg ? "Already have an account?" : "New here?"}{" "}
            <button type="button" className="font-semibold" style={{ color: "var(--brand)" }}
                    onClick={switchMode}>
              {reg ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block mb-4">
    <span className="block text-sm font-medium mb-1.5">{label}</span>
    {children}
  </label>
);
