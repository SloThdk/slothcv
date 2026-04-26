/**
 * /editor/[id] — Phase 1 placeholder editor.
 *
 * Loads the resume row server-side (RLS guarantees ownership), then hands
 * the title + data blob to the client component. The actual drag-and-drop
 * editor lands in Phase 2; for now this proves the persistence loop:
 *
 *   create → render → rename → save → reload → still there.
 */

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorClient } from "./EditorClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return {
    title: data?.title ? `${data.title} — slothcv` : "Editor — slothcv",
  };
}

export default async function EditorPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/editor/${id}`);

  // RLS: this query only returns rows owned by the authenticated user.
  // .maybeSingle() returns null (instead of throwing) when the row doesn't
  // exist OR isn't visible to the caller — both surface as a 404, so we
  // never leak whether a given id exists for someone else.
  const { data: resume, error } = await supabase
    .from("resumes")
    .select("id, title, data, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !resume) notFound();

  return (
    <EditorClient
      id={resume.id}
      initialTitle={resume.title}
      initialData={resume.data}
      updatedAt={resume.updated_at}
    />
  );
}
