import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Shield } from "lucide-react";
import { supabase } from "./supabaseClient";
import { fetchAllProfiles, setProfileRole, fetchWorkspaceSettings, updateWorkspaceSettings } from "./lib/api";
import { DEFAULT_GATHERING_QUESTIONS, DEFAULT_GTD_STEPS } from "./lib/constants";
import { useToast } from "./components/Toast";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./lib/ThemeContext";
import FontToggle from "./components/FontToggle";
import { useFont } from "./lib/FontContext";

export default function Settings({ session, profile, onBack }) {
  const { theme } = useTheme();
  const { font } = useFont();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [members, setMembers] = useState(null);
  const [gathering, setGathering] = useState(null);
  const [gtdSteps, setGtdSteps] = useState(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  const isAdmin = profile?.role === "admin";
  const toast = useToast();

  useEffect(() => {
    if (isAdmin) {
      fetchAllProfiles().then(setMembers).catch(() => setMembers([]));
      fetchWorkspaceSettings()
        .then((ws) => {
          setGathering(ws?.gathering_questions?.length ? ws.gathering_questions : DEFAULT_GATHERING_QUESTIONS);
          setGtdSteps(ws?.gtd_steps?.length ? ws.gtd_steps.map((s) => s.label) : DEFAULT_GTD_STEPS.map((s) => s.label));
        })
        .catch(() => {
          setGathering(DEFAULT_GATHERING_QUESTIONS);
          setGtdSteps(DEFAULT_GTD_STEPS.map((s) => s.label));
        });
    }
  }, [isAdmin]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords don't match.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNotice("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(id, role) {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role } : m)));
    try {
      await setProfileRole(id, role);
    } catch (e) {
      toast.error("Couldn't update role", e.message, () => handleRoleChange(id, role));
    }
  }

  async function saveTemplates() {
    setTemplateSaving(true);
    try {
      await updateWorkspaceSettings({
        gathering_questions: gathering.filter((q) => q.trim()),
        gtd_steps: gtdSteps.filter((s) => s.trim()).map((label, i) => ({ id: "step" + i, label })),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      toast.error("Couldn't save templates", e.message, saveTemplates);
    } finally {
      setTemplateSaving(false);
    }
  }

  return (
    <div className="main">
      <div className="main-inner" style={{ maxWidth: 560 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 20 }}>
          <ArrowLeft size={14} /> Back to tracker
        </button>
        <h1 className="page-title">Settings</h1>
        <div className="page-sub" style={{ marginBottom: 22 }}>
          Signed in as {session?.user?.email} {profile?.role && <span className="badge badge-accent" style={{ marginLeft: 8 }}>{profile.role}</span>}
        </div>

        <div className="card settings-card">
          <div className="settings-section-title">Appearance</div>
          <div className="appearance-row">
            <div>
              <div className="appearance-row-label">{theme === "light" ? "Light mode" : "Dark mode"}</div>
              <div className="appearance-row-sub">Saved to this browser and applied automatically next time you visit.</div>
            </div>
            <ThemeToggle />
          </div>
          <div className="appearance-row appearance-row-divider">
            <div>
              <div className="appearance-row-label">{font === "system-bold" ? "Bold system font" : "Default font"}</div>
              <div className="appearance-row-sub">A bolder, rounder look across the whole app. Saved to this browser.</div>
            </div>
            <FontToggle />
          </div>
        </div>

        <div className="card settings-card">
          <div className="settings-section-title">Change password</div>
          {error && <div className="alert alert-error">{error}</div>}
          {notice && <div className="alert alert-notice">{notice}</div>}
          <form onSubmit={handleChangePassword}>
            <div className="settings-field">
              <label className="field-label">New password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </div>
            <div className="settings-field">
              <label className="field-label">Confirm new password</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
          </form>
        </div>

        {isAdmin && (
          <>
            <div className="card settings-card">
              <div className="settings-section-title"><Shield size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Team &amp; roles</div>
              {members === null && <div className="no-items">Loading…</div>}
              {members && members.map((m) => (
                <div className="member-row" key={m.id}>
                  <span style={{ flex: 1 }}>{m.email}</span>
                  <select className="input" style={{ width: 120 }} value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="card settings-card">
              <div className="settings-section-title">Default requirement-gathering questions</div>
              {gathering && gathering.map((q, i) => (
                <div className="template-row" key={i}>
                  <input className="input" value={q} onChange={(e) => setGathering((g) => g.map((x, xi) => (xi === i ? e.target.value : x)))} />
                  <button className="icon-btn danger" onClick={() => setGathering((g) => g.filter((_, xi) => xi !== i))}><Trash2 size={14} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-dashed" style={{ width: "100%", justifyContent: "center" }} onClick={() => setGathering((g) => [...(g || []), ""])}><Plus size={13} /> Add question</button>
            </div>

            <div className="card settings-card">
              <div className="settings-section-title">Default go-to-deployment steps</div>
              {gtdSteps && gtdSteps.map((s, i) => (
                <div className="template-row" key={i}>
                  <input className="input" value={s} onChange={(e) => setGtdSteps((arr) => arr.map((x, xi) => (xi === i ? e.target.value : x)))} />
                  <button className="icon-btn danger" onClick={() => setGtdSteps((arr) => arr.filter((_, xi) => xi !== i))}><Trash2 size={14} /></button>
                </div>
              ))}
              <button className="btn btn-ghost btn-dashed" style={{ width: "100%", justifyContent: "center" }} onClick={() => setGtdSteps((arr) => [...(arr || []), ""])}><Plus size={13} /> Add step</button>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={saveTemplates} disabled={templateSaving}>
                {templateSaving ? "Saving…" : "Save templates"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
