/**
 * /login — magic-link + Google OAuth entrypoint.
 *
 * Both paths terminate at /auth/callback, which exchanges the auth code for a
 * session cookie and redirects on. The form is a Client Component because
 * Supabase's `signInWithOtp` / `signInWithOAuth` need to run in the browser
 * to receive the redirect.
 */

import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in — slothcv",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Sign in to slothcv
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Save your work and pick up where you left off, on any device.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-center text-sm text-neutral-400">Loading…</p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
