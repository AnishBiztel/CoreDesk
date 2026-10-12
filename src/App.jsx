import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { fetchProfile } from "./lib/api";
import AuthScreen from "./AuthScreen";
import Settings from "./Settings";
import Workspace from "./Workspace";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { SkeletonLine } from "./components/Skeleton";
import { ThemeProvider } from "./lib/ThemeContext";
import { FontProvider } from "./lib/FontContext";
import "./styles.css";

function AppInner() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("workspace"); // workspace | settings

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile(session.user.id)
        .then(setProfile)
        .catch(() => setProfile(null));
    } else {
      setProfile(null);
    }
  }, [session?.user?.id]);

  if (session === undefined) {
    return (
      <div className="empty-main" style={{ height: "100vh", flexDirection: "column", gap: 10 }}>
        <SkeletonLine width={140} height={12} />
        <div style={{ color: "var(--muted-2)", fontSize: 12 }}>Checking session…</div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (view === "settings") {
    return <Settings session={session} profile={profile} onBack={() => setView("workspace")} />;
  }

  return <Workspace session={session} profile={profile} onOpenSettings={() => setView("settings")} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <FontProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppInner />
          </ConfirmProvider>
        </ToastProvider>
      </FontProvider>
    </ThemeProvider>
  );
}
