/**
 * /dashboard — auth-gated CV list.
 *
 * Server Component: fetches the user's resumes via the SSR Supabase client.
 * Middleware has already gated this route, so by the time we get here we're
 * guaranteed to have a user. The double-check on `user` is defensive only.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createResume } from "./actions";
import { ResumeRowActions } from "./ResumeRowActions";

export const metadata = {
  title: "Your CVs — slothcv",
};

// Format an ISO timestamp into a short, locale-aware "updated X ago" hint.
// Kept inline (not Intl.RelativeTimeFormat) to avoid SSR/CSR locale drift.
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: resumes, error } = await supabase
    .from("resumes")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

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
        {/*
          Wrapping the action in a <form> lets us call a Server Action from a
          Server Component without any client JS. The action handles the
          insert + redirect.
        */}
        <form action={createResume}>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            New CV
          </Button>
        </form>
      </div>

      <div className="mt-8">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Couldn&apos;t load your CVs. Refresh and try again.
          </div>
        ) : resumes && resumes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <Card key={r.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/editor/${r.id}`}
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
                    <ResumeRowActions id={r.id} />
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
              Hit “New CV” to start your first one.
            </p>
            <form action={createResume} className="mt-6 inline-block">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                New CV
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
