/**
 * Resume CRUD helpers — thin wrappers over the Supabase client used by the
 * dashboard list and editor.
 *
 * Each call relies on RLS for ownership enforcement; we still pass the
 * `user_id` on insert because RLS' `with check` predicate needs it to match
 * `auth.uid()`. Reads/updates/deletes don't need a `.eq("user_id", uid)`
 * filter — RLS scopes them implicitly — but adding one would be defense in
 * depth if RLS is ever loosened.
 */

import { createClient } from "./supabase/client";

export interface ResumeRow {
  id: string;
  title: string;
  updated_at: string;
}

export interface ResumeFull extends ResumeRow {
  data: unknown;
  created_at: string;
}

export async function listResumes(): Promise<ResumeRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResumeRow[];
}

export async function getResume(id: string): Promise<ResumeFull | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("id, title, data, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as ResumeFull | null;
}

export async function createResume(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data, error } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, title: "Untitled CV", data: {} })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create CV.");
  return data.id;
}

export async function deleteResume(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("resumes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function duplicateResume(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  // Read source first; RLS guarantees we only see our own rows.
  const { data: src, error: readErr } = await supabase
    .from("resumes")
    .select("title, data")
    .eq("id", id)
    .single();
  if (readErr || !src) throw new Error(readErr?.message ?? "CV not found.");

  const { error: insertErr } = await supabase.from("resumes").insert({
    user_id: user.id,
    title: `${src.title} (copy)`,
    data: src.data,
  });
  if (insertErr) throw new Error(insertErr.message);
}

export async function renameResume(id: string, title: string): Promise<void> {
  const trimmed = title.trim().slice(0, 120);
  if (!trimmed) throw new Error("Title can't be empty.");
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update({ title: trimmed })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveResumeData(id: string, data: unknown): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("resumes")
    .update({ data: data ?? {} })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
