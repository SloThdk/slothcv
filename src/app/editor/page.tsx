/**
 * /editor — Phase 1 placeholder editor.
 *
 * We use a query parameter (`?id=...`) instead of a dynamic segment because
 * Phase 1 ships as a static export and Next 16's static-export mode doesn't
 * permit dynamic routes without compile-time `generateStaticParams`. CV ids
 * are user-generated, so we couldn't enumerate them at build time anyway.
 *
 * Phase 2 may flip to a Worker deploy and reintroduce `/editor/[id]`. The
 * UI cost of switching is one Link change in the dashboard.
 */

"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthGate } from "@/components/auth-gate";
import {
  getResume,
  renameResume,
  saveResumeData,
  type ResumeFull,
} from "@/lib/resumes";

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [resume, setResume] = useState<ResumeFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      // No id in the URL — bounce back to the dashboard so the user isn't
      // staring at a confused empty state.
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    getResume(id)
      .then((r) => {
        if (cancelled) return;
        if (!r) {
          setError("This CV doesn't exist or you don't have access.");
          return;
        }
        setError(null);
        setResume(r);
        setTitle(r.title);
        setSavedTitle(r.title);
        setLastSavedAt(r.updated_at);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load CV.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  function onSaveTitle() {
    if (!resume) return;
    if (title.trim() === savedTitle.trim() || !title.trim()) return;
    startTransition(async () => {
      try {
        await renameResume(resume.id, title);
        setSavedTitle(title);
        toast.success("Title saved.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  function onSaveAll() {
    if (!resume) return;
    startTransition(async () => {
      try {
        if (title.trim() && title.trim() !== savedTitle.trim()) {
          await renameResume(resume.id, title);
          setSavedTitle(title);
        }
        // Phase 1: editor state is a passthrough — Phase 2 will replace
        // resume.data with the real editor model.
        await saveResumeData(resume.id, resume.data ?? {});
        setLastSavedAt(new Date().toISOString());
        toast.success("Saved.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed.");
      }
    });
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline" className="mt-6">
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              All CVs
            </Button>
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={onSaveTitle}
            maxLength={120}
            className="max-w-md text-base font-medium"
            aria-label="CV title"
          />
        </div>
        <div className="flex items-center gap-3">
          {lastSavedAt && (
            <p className="text-xs text-neutral-400">
              Last saved {new Date(lastSavedAt).toLocaleTimeString()}
            </p>
          )}
          <Button onClick={onSaveAll} disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Phase 2 canvas placeholder */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-white p-8 text-center">
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-wider text-neutral-400">
              Phase 2
            </p>
            <h2 className="mt-2 text-xl font-semibold text-neutral-900">
              Drag-and-drop editor coming next
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              The canvas, blocks, design controls, and PDF export ship in the
              next pass. For now, your title and (empty) state save to the
              database — try the Save button, then refresh to confirm.
            </p>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Design
          </h3>
          <p className="text-sm text-neutral-400">
            Font, palette, spacing, and column controls arrive in Phase 2.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <AuthGate>
      {/* Suspense boundary — useSearchParams() needs one in Next 15+. */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-neutral-400">
            Loading…
          </div>
        }
      >
        <EditorInner />
      </Suspense>
    </AuthGate>
  );
}
