import { supabase } from "../supabaseClient";

export async function fetchCompanies() {
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function insertCompany(id, name) {
  const { error } = await supabase.from("companies").insert({ id, name: name || "" });
  if (error) throw error;
}

export async function renameCompany(id, name) {
  const { error } = await supabase.from("companies").update({ name }).eq("id", id);
  if (error) throw error;
}

// True when the companies table hasn't been created yet (SQL not run).
// New clients still work in that case — they just aren't grouped.
export function isMissingCompaniesTable(err) {
  if (!err) return false;
  const msg = String(err.message || "");
  return err.code === "42P01" || err.code === "PGRST205" || (/companies/.test(msg) && /(not find|does not exist|schema cache)/i.test(msg));
}
