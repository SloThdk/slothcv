/**
 * Privacy Policy — slothcv.
 *
 * GDPR-shaped, written plainly. Every claim here matches what the codebase
 * actually does, not what a generic policy template says:
 *   - Auth: Supabase magic-link + Google OAuth (apps/auth/*)
 *   - Profile data: profiles table (display_name, avatar_url, email)
 *   - User content: resumes table + avatars Storage bucket
 *   - Cookies: only Supabase session cookies (essential)
 *   - localStorage: slothcv.lang, slothcv.theme, slothcv.cookies.acked
 *   - No analytics, no third-party trackers, no advertising
 *
 * Bilingual: long-form prose forks on `lang === "da"` rather than going
 * through 100+ translation keys — same pattern as the philipsloth-portfolio
 * privacy page so future maintainers see one shape.
 */

"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const LAST_UPDATED = "2026-04-28";

export default function PrivacyPage(): JSX.Element {
  const { lang } = useLanguage();
  const isDa = lang === "da";

  return (
    <main className="bg-[color:var(--color-bg)] text-[color:var(--color-text)] transition-colors">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          {isDa ? "Privatlivspolitik" : "Privacy"}
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {isDa ? "Hvad slothcv samler, helt klart." : "What slothcv collects, plainly."}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-subtle)]">
          {isDa ? "Sidst opdateret" : "Last updated"}: {LAST_UPDATED}
        </p>

        <p className="mt-8 text-base text-[color:var(--color-text-muted)] sm:text-lg">
          {isDa
            ? "slothcv er bygget til at lave CV'er — intet andet. Ingen analytics, ingen tracking-pixels, ingen reklame-netværk, ingen tredjeparts-fingerprinting. Det vi gemmer er det du selv lægger ind, og det vi har brug for at holde dig logget ind. Her er præcist hvad det betyder."
            : "slothcv is built to make CVs — nothing else. No analytics, no tracking pixels, no advertising networks, no third-party fingerprinting. What we store is what you put in, plus what we need to keep you signed in. Here is exactly what that means."}
        </p>

        <Section title={isDa ? "Hvem står bag" : "Who is behind this"}>
          <p>
            {isDa
              ? "slothcv drives af Philip Sloth, enkeltmandsvirksomhed med base i Danmark. Du kan kontakte mig direkte på "
              : "slothcv is operated by Philip Sloth, a sole proprietorship based in Denmark. You can contact me directly at "}
            <a className="underline underline-offset-4" href="mailto:philipsloth1@gmail.com">
              philipsloth1@gmail.com
            </a>
            {isDa
              ? " om alt der vedrører dine data."
              : " about anything to do with your data."}
          </p>
        </Section>

        <Section title={isDa ? "Hvad vi gemmer" : "What we store"}>
          <ul className="space-y-3">
            <Item label={isDa ? "Din e-mail" : "Your email address"}>
              {isDa
                ? "Bruges til at logge ind via magic-link og som unik konto-identifikator. Hvis du logger ind med Google, modtager vi e-mailen og navnet fra din Google-konto."
                : "Used to sign in via magic link and as your unique account identifier. If you sign in with Google, we receive the email address and name from your Google account."}
            </Item>
            <Item label={isDa ? "Visningsnavn og avatar (valgfrit)" : "Display name and avatar (optional)"}>
              {isDa
                ? "Det navn og det billede du selv lægger op på /account. Bliver kun vist i dit eget dashboard."
                : "The name and image you upload on /account. Shown only inside your own dashboard."}
            </Item>
            <Item label={isDa ? "Dit CV-indhold" : "Your CV content"}>
              {isDa
                ? "Alt du skriver eller uploader i editoren — navn, kontakt, erhvervserfaring, uddannelse, kompetencer, eventuelle profilbilleder eller egne billeder. Det er dit CV, og vi gemmer det så det er der næste gang du logger ind."
                : "Everything you type or upload in the editor — name, contact details, work history, education, skills, any profile photo or custom images. It is your CV; we store it so it is there next time you sign in."}
            </Item>
            <Item label={isDa ? "Tekniske logs" : "Technical logs"}>
              {isDa
                ? "Vores hosting-udbydere (Supabase, Cloudflare) holder kortvarige drifts-logs (IP-adresse, request-tidspunkt, fejl-spor) til at beskytte mod misbrug og diagnosticere fejl. Vi gennemgår dem ikke for at profilere dig."
                : "Our hosting providers (Supabase, Cloudflare) keep short-lived operational logs (IP address, request timestamp, error trace) to protect against abuse and diagnose problems. We do not review them to profile you."}
            </Item>
          </ul>
        </Section>

        <Section title={isDa ? "Hvad vi IKKE gemmer" : "What we do NOT store"}>
          <ul className="space-y-2 text-[color:var(--color-text-muted)]">
            <li>
              {isDa
                ? "Ingen analytics — ingen Google Analytics, Plausible, PostHog eller lignende."
                : "No analytics — no Google Analytics, Plausible, PostHog, or similar."}
            </li>
            <li>
              {isDa
                ? "Ingen reklame-pixels eller -netværk."
                : "No advertising pixels or networks."}
            </li>
            <li>
              {isDa
                ? "Ingen tredjeparts-fingerprinting (canvas, audio, fonts, device-API)."
                : "No third-party fingerprinting (canvas, audio, fonts, device APIs)."}
            </li>
            <li>
              {isDa
                ? "Ingen profilering, ingen scoring, intet salg af data — nogensinde."
                : "No profiling, no scoring, no selling of data — ever."}
            </li>
          </ul>
        </Section>

        <Section title={isDa ? "Cookies og lokalt lager" : "Cookies and local storage"}>
          <p className="mb-3">
            {isDa
              ? "Vi bruger to slags lokal opbevaring i din browser. Begge er strikt nødvendige for at sitet virker, og ingen af dem bruges til tracking."
              : "We use two kinds of local storage in your browser. Both are strictly necessary for the site to work, and neither is used for tracking."}
          </p>
          <ul className="space-y-3">
            <Item label={isDa ? "Auth-session-cookies (Supabase)" : "Auth session cookies (Supabase)"}>
              {isDa
                ? "Sat når du logger ind, så du forbliver logget ind når du opdaterer eller skifter side. Slettes når du logger ud eller når sessionen udløber. Klassificeret som strikt nødvendige under ePrivacy/GDPR."
                : "Set when you sign in so you stay signed in across reloads and page changes. Cleared when you sign out or when the session expires. Classified as strictly necessary under ePrivacy/GDPR."}
            </Item>
            <Item label="localStorage">
              {isDa
                ? "Husker dit valg af tema (slothcv.theme), sprog (slothcv.lang) og om du har lukket cookie-meddelelsen (slothcv.cookies.acked). Disse forlader aldrig din browser."
                : "Remembers your theme choice (slothcv.theme), language (slothcv.lang), and whether you dismissed the cookie notice (slothcv.cookies.acked). These never leave your browser."}
            </Item>
          </ul>
        </Section>

        <Section title={isDa ? "Hvor data ligger" : "Where the data lives"}>
          <p>
            {isDa
              ? "Konto-data og CV'er ligger i en Supabase-database hostet i EU. Uploadede billeder ligger i Supabase Storage, samme region. Sitet leveres via Cloudflare Pages — Cloudflares globale edge-CDN cacher kun statiske assets, ikke dine data."
              : "Account data and CVs live in a Supabase database hosted in the EU. Uploaded images live in Supabase Storage in the same region. The site is delivered via Cloudflare Pages — Cloudflare's global edge CDN caches only static assets, not your data."}
          </p>
        </Section>

        <Section title={isDa ? "Tredjeparter vi bruger" : "Third parties we use"}>
          <ul className="space-y-3">
            <Item label="Supabase">
              {isDa
                ? "Database, godkendelse og fil-storage. Behandler dine data på vegne af slothcv. EU-region."
                : "Database, authentication, and file storage. Processes your data on behalf of slothcv. EU region."}
            </Item>
            <Item label="Cloudflare">
              {isDa
                ? "Hosting og CDN. Ser request-metadata (IP, URL, user-agent) i kortvarige drifts-logs. Sælger eller profilerer ikke."
                : "Hosting and CDN. Sees request metadata (IP, URL, user agent) in short-lived operational logs. Does not sell or profile."}
            </Item>
            <Item label="Google (kun ved Google-login / only if you sign in with Google)">
              {isDa
                ? "Hvis du klikker 'Fortsæt med Google', sendes du til Google for at godkende. Google deler din e-mail og dit navn med slothcv. Vi anmoder ikke om kontakter, kalender eller andet."
                : "If you click 'Continue with Google', you are redirected to Google to authenticate. Google shares your email and name with slothcv. We do not request contacts, calendar, or anything else."}
            </Item>
            <Item label="Resend">
              {isDa
                ? "Sender transaktions-e-mails (login-links, kontofølsomme beskeder). Ser modtager-e-mail og indhold mens beskeden er undervejs."
                : "Sends transactional emails (sign-in links, account-sensitive notifications). Sees recipient email and content while the message is in flight."}
            </Item>
          </ul>
        </Section>

        <Section title={isDa ? "Hvor længe vi gemmer det" : "How long we keep it"}>
          <p>
            {isDa
              ? "Vi gemmer dine data så længe din konto er aktiv. Sletter du din konto via /account, fjernes alt — auth-rækken, profil-rækken, alle CV'er, versionshistorik og uploadede billeder — permanent og uden mulighed for at fortryde. Drifts-logs hos Supabase og Cloudflare slettes automatisk efter deres standard-retentions-perioder (typisk 30 dage)."
              : "We keep your data for as long as your account is active. If you delete your account via /account, everything is removed — the auth row, the profile row, all CVs, version history, and uploaded images — permanently and irrecoverably. Operational logs at Supabase and Cloudflare are deleted automatically after their default retention windows (typically 30 days)."}
          </p>
        </Section>

        <Section title={isDa ? "Dine rettigheder" : "Your rights"}>
          <p className="mb-3">
            {isDa
              ? "Under GDPR har du ret til indsigt i, berigtigelse af, sletning af og portabilitet af dine personoplysninger. I praksis:"
              : "Under GDPR you have the right to access, rectify, erase, and port your personal data. In practice:"}
          </p>
          <ul className="space-y-2 text-[color:var(--color-text-muted)]">
            <li>
              {isDa
                ? "Indsigt + portabilitet: skriv til mig og jeg eksporterer dine data i et læseligt format."
                : "Access + portability: email me and I will export your data in a readable format."}
            </li>
            <li>
              {isDa
                ? "Berigtigelse: brug editoren — du har fuld kontrol over alt indhold."
                : "Rectification: use the editor — you have full control over every field."}
            </li>
            <li>
              {isDa
                ? "Sletning: brug 'Slet min konto' på "
                : "Erasure: use 'Permanently delete my account' on "}
              <Link href="/account" className="underline underline-offset-4">/account</Link>
              {isDa
                ? ". Det fjerner alt med det samme."
                : ". This removes everything immediately."}
            </li>
            <li>
              {isDa
                ? "Tilbagetrækning af samtykke: log ud, så ophører enhver fortsat behandling. Slet kontoen for fuld effekt."
                : "Withdraw consent: sign out and any continued processing stops. Delete the account for full effect."}
            </li>
          </ul>
          <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
            {isDa ? "Mener du at vi har behandlet dine data forkert, kan du klage til Datatilsynet på " : "If you believe we have mishandled your data, you may complain to the Danish Data Protection Authority (Datatilsynet) at "}
            <a className="underline underline-offset-4" href="https://datatilsynet.dk" target="_blank" rel="noopener noreferrer">
              datatilsynet.dk
            </a>
            .
          </p>
        </Section>

        <Section title={isDa ? "Børn" : "Children"}>
          <p>
            {isDa
              ? "slothcv er ikke målrettet personer under 16 år. Hvis du er forælder og opdager at dit barn har oprettet en konto, så skriv til mig — jeg sletter den."
              : "slothcv is not directed at people under 16. If you are a parent and discover your child has created an account, contact me and I will delete it."}
          </p>
        </Section>

        <Section title={isDa ? "Ændringer" : "Changes"}>
          <p>
            {isDa
              ? "Hvis denne politik ændres, opdateres datoen øverst på siden. Materielle ændringer flagges også via en banner næste gang du besøger sitet."
              : "If this policy changes, the date at the top is updated. Material changes are also flagged via a banner the next time you visit the site."}
          </p>
        </Section>

        <Section title={isDa ? "Kontakt" : "Contact"}>
          <p>
            {isDa ? "Spørgsmål, anmodninger eller bekymringer: " : "Questions, requests, or concerns: "}
            <a className="underline underline-offset-4" href="mailto:philipsloth1@gmail.com">
              philipsloth1@gmail.com
            </a>
            .
          </p>
        </Section>

        <p className="mt-16 text-sm text-[color:var(--color-text-subtle)]">
          {isDa ? "Også relevant: " : "Also relevant: "}
          <Link href="/terms" className="underline underline-offset-4">
            {isDa ? "vilkår" : "terms of service"}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

/** Section heading + spacing wrapper. Keeps the JSX above readable. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-text)] sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-2 text-base text-[color:var(--color-text-muted)] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** List item with a strong leading label, used inside <Section>. */
function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <strong className="text-[color:var(--color-text)]">{label}</strong>{" "}
      <span className="text-[color:var(--color-text-muted)]">— {children}</span>
    </li>
  );
}
