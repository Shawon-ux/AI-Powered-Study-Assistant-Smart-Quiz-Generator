import { useState } from "react";
import { api } from "../api";
import Avatar, { resizeImage } from "./Avatar";

function Notice({ n }) {
  if (!n) return null;
  return (
    <p role={n.ok ? "status" : "alert"} className="text-sm rounded-lg p-3 mb-4"
       style={n.ok ? { background: "var(--ok-soft)", color: "var(--ok)" } : { background: "var(--bad-soft)", color: "var(--bad)" }}>
      {n.text}
    </p>
  );
}

export default function Profile({ user, docs, onUser }) {
  const [name, setName] = useState(user.name);
  const [nameN, setNameN] = useState(null);
  const [picN, setPicN] = useState(null);
  const [picBusy, setPicBusy] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwN, setPwN] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function pickPhoto(file) {
    if (!file) return;
    setPicBusy(true); setPicN(null);
    try { onUser(await api.setAvatar(await resizeImage(file))); setPicN({ ok: true, text: "Profile picture updated." }); }
    catch (e) { setPicN({ text: e.message }); }
    setPicBusy(false);
  }
  async function removePhoto() {
    setPicBusy(true); setPicN(null);
    try { onUser(await api.removeAvatar()); setPicN({ ok: true, text: "Profile picture removed." }); }
    catch (e) { setPicN({ text: e.message }); }
    setPicBusy(false);
  }
  async function saveName(e) {
    e.preventDefault(); setNameN(null);
    try { onUser(await api.updateProfile(name)); setNameN({ ok: true, text: "Name updated." }); }
    catch (e2) { setNameN({ text: e2.message }); }
  }
  async function savePw(e) {
    e.preventDefault(); setPwN(null);
    if (pw.next.length < 8) return setPwN({ text: "New password must be at least 8 characters." });
    if (pw.next !== pw.confirm) return setPwN({ text: "New passwords do not match." });
    setPwBusy(true);
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwN({ ok: true, text: "Password changed. Other devices have been signed out." });
    } catch (e2) { setPwN({ text: e2.message }); }
    setPwBusy(false);
  }
  const setP = (k) => (e) => setPw({ ...pw, [k]: e.target.value });

  return (
    <div className="space-y-6 max-w-2xl fade-up">
      <h1 className="text-2xl font-bold">My profile</h1>

      <section className="card p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <Avatar user={user} size={96} />
          <div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="muted text-sm">{user.email}</p>
            <p className="muted text-sm">
              Member since {new Date(user.created).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · {docs.length} document{docs.length === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2 mt-3">
              <label className={`btn btn-primary ${picBusy ? "opacity-60 pointer-events-none" : ""}`}>
                {picBusy ? <span className="spinner" /> : "📷 Upload photo"}
                <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp"
                       onChange={(e) => { pickPhoto(e.target.files[0]); e.target.value = ""; }} />
              </label>
              {user.avatar && <button className="btn" onClick={removePhoto} disabled={picBusy}>Remove</button>}
            </div>
          </div>
        </div>
        <div className="mt-4"><Notice n={picN} /></div>
      </section>

      <form onSubmit={saveName} className="card p-6">
        <h2 className="font-bold text-lg mb-4">Account details</h2>
        <Notice n={nameN} />
        <label className="block mb-4">
          <span className="block text-sm font-medium mb-1.5">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </label>
        <label className="block mb-4">
          <span className="block text-sm font-medium mb-1.5">Email</span>
          <input className="input" value={user.email} disabled style={{ opacity: .7 }} />
        </label>
        <button className="btn btn-primary" disabled={!name.trim() || name.trim() === user.name}>Save changes</button>
      </form>

      <form onSubmit={savePw} className="card p-6">
        <h2 className="font-bold text-lg mb-4">Change password</h2>
        <Notice n={pwN} />
        {/* hidden username helps password managers */}
        <input type="text" autoComplete="username" value={user.email} readOnly hidden />
        {[["current", "Current password", "current-password"], ["next", "New password (min. 8 characters)", "new-password"], ["confirm", "Confirm new password", "new-password"]].map(([k, label, ac]) => (
          <label key={k} className="block mb-4">
            <span className="block text-sm font-medium mb-1.5">{label}</span>
            <input className="input" type="password" value={pw[k]} onChange={setP(k)} autoComplete={ac} required />
          </label>
        ))}
        <button className="btn btn-primary" disabled={pwBusy}>{pwBusy ? <span className="spinner" /> : "Update password"}</button>
      </form>
    </div>
  );
}
