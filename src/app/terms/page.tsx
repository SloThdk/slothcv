/**
 * Terms of Service — SlothCV.
 *
 * Plain-language, written to match the actual service:
 *   - free CV builder
 *   - up to 5 CVs per account
 *   - vector PDF export
 *   - no watermarks, no signup wall to export
 *   - account auth via email + password or Google OAuth
 *
 * Bilingual via lang fork rather than 100+ translation keys, mirroring the
 * pattern used on the privacy page.
 */

"use client";

import type { JSX } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const LAST_UPDATED = "2026-04-28";

export default function TermsPage(): JSX.Element {
  const { lang } = useLanguage();
  const isDa = lang === "da";

  return (
    <main className="bg-[color:var(--color-bg)] text-[color:var(--color-text)] transition-colors">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
          {isDa ? "Vilkår" : "Terms"}
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          {isDa ? "Vilkår for brug af SlothCV." : "Terms of using SlothCV."}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-subtle)]">
          {isDa ? "Sidst opdateret" : "Last updated"}: {LAST_UPDATED}
        </p>

        <p className="mt-8 text-base text-[color:var(--color-text-muted)] sm:text-lg">
          {isDa
            ? "SlothCV er en gratis CV-bygger drevet af Philip Sloth med base i Danmark. Ved at oprette en konto eller bruge sitet accepterer du disse vilkår. De er korte med vilje."
            : "SlothCV is a free CV builder operated by Philip Sloth, based in Denmark. By creating an account or using the site, you agree to these terms. They are short on purpose."}
        </p>

        <Section title={isDa ? "Hvad SlothCV er" : "What SlothCV is"}>
          <p>
            {isDa
              ? "Et værktøj til at bygge et CV i browseren og eksportere det som PDF. Gratis at bruge. Ingen vandmærker, ingen tilmeldingsmur for at hente, ingen prøveperioder der laver sig selv om til abonnementer. Du kan have op til 5 CV'er på din konto."
              : "A tool to build a CV in the browser and export it as a PDF. Free to use. No watermarks, no signup wall to export, no trials that turn into subscriptions. You can keep up to 5 CVs on your account."}
          </p>
        </Section>

        <Section title={isDa ? "Din konto" : "Your account"}>
          <p>
            {isDa
              ? "Du opretter en konto med din e-mail og adgangskode eller via Google. Du er ansvarlig for at holde adgangen til din konto og den tilknyttede e-mail eller Google-konto sikker — jeg kan ikke gendanne adgang hvis den mistes. Én person, én konto. Del den ikke med andre."
              : "You sign in with your email and password, or via Google. You are responsible for keeping access to your account and the linked email or Google account secure — I cannot recover access if it is lost. One person, one account. Do not share it."}
          </p>
        </Section>

        <Section title={isDa ? "Dit indhold" : "Your content"}>
          <p>
            {isDa
              ? "Indholdet du lægger ind — tekst, billeder, CV-data — tilhører dig. Jeg gemmer det udelukkende for at vise det i editoren, eksportere det til PDF og holde det tilgængeligt næste gang du logger ind. Jeg sælger det ikke, viser det ikke til andre brugere og bruger det ikke til at træne modeller eller på anden måde profitere af det."
              : "The content you put in — text, images, CV data — belongs to you. I store it solely to display it in the editor, export it to PDF, and keep it available the next time you sign in. I do not sell it, expose it to other users, or use it to train models or otherwise profit from it."}
          </p>
          <p className="mt-3">
            {isDa
              ? "Ved at uploade indhold giver du mig den tekniske licens, der skal til for at hoste, vise og eksportere det til dig — ikke andet. Licensen ophører øjeblikkeligt når du sletter indholdet eller kontoen."
              : "By uploading content you grant me the technical license needed to host, display, and export it back to you — nothing more. That license ends the moment you delete the content or the account."}
          </p>
        </Section>

        <Section title={isDa ? "Acceptabel brug" : "Acceptable use"}>
          <p className="mb-2">{isDa ? "Brug ikke SlothCV til:" : "Do not use SlothCV to:"}</p>
          <ul className="list-disc space-y-1 pl-6 text-[color:var(--color-text-muted)]">
            <li>{isDa ? "ulovligt indhold, hadefulde ytringer, chikane eller seksuelt materiale med mindreårige" : "illegal content, hateful speech, harassment, or sexual content involving minors"}</li>
            <li>{isDa ? "udgive sig for at være en anden eller indsende dokumenter under falsk identitet" : "impersonate another person or submit documents under a false identity"}</li>
            <li>{isDa ? "sende spam eller masse-genererede CV'er til tredjeparter" : "send spam or mass-generated CVs to third parties"}</li>
            <li>{isDa ? "scrape, reverse-engineer'e eller automatisk afsøge sitet ud over normalt brug" : "scrape, reverse-engineer, or automate the site beyond normal interactive use"}</li>
            <li>{isDa ? "uploade malware, exploits eller indhold der forsøger at skade andre brugere" : "upload malware, exploits, or content that tries to harm other users"}</li>
          </ul>
          <p className="mt-3">
            {isDa
              ? "Jeg kan suspendere eller slette en konto der overtræder ovenstående uden forudgående varsel."
              : "I may suspend or remove any account that violates the above without prior notice."}
          </p>
        </Section>

        <Section title={isDa ? "Tilgængelighed" : "Availability"}>
          <p>
            {isDa
              ? "SlothCV leveres 'som det er'. Jeg tilstræber at sitet er oppe og kører, men der er ingen garanteret oppetid, og funktioner kan ændre sig. Planlagt vedligehold flagges hvor det giver mening."
              : "SlothCV is provided 'as is'. I aim to keep it running smoothly, but there is no guaranteed uptime and features may change. Planned maintenance is flagged where it makes sense."}
          </p>
        </Section>

        <Section title={isDa ? "Fremtidig prissætning" : "Future pricing"}>
          <p>
            {isDa
              ? "SlothCV er gratis i dag. Jeg forbeholder mig retten til at introducere betalte tiers i fremtiden for at dække omkostninger når brugen vokser. Hvis jeg introducerer betaling, vil de eksisterende gratis-funktioner — op til 5 CV'er per konto, vektor-PDF-eksport, ingen vandmærker — forblive gratis for konti oprettet inden den dato, uden tvungen migration. Eventuelle nye funktioner (fx ubegrænsede CV'er, AI-assisteret skrivning, premium-skabeloner) kan kræve en betalt plan. Du kan altid eksportere alle dine CV'er som PDF og slette din konto med ét klik via "
              : "SlothCV is free today. I reserve the right to introduce paid tiers in the future to cover costs as usage grows. If I introduce payment, the existing free features — up to 5 CVs per account, vector PDF export, no watermarks — will remain free for accounts created before that date, with no forced migration. Any new features (e.g. unlimited CVs, writing assistance, premium templates) may require a paid plan. You can always export all your CVs as PDF and delete your account with one click via "}
            <Link href="/account" className="underline underline-offset-4">/account</Link>
            {isDa ? "." : "."}
          </p>
        </Section>

        <Section title={isDa ? "Ansvarsfraskrivelse" : "Liability"}>
          <p>
            {isDa
              ? "I videst muligt omfang efter dansk ret kan SlothCV og Philip Sloth ikke holdes ansvarlig for indirekte tab, mistede indtjeninger eller tab af data ud over værdien af det du har betalt for tjenesten — som er 0 kr. Det fritager ikke for ansvar i tilfælde af grov uagtsomhed eller forsætlig handling. Dette begrænser ikke dine rettigheder som forbruger efter dansk ret."
              : "To the maximum extent permitted by Danish law, SlothCV and Philip Sloth are not liable for indirect losses, lost earnings, or data loss beyond the value of what you paid for the service — which is zero. This does not exclude liability for gross negligence or wilful misconduct. Nothing in these terms limits your rights as a consumer under Danish law."}
          </p>
        </Section>

        <Section title={isDa ? "Opsigelse" : "Termination"}>
          <p>
            {isDa
              ? "Du kan slette din konto når som helst via "
              : "You can delete your account at any time via "}
            <Link href="/account" className="underline underline-offset-4">/account</Link>
            {isDa
              ? ". Det fjerner alt — auth-data, profil, CV'er, versionshistorik og uploadede billeder — permanent og uden mulighed for at fortryde. Jeg kan opsige eller suspendere konti der overtræder vilkårene; uden grov misbrug giver jeg en advarsel først."
              : ". This removes everything — auth data, profile, CVs, version history, and uploaded images — permanently and irrecoverably. I may terminate or suspend accounts that violate these terms; absent serious abuse, I will warn first."}
          </p>
        </Section>

        <Section title={isDa ? "Ændringer i vilkår" : "Changes to these terms"}>
          <p>
            {isDa
              ? "Jeg kan opdatere disse vilkår. Den seneste version ligger altid på "
              : "I may update these terms. The latest version is always at "}
            <Link href="/terms" className="underline underline-offset-4">SlothCV.com/terms</Link>
            {isDa
              ? " med ny dato øverst. Materielle ændringer flagges via en banner. Fortsat brug af sitet efter en ændring betyder accept af de nye vilkår."
              : " with a fresh date at the top. Material changes are flagged via a banner. Continued use of the site after an update means you accept the new terms."}
          </p>
        </Section>

        <Section title={isDa ? "Lovvalg og værneting" : "Governing law"}>
          <p>
            {isDa
              ? "Disse vilkår er underlagt dansk ret. Tvister afgøres af de almindelige danske domstole, medmindre forbrugerlovgivningen anviser andet."
              : "These terms are governed by Danish law. Disputes will be resolved by the ordinary Danish courts, unless consumer law directs otherwise."}
          </p>
        </Section>

        <Section title={isDa ? "Kontakt" : "Contact"}>
          <p>
            {isDa ? "Spørgsmål om vilkårene: " : "Questions about these terms: "}
            <a className="underline underline-offset-4" href="mailto:philipsloth1@gmail.com">
              philipsloth1@gmail.com
            </a>
            .
          </p>
        </Section>

        <p className="mt-16 text-sm text-[color:var(--color-text-subtle)]">
          {isDa ? "Også relevant: " : "Also relevant: "}
          <Link href="/privacy" className="underline underline-offset-4">
            {isDa ? "privatlivspolitik" : "privacy policy"}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

/** Section heading + spacing wrapper. */
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
