import { useState, useEffect, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  fetchClients, insertClient, updateClientRow, softDeleteClient, bulkInsertClients,
  logActivity, emptyClient, emptySpec, ensureShape, fetchWorkspaceSettings,
} from "./lib/api";
import { initials, uid } from "./lib/helpers";
import { refreshWhenIdle } from "./lib/editGuard";
import { useToast } from "./components/Toast";
import { useConfirm } from "./components/ConfirmDialog";
import { SidebarSkeleton, DashboardSkeleton } from "./components/Skeleton";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ClientsList from "./components/ClientsList";
import SchedulePanel from "./components/schedule/SchedulePanel";
import ClientDetail from "./components/ClientDetail";
import TrashPanel from "./components/TrashPanel";
import ProductWorkspace from "./components/product/ProductWorkspace";
import TopNav from "./components/TopNav";
import Logo from "./components/Logo";
import RightRail from "./components/RightRail";

export default function Workspace({ session, profile, onOpenSettings }) {
  const [clients, setClients] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mainView, setMainView] = useState("dashboard"); // dashboard | client | trash | product
  const [topNavTab, setTopNavTab] = useState("overview");
  const [productInitialTab, setProductInitialTab] = useState("inbox");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [saveState, setSaveState] = useState("idle");
  const [templates, setTemplates] = useState(null);
  const fileInputRef = useRef(null);
  const userEmail = session?.user?.email || "";
  const isAdmin = profile?.role === "admin";
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function loadClients() {
    try {
      setClients(await fetchClients());
      setSaveState("synced");
    } catch (e) {
      setSaveState("error");
    }
  }

  useEffect(() => {
    loadClients();
    fetchWorkspaceSettings()
      .then((ws) =>
        setTemplates({
          gatheringQuestions: ws?.gathering_questions?.length ? ws.gathering_questions : undefined,
          gtdSteps: ws?.gtd_steps?.length ? ws.gtd_steps : undefined,
        })
      )
      .catch(() => setTemplates({}));

    const channel = supabase
      .channel("clients-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => refreshWhenIdle(loadClients))
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (clients === null) {
    return (
      <div className="app-shell">
        <div className="navrail">
          <Logo size={32} />
        </div>
        <div className="sidebar">
          <SidebarSkeleton />
        </div>
        <div className="main">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  const selected = clients.find((c) => c.id === selectedId) || null;

  const q = query.trim().toLowerCase();
  const filtered = clients
    .filter((c) => {
      if (stageFilter === "All") return true;
      if (stageFilter === "Churned") return c.churned;
      return !c.churned && c.stage === stageFilter;
    })
    .filter((c) => {
      if (!q) return true;
      const inClient = (c.name + " " + c.industry + " " + c.contact).toLowerCase().includes(q);
      const inSpecs = c.specs.some((s) => (s.problem + " " + s.constraints).toLowerCase().includes(q));
      const inGathering = (c.gathering || []).some((g) => (g.question + " " + g.answer).toLowerCase().includes(q));
      const inGtd = (c.gtd || []).some((g) => (g.label + " " + g.note).toLowerCase().includes(q));
      return inClient || inSpecs || inGathering || inGtd;
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => !c.churned).length;
  const openIssues = clients.reduce((sum, c) => sum + c.issues.filter((i) => !i.resolved).length, 0);
  const pendingSpecs = clients.reduce(
    (sum, c) => sum + c.specs.filter((s) => s.status === "Draft" || s.status === "Reviewed with Eng").length,
    0
  );

  function selectClient(id) {
    setSelectedId(id);
    setMainView("client");
  }

  async function updateClient(id, patch, activity) {
    const current = clients.find((c) => c.id === id);
    if (!current) return;
    const stageChanged = "stage" in patch && patch.stage !== current.stage;
    const merged = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
      stageEnteredAt: stageChanged ? new Date().toISOString() : current.stageEnteredAt,
    };
    setClients((cs) => cs.map((c) => (c.id === id ? merged : c)));
    setSaveState("saving");
    try {
      await updateClientRow(id, merged);
      setSaveState("synced");
      if (stageChanged) {
        logActivity(id, userEmail, "stage_change", `moved the stage from ${current.stage} to ${patch.stage}`);
      }
      if ("churned" in patch && patch.churned !== current.churned) {
        logActivity(id, userEmail, "churn_toggle", patch.churned ? "marked the client as churned" : "un-marked the client as churned");
      }
      if (activity) logActivity(id, userEmail, activity.action, activity.detail);
    } catch (e) {
      setSaveState("error");
    }
  }

  async function addClient() {
    const c = emptyClient(templates || {});
    setClients((cs) => [c, ...cs]);
    selectClient(c.id);
    setSaveState("saving");
    try {
      await insertClient(c, session?.user?.id);
      setSaveState("synced");
      logActivity(c.id, userEmail, "created", "created this client");
    } catch (e) {
      setSaveState("error");
    }
  }

  async function deleteClient(id) {
    const client = clients.find((c) => c.id === id);
    setClients((cs) => cs.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setMainView("dashboard");
    }
    try {
      await softDeleteClient(id);
      logActivity(id, userEmail, "deleted", `moved "${client?.name || "this client"}" to Trash`);
    } catch (e) {
      toast.error("Couldn't delete client", e.message, () => deleteClient(id));
      loadClients();
    }
  }

  function addSpec(clientId) {
    const s = emptySpec();
    const client = clients.find((c) => c.id === clientId);
    updateClient(clientId, { specs: [s, ...client.specs] }, { action: "spec_added", detail: "added a new spec" });
  }

  function updateSpec(clientId, specId, patch) {
    const client = clients.find((c) => c.id === clientId);
    const prevSpec = client.specs.find((s) => s.id === specId);
    const specs = client.specs.map((s) => (s.id === specId ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s));
    const activity =
      patch.status && patch.status !== prevSpec.status
        ? { action: "spec_status_change", detail: `changed a spec's status to "${patch.status}"` }
        : null;
    updateClient(clientId, { specs }, activity);
  }

  function deleteSpec(clientId, specId) {
    const client = clients.find((c) => c.id === clientId);
    updateClient(clientId, { specs: client.specs.filter((s) => s.id !== specId) }, { action: "spec_deleted", detail: "deleted a spec" });
  }

  function addGatheringQuestion(clientId) {
    const client = clients.find((c) => c.id === clientId);
    const q = { id: uid(), question: "", answer: "", updatedAt: "" };
    updateClient(clientId, { gathering: [...(client.gathering || []), q] });
  }

  function updateGatheringItem(clientId, itemId, patch) {
    const client = clients.find((c) => c.id === clientId);
    const gathering = (client.gathering || []).map((q) => (q.id === itemId ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q));
    updateClient(clientId, { gathering });
  }

  function deleteGatheringItem(clientId, itemId) {
    const client = clients.find((c) => c.id === clientId);
    updateClient(clientId, { gathering: (client.gathering || []).filter((q) => q.id !== itemId) });
  }

  function addIssue(clientId, text) {
    if (!text.trim()) return;
    const client = clients.find((c) => c.id === clientId);
    updateClient(
      clientId,
      { issues: [{ id: uid(), text, resolved: false, createdAt: new Date().toISOString() }, ...client.issues] },
      { action: "issue_added", detail: `logged an issue: "${text.slice(0, 60)}"` }
    );
  }

  function toggleIssue(clientId, issueId) {
    const client = clients.find((c) => c.id === clientId);
    const issue = client.issues.find((i) => i.id === issueId);
    updateClient(
      clientId,
      { issues: client.issues.map((i) => (i.id === issueId ? { ...i, resolved: !i.resolved } : i)) },
      { action: "issue_toggled", detail: `marked an issue as ${!issue.resolved ? "resolved" : "open"}` }
    );
  }

  function deleteIssue(clientId, issueId) {
    const client = clients.find((c) => c.id === clientId);
    updateClient(clientId, { issues: client.issues.filter((i) => i.id !== issueId) });
  }

  function updateGtdStep(clientId, stepId, patch) {
    const client = clients.find((c) => c.id === clientId);
    const gtd = (client.gtd || []).map((s) => (s.id === stepId ? { ...s, ...patch } : s));
    updateClient(clientId, { gtd });
  }

  function toggleGtdStep(clientId, stepId) {
    const client = clients.find((c) => c.id === clientId);
    const step = (client.gtd || []).find((s) => s.id === stepId);
    updateGtdStep(clientId, stepId, { done: !step.done, completedAt: !step.done ? new Date().toISOString() : "" });
    logActivity(clientId, userEmail, "gtd_step", `${!step.done ? "completed" : "reopened"} GTD step "${step.label}"`);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(clients, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coredesk-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) return toast.error("Not a valid backup", "That file doesn't look like a tracker backup.");

        const existingNames = new Set(clients.map((c) => (c.name || "").trim().toLowerCase()).filter(Boolean));
        const incoming = data.map(ensureShape);
        const duplicates = incoming.filter((c) => c.name && existingNames.has(c.name.trim().toLowerCase()));
        const toAdd = incoming.filter((c) => !c.name || !existingNames.has(c.name.trim().toLowerCase()));

        if (toAdd.length === 0) {
          return toast.info("Nothing to restore", "Every client in this file already exists here by name.");
        }

        const dupNote = duplicates.length ? ` (${duplicates.length} skipped as already-existing: ${duplicates.map((d) => d.name).slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""})` : "";
        const ok = await confirmDialog(
          `Restore ${toAdd.length} client(s) into the shared workspace?${dupNote}`,
          { title: "Restore backup?", danger: false, confirmLabel: "Restore" }
        );
        if (!ok) return;
        const shaped = toAdd.map((c) => ({ ...c, id: uid() }));
        setSaveState("saving");
        const rows = shaped.map((c) => ({ id: c.id, name: c.name, contact: c.contact, industry: c.industry, stage: c.stage, churned: c.churned, priority: c.priority, overview: c.overview, next_action: c.nextAction, next_action_date: c.nextActionDate || null, last_contact: c.lastContact || null, issues: c.issues, specs: c.specs, gtd: c.gtd, gathering: c.gathering, created_by: session?.user?.id || null, created_at: new Date().toISOString(), stage_entered_at: new Date().toISOString() }));
        await bulkInsertClients(rows);
        setSaveState("synced");
        toast.success("Restore complete", `${shaped.length} client(s) added${duplicates.length ? `, ${duplicates.length} skipped as duplicates` : ""}.`);
        loadClients();
      } catch (err) {
        toast.error("Couldn't read that file", "Make sure it's a valid backup export.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function handleTopNavigate(tabKey, searchText) {
    setTopNavTab(tabKey);
    if (tabKey === "roadmap") {
      setProductInitialTab("roadmap");
      setMainView("product");
      setSelectedId(null);
    } else if (tabKey === "hardware") {
      setProductInitialTab("hardware");
      setMainView("product");
      setSelectedId(null);
    } else if (tabKey === "schedule") {
      setMainView("schedule");
      setSelectedId(null);
    } else if (tabKey === "clients") {
      setMainView("clientsList");
      setSelectedId(null);
      if (searchText) setQuery(searchText);
    } else {
      setMainView("dashboard");
      setSelectedId(null);
      if (searchText) setQuery(searchText);
    }
  }


  return (
    <>
      <TopNav
        activeTab={topNavTab}
        onNavigate={handleTopNavigate}
        userEmail={userEmail}
        onOpenSettings={onOpenSettings}
        onNewClient={addClient}
      />
      <div className="app-shell app-shell-no-navrail">
        {mainView !== "trash" && mainView !== "product" && mainView !== "schedule" && (
          <Sidebar
            filtered={filtered}
            selectedId={selectedId}
            onSelect={selectClient}
            query={query}
            setQuery={setQuery}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            syncState={saveState}
            onExport={exportData}
            onImport={importData}
            fileInputRef={fileInputRef}
            totalClients={totalClients}
            activeClients={activeClients}
            openIssues={openIssues}
            pendingSpecs={pendingSpecs}
            onOpenTrash={() => { setMainView("trash"); setSelectedId(null); }}
            onOpenSettings={onOpenSettings}
            onLogout={handleLogout}
            trashActive={mainView === "trash"}
          />
        )}

        <div className="main">
          {mainView === "trash" && <TrashPanel isAdmin={isAdmin} onChanged={loadClients} />}
          {mainView === "product" && <ProductWorkspace key={productInitialTab} session={session} initialTab={productInitialTab} />}
          {mainView === "dashboard" && (
            <Dashboard allClients={clients} filtered={filtered} onSelect={selectClient} onAddClient={addClient} />
          )}
          {mainView === "schedule" && (
            <SchedulePanel clients={clients} session={session} onOpenClient={(id) => { setTopNavTab("clients"); selectClient(id); }} />
          )}
          {mainView === "clientsList" && (
            <ClientsList filtered={filtered} onSelect={selectClient} onAddClient={addClient} />
          )}
          {mainView === "client" && selected && (
            <ClientDetail
              client={selected}
              userEmail={userEmail}
              isAdmin={isAdmin}
              updateClient={updateClient}
              addSpec={addSpec}
              updateSpec={updateSpec}
              deleteSpec={deleteSpec}
              addGatheringQuestion={addGatheringQuestion}
              updateGatheringItem={updateGatheringItem}
              deleteGatheringItem={deleteGatheringItem}
              addIssue={addIssue}
              toggleIssue={toggleIssue}
              deleteIssue={deleteIssue}
              updateGtdStep={updateGtdStep}
              toggleGtdStep={toggleGtdStep}
              onDeleteClient={deleteClient}
            />
          )}
          {mainView === "client" && !selected && (
            <div className="empty-main">
              <LayoutGrid size={28} strokeWidth={1.5} />
              <div>Select a client from the sidebar, or add a new one.</div>
            </div>
          )}
        </div>

        {(mainView === "dashboard" || mainView === "clientsList" || mainView === "client") && (
          <RightRail allClients={clients} />
        )}
      </div>
    </>
  );
}
