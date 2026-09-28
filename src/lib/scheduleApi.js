import { supabase } from "../supabaseClient";
import { uid } from "./helpers";

export const EVENT_TYPES = ["Milestone", "Delivery", "Follow-up", "Task", "Meeting"];

export function emptyEvent(dateStr) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: "",
    event_type: "Task",
    client_id: null,
    start_date: dateStr,
    end_date: null,
    start_time: null,
    end_time: null,
    priority: "Medium",
    notes: "",
    done: false,
    created_at: now,
    updated_at: now,
  };
}

// True when the schedule_events table hasn't been created yet (SQL not run).
export function isMissingTable(err) {
  if (!err) return false;
  const msg = String(err.message || "");
  return err.code === "42P01" || err.code === "PGRST205" || /schedule_events/.test(msg) && /(not find|does not exist|schema cache)/i.test(msg);
}

const COLUMNS = ["id", "title", "event_type", "client_id", "start_date", "end_date", "start_time", "end_time", "priority", "notes", "done", "created_at", "updated_at"];

function pick(item) {
  const out = {};
  COLUMNS.forEach((k) => { if (k in item) out[k] = item[k]; });
  return out;
}

export async function fetchEvents() {
  const { data, error } = await supabase.from("schedule_events").select("*").order("start_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertEvent(item, userId) {
  const { error } = await supabase.from("schedule_events").insert({ ...pick(item), created_by: userId || null });
  if (error) throw error;
}

export async function updateEvent(id, patch) {
  const { error } = await supabase
    .from("schedule_events")
    .update({ ...pick(patch), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("schedule_events").delete().eq("id", id);
  if (error) throw error;
}
