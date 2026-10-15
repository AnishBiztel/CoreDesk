import { useState, useEffect } from "react";
import { Inbox, Trello, History, Cpu } from "lucide-react";
import { supabase } from "../../supabaseClient";
import {
  fetchFeatures, insertFeature, updateFeature, deleteFeature, emptyFeature,
  fetchReleases, insertRelease, updateRelease, deleteRelease,
  fetchHardware, insertHardware, updateHardware, deleteHardware, emptyHardware,
} from "../../lib/productApi";
import { fetchClients } from "../../lib/api";
import FeatureInbox from "./FeatureInbox";
import RoadmapBoard from "./RoadmapBoard";
import ChangelogPanel from "./ChangelogPanel";
import HardwarePanel from "./HardwarePanel";
import { refreshWhenIdle } from "../../lib/editGuard";
import { useToast } from "../Toast";
import { SkeletonLine, SkeletonBlock } from "../Skeleton";

export default function ProductWorkspace({ session, initialTab }) {
  const [tab, setTab] = useState(initialTab || "inbox"); // inbox | roadmap | changelog | hardware
  const [features, setFeatures] = useState(null);
  const [releases, setReleases] = useState(null);
  const [hardware, setHardware] = useState(null);
  const [clients, setClients] = useState(null);
  const userId = session?.user?.id;
  const toast = useToast();

  async function loadAll() {
    try {
      const [f, r, h, c] = await Promise.all([fetchFeatures(), fetchReleases(), fetchHardware(), fetchClients()]);
      setFeatures(f);
      setReleases(r);
      setHardware(h);
      setClients(c);
    } catch (e) {
      console.warn("product workspace load failed", e);
      setFeatures((f) => f ?? []);
      setReleases((r) => r ?? []);
      setHardware((h) => h ?? []);
      setClients((c) => c ?? []);
    }
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("product-workspace-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_items" }, () => refreshWhenIdle(loadAll))
      .on("postgres_changes", { event: "*", schema: "public", table: "releases" }, () => refreshWhenIdle(loadAll))
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_items" }, () => refreshWhenIdle(loadAll))
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => refreshWhenIdle(loadAll))
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (features === null || releases === null || hardware === null || clients === null) {
    return (
      <div className="main-inner">
        <SkeletonLine width={200} height={16} style={{ marginBottom: 22 }} />
        <SkeletonBlock height={44} style={{ marginBottom: 14 }} />
        <SkeletonBlock height={90} style={{ marginBottom: 10 }} />
        <SkeletonBlock height={90} />
      </div>
    );
  }

  async function addFeature(title) {
    const item = { ...emptyFeature(), title };
    setFeatures((fs) => [item, ...fs]);
    try {
      await insertFeature(item, userId);
    } catch (e) {
      toast.error("Couldn't save idea", e.message, () => addFeature(title));
      loadAll();
    }
  }

  async function patchFeature(id, patch) {
    setFeatures((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    try {
      await updateFeature(id, patch);
    } catch (e) {
      toast.error("Couldn't save changes", e.message, () => patchFeature(id, patch));
      loadAll();
    }
  }

  async function removeFeature(id) {
    setFeatures((fs) => fs.filter((f) => f.id !== id));
    try {
      await deleteFeature(id);
    } catch (e) {
      toast.error("Couldn't delete", e.message, () => removeFeature(id));
      loadAll();
    }
  }

  async function addRelease(release) {
    setReleases((rs) => [release, ...rs]);
    try {
      await insertRelease(release);
      toast.success("Release added", release.version);
    } catch (e) {
      toast.error("Couldn't save release", e.message, () => addRelease(release));
      loadAll();
    }
  }

  async function removeRelease(id) {
    setReleases((rs) => rs.filter((r) => r.id !== id));
    try {
      await deleteRelease(id);
    } catch (e) {
      toast.error("Couldn't delete release", e.message, () => removeRelease(id));
      loadAll();
    }
  }

  function assignRelease(featureId, releaseId) {
    patchFeature(featureId, { release_id: releaseId });
  }

  async function addHardware() {
    const item = emptyHardware();
    setHardware((hs) => [item, ...hs]);
    try {
      await insertHardware(item, userId);
    } catch (e) {
      toast.error("Couldn't add component", e.message, addHardware);
      loadAll();
    }
  }

  async function patchHardware(id, patch) {
    setHardware((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    try {
      await updateHardware(id, patch);
    } catch (e) {
      toast.error("Couldn't save changes", e.message, () => patchHardware(id, patch));
      loadAll();
    }
  }

  async function removeHardware(id) {
    setHardware((hs) => hs.filter((h) => h.id !== id));
    try {
      await deleteHardware(id);
    } catch (e) {
      toast.error("Couldn't delete", e.message, () => removeHardware(id));
      loadAll();
    }
  }

  return (
    <>
      <div className="main-inner" style={{ paddingBottom: 0 }}>
        <div className="tabs">
          <button className={"tab-btn" + (tab === "inbox" ? " active" : "")} onClick={() => setTab("inbox")}>
            <Inbox size={14} /> Inbox
          </button>
          <button className={"tab-btn" + (tab === "roadmap" ? " active" : "")} onClick={() => setTab("roadmap")}>
            <Trello size={14} /> Roadmap
          </button>
          <button className={"tab-btn" + (tab === "changelog" ? " active" : "")} onClick={() => setTab("changelog")}>
            <History size={14} /> Changelog
          </button>
        </div>
      </div>

      {tab === "inbox" && <FeatureInbox items={features} onAdd={addFeature} onUpdate={patchFeature} onDelete={removeFeature} />}
      {tab === "roadmap" && <RoadmapBoard items={features} onUpdate={patchFeature} onDelete={removeFeature} />}
      {tab === "changelog" && (
        <ChangelogPanel items={features} releases={releases} onAddRelease={addRelease} onDeleteRelease={removeRelease} onAssignRelease={assignRelease} />
      )}
      {tab === "hardware" && (
        <HardwarePanel items={hardware} features={features} clients={clients} onAdd={addHardware} onUpdate={patchHardware} onDelete={removeHardware} />
      )}
    </>
  );
}
