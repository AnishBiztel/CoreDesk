import { supabase } from "../supabaseClient";
import { uid } from "./helpers";
import { DEFAULT_GTD_STEPS } from "./constants";

/* ---------- shaping helpers ---------- */

export function freshGathering(questions) {
  const list = questions && questions.length ? questions : [];
  return list.map((q) => ({ id: uid(), question: q, answer: "", updatedAt: "" }));
}

export function freshGtd(steps) {
  const list = steps && steps.length ? steps : DEFAULT_GTD_STEPS;
  return list.map((s) => ({ ...s, done: false, note: "", completedAt: "" }));
}

export function emptyClient(templates, companyId, departmentName) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name: "",
    contact: "",
    industry: "",
    stage: "Lead",
    churned: false,
    priority: "Medium",
    overview: "",
    nextAction: "",
    nextActionDate: "",
    lastContact: "",
    issues: [],
    specs: [],
    gtd: freshGtd(templates?.gtdSteps),
    gathering: freshGathering(templates?.gatheringQuestions),
    createdAt: now,
    updatedAt: now,
    stageEnteredAt: now,
    deletedAt: null,
    companyId: companyId || null,
    departmentName: departmentName || "",
    accountCode: "",
  };
}

export function emptySpec() {
  return {
    id: uid(),
    problem: "",
    constraints: "",
    scopeIn: "",
    scopeOut: "",
    status: "Draft",
    owner: "",
    updatedAt: new Date().toISOString(),
  };
}

export function fromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    contact: row.contact || "",
    industry: row.industry || "",
    stage: row.stage || "Lead",
    churned: row.churned || false,
    priority: row.priority || "Medium",
    overview: row.overview || "",
    nextAction: row.next_action || "",
    nextActionDate: row.next_action_date || "",
    lastContact: row.last_contact || "",
    issues: row.issues || [],
    specs: row.specs || [],
    gtd: row.gtd && row.gtd.length ? row.gtd : freshGtd(),
    gathering: row.gathering && row.gathering.length ? row.gathering : freshGathering(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stageEnteredAt: row.stage_entered_at || row.created_at,
    deletedAt: row.deleted_at || null,
    createdBy: row.created_by || null,
    companyId: row.company_id || null,
    departmentName: row.department_name || "",
    accountCode: row.account_code || "",
  };
}

export function toDb(client) {
  return {
    name: client.name,
    contact: client.contact,
    industry: client.industry,
    stage: client.stage,
    churned: client.churned,
    priority: client.priority,
    overview: client.overview,
    next_action: client.nextAction,
    next_action_date: client.nextActionDate || null,
    last_contact: client.lastContact || null,
    issues: client.issues,
    specs: client.specs,
    gtd: client.gtd,
    gathering: client.gathering,
    stage_entered_at: client.stageEnteredAt,
    updated_at: new Date().toISOString(),
    company_id: client.companyId || null,
    department_name: client.departmentName || "",
    account_code: client.accountCode || "",
  };
}

export function ensureShape(client) {
  return {
    ...client,
    gtd: client.gtd && client.gtd.length ? client.gtd : freshGtd(),
    priority: client.priority || "Medium",
    overview: client.overview || "",
    gathering: client.gathering && client.gathering.length ? client.gathering : freshGathering(),
    stageEnteredAt: client.stageEnteredAt || client.createdAt || new Date().toISOString(),
    companyId: client.companyId || null,
    departmentName: client.departmentName || "",
    accountCode: client.accountCode || "",
  };
}

/* ---------- clients ---------- */

export async function fetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map(fromDb).map(ensureShape);
}

export async function fetchTrashedClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data.map(fromDb).map(ensureShape);
}

export async function insertClient(client, userId) {
  const { error } = await supabase.from("clients").insert({
    id: client.id,
    ...toDb(client),
    created_by: userId || null,
    created_at: client.createdAt,
    stage_entered_at: client.stageEnteredAt,
  });
  if (error) throw error;
}

export async function updateClientRow(id, client) {
  const { error } = await supabase.from("clients").update(toDb(client)).eq("id", id);
  if (error) throw error;
}

export async function softDeleteClient(id) {
  const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function restoreClient(id) {
  const { error } = await supabase.from("clients").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function permanentlyDeleteClient(id) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function bulkInsertClients(rows) {
  const { error } = await supabase.from("clients").insert(rows);
  if (error) throw error;
}

/* ---------- activity log ---------- */

export async function logActivity(clientId, userEmail, action, detail) {
  // Best-effort: activity logging should never block the primary action.
  try {
    await supabase.from("client_activity").insert({
      id: uid(),
      client_id: clientId,
      user_email: userEmail || "unknown",
      action,
      detail: detail || "",
    });
  } catch (e) {
    console.warn("activity log failed", e);
  }
}

export async function fetchActivity(clientId) {
  const { data, error } = await supabase
    .from("client_activity")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

/* ---------- comments ---------- */

export async function fetchComments(clientId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment(clientId, targetType, targetId, userEmail, body) {
  const { error } = await supabase.from("comments").insert({
    id: uid(),
    client_id: clientId,
    target_type: targetType,
    target_id: targetId,
    user_email: userEmail,
    body,
  });
  if (error) throw error;
}

export async function deleteComment(id) {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- file attachments (Supabase Storage) ---------- */

export const FILES_BUCKET = "client-files";

export async function listFiles(clientId) {
  const { data, error } = await supabase.storage.from(FILES_BUCKET).list(clientId, {
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  return data || [];
}

export async function uploadFile(clientId, file) {
  const path = `${clientId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

export async function getFileUrl(clientId, fileName) {
  const { data, error } = await supabase.storage
    .from(FILES_BUCKET)
    .createSignedUrl(`${clientId}/${fileName}`, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFile(clientId, fileName) {
  const { error } = await supabase.storage.from(FILES_BUCKET).remove([`${clientId}/${fileName}`]);
  if (error) throw error;
}

/* ---------- profiles / roles ---------- */

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("email");
  if (error) throw error;
  return data || [];
}

export async function setProfileRole(userId, role) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

/* ---------- workspace settings (shared templates) ---------- */

export async function fetchWorkspaceSettings() {
  const { data, error } = await supabase.from("workspace_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateWorkspaceSettings(patch) {
  const { error } = await supabase.from("workspace_settings").update(patch).eq("id", 1);
  if (error) throw error;
}
