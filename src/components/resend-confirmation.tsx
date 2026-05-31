"use client";

/**
 * ResendConfirmation — "send the confirmation e-mail again" control.
 *
 * Shared by the signup "Tjek din mail" screen AND the login "email not
 * confirmed" path, so a user who lost / deleted / never-received the mail is
 * never permanently stuck (can't log in, can't recover, can't re-signup —
 * the e-mail is "taken"). See rules/resend-confirmation-email-flow.md.
 *
 * Industry-standard handling, all in here so it can't drift between the two
 * call sites:
 *   - Captcha: resend is an unauthenticated auth endpoint → needs a FRESH
 *     single-use token (the signup/login token is already spent). Its OWN
 *     Turnstile mints one; managed mode solves it invisibly.
 *   - Cooldown: Supabase enforces a per-email (~60s) + hourly cap. Start a 60s
 *     countdown on mount when a mail was just sent (initialCooldown), and after
 *     every resend. Button is disabled + counts down meanwhile.
 *   - Anti-enumeration: same generic message regardless of outcome — never
 *     reveal whether the address exists or is already confirmed.
 */

import { useEffect, useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ResendConfirmation({
  email,
  initialCooldown = 0,
}: {
  email: string;
  /** 60 when rendered right after a mail was sent (signup screen); 0 on login. */
  initialCooldown?: number;
}) {
  const { t } = useLanguage();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [notice, setNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  // Tick the cooldown down. The setState is inside setTimeout (async), so this
  // does NOT trip react-hooks/set-state-in-effect.
  useEffect(() => {
    if (cooldown <= 0) return;
    const tmr = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(tmr);
  }, [cooldown]);

  async function resend() {
    setNotice(null);
    const clean = email.trim();
    if (!clean) {
      setNotice(t("resend.needEmail"));
      return;
    }
    if (cooldown > 0) return;
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setNotice(t("resend.needCaptcha"));
      return;
    }

    setResending(true);
    const supabase = createClient();
    const redirectTo =
      typeof window !== "undefined"
        ? new URL("/auth/callback", window.location.origin).toString()
        : "/auth/callback";
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: clean,
      options: {
        emailRedirectTo: redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    setResending(false);

    // Single-use token — refresh for any next attempt.
    turnstileRef.current?.reset();
    setCaptchaToken(null);
    // Start the cooldown regardless (per-email rate limit).
    setCooldown(60);

    if (
      error &&
      /rate|after \d|seconds|too many|for security|security purposes/i.test(
        error.message,
      )
    ) {
      setNotice(t("resend.rateLimited"));
    } else {
      // Anti-enumeration: identical message whether or not the account exists
      // / is already confirmed.
      setNotice(t("resend.sent", { email: clean }));
    }
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      {TURNSTILE_SITE_KEY && (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => setCaptchaToken(token)}
          onError={() => setCaptchaToken(null)}
          onExpire={() => setCaptchaToken(null)}
          options={{ theme: "auto", size: "normal" }}
        />
      )}
      <Button
        type="button"
        variant="outline"
        onClick={resend}
        disabled={
          resending || cooldown > 0 || (!!TURNSTILE_SITE_KEY && !captchaToken)
        }
      >
        {resending
          ? t("resend.sending")
          : cooldown > 0
            ? t("resend.cooldown", { n: cooldown })
            : t("resend.button")}
      </Button>
      {notice && (
        <p className="max-w-xs text-center text-xs text-[color:var(--color-text-subtle)]">
          {notice}
        </p>
      )}
    </div>
  );
}
