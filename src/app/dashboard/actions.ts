/**
 * Dashboard server actions.
 *
 * All four mutations (create / rename / delete / duplicate) run server-side
 * with the user's session cookie, so RLS policies are the authoritative
 * gate — clients can't bypass them by tampering with the request.
 *
 * The server-side `auth.uid()` enforcement means we technically don't need
 * to filter by `user_id` here, but doing so anyway is defense-in-depth and
 * makes the intent explicit if RLS is ever loosened by mistake.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createResume() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data, error } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, title: "Untitled CV", data: {} })
    .select("id")
    .single();

  if (error || !data) {
    // Server actions can throw — Next will surface to the nearest error
    // boundary. We keep the message generic so we don't leak DB internals.
    throw new Error("Couldn't create the CV. Please try again.");
  }

  revalidatePath("/dashboard");
  redirect(`/editor/${data.id}`);
}

export async function deleteResume(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // RLS guards this, but we filter explicitly too — belt and suspenders.
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Couldn't delete the CV.");
  }
  revalidatePath("/dashboard");
}

export async function duplicateResume(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  // Fetch source row first so we copy `data` verbatim. RLS ensures the
  // SELECT only succeeds if the row belongs to the caller.
  const { data: source, error: fetchError } = await supabase
    .from("resumes")
    .select("title, data")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !source) {
    throw new Error("Couldn't read the CV to duplicate.");
  }

  const { error: insertError } = await supabase.from("resumes").insert({
    user_id: user.id,
    title: `${source.title} (copy)`,
    data: source.data,
  });

  if (insertError) {
    throw new Error("Couldn't duplicate the CV.");
  }

  revalidatePath("/dashboard");
}

export async function renameResume(id: string, title: string) {
  const trimmed = title.trim().slice(0, 120); // hard cap; UI also limits.
  if (!trimmed) {
    throw new Error("Title can't be empty.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("resumes")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Couldn't rename the CV.");
  }

  revalidatePath("/dashboard");
  revalidatePath(`/editor/${id}`);
}

export async function saveResumeData(id: string, data: unknown) {
  // Phase 1 stores whatever JSON the editor stub passes. Phase 2 will
  // replace this with a typed schema validated via Zod before persisting.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("resumes")
    .update({ data: data ?? {}, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Couldn't save changes.");
  }

  revalidatePath(`/editor/${id}`);
}
