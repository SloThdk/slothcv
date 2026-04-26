/**
 * /dashboard — auth-gated CV list (client component, static export).
 *
 * Wrapped in AuthGate so anonymous visitors are bounced to /login. Once
 * mounted with a user, fetches resumes via the Supabase client; RLS scopes
 * the query to the caller's rows automatically.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/lib/auth-context";
import {
  listResumes,
  createResume,
  deleteResume,
  duplicateResume,
  type ResumeRow,
} from "@/lib/resumes";

// Small helper — keep it local so the editor can have its own variant later.
function formatUpdated(iso: string) {
  const updated = new Date(iso);
  const diffMs = Date.now() - updated.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return updated.toLocaleDateString();
}

function DashboardInner() {
  const router = useRouter();
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ResumeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fetch on mount AND when the user identity changes — covers sign-in
  // happening after the component has already rendered (rare but possible).
  useEffect(() => {
    let cancelled = false;
    listResumes()
      .then((rows) => {
        if (cancelled) return;
        // Clear any prior error on success — we only set error once we know.
        setError(null);
        setResumes(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load CVs.");
          setResumes([]);
        }
      });
    return () => {
      cancelled = true;
    };
    // user.id triggers a refetch if the signed-in user actually changes.
  }, [user?.id]);

  async function refresh() {
    try {
      setResumes(await listResumes());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.");
    }
  }

  async function onCreate() {
    setBusy(true);
    try {
      const id = await createResume();
      router.push(`/editor?id=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create CV.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this CV permanently?")) return;
    try {
      await deleteResume(id);
      toast.success("Deleted.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function onDuplicate(id: string) {
    try {
      await duplicateResume(id);
      toast.success("Duplicated.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Your CVs
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Auto-saved. Pick up where you left off.
          </p>
        </div>
        <Button type="button" onClick={onCreate} disabled={busy}>
          <Plus className="h-4 w-4" />
          {busy ? "Creating…" : "New CV"}
        </Button>
      </div>

      <div className="mt-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : resumes === null ? (
          <div className="text-center text-sm text-neutral-400">Loading…</div>
        ) : resumes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <Card key={r.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/editor?id=${r.id}`}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
                      <div>
                        <h3 className="font-semibold text-neutral-900 hover:underline">
                          {r.title}
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500">
                          Updated {formatUpdated(r.updated_at)}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Duplicate CV"
                        title="Duplicate"
                        onClick={() => {
                          void onDuplicate(r.id);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Delete CV"
                        title="Delete"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          void onDelete(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-neutral-300" />
            <h2 className="mt-4 text-lg font-semibold text-neutral-900">
              No CVs yet
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Hit &ldquo;New CV&rdquo; to start your first one.
            </p>
            <Button type="button" onClick={onCreate} className="mt-6" disabled={busy}>
              <Plus className="h-4 w-4" />
              {busy ? "Creating…" : "New CV"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
