/**
 * Translations — single source of truth for every user-facing string the
 * SlothCV chrome renders. Mirrors the philipsloth-portfolio i18n shape so
 * future cross-pollination is one-paste.
 *
 * Adding a new string:
 *   1. Pick a dot.path key matching the surface it lives on (header / hero /
 *      editor / etc.) so future maintainers can find it.
 *   2. Provide both `en` and `da`. Use real æ / ø / å in Danish — never
 *      ae / oe / aa.
 *   3. Reference via `t("your.key")` in components.
 *
 * Keep this object as the canonical key set — `TranslationKey` is derived
 * from it so TypeScript flags any reference to a missing key.
 */

export type Lang = "en" | "da";

type Entry = { en: string; da: string };

export const TRANSLATIONS = {
  // ─── Language toggle ──────────────────────────────────────────────
  "lang.toggleAria": { en: "Switch language", da: "Skift sprog" },
  "lang.english": { en: "English", da: "Engelsk" },
  "lang.danish": { en: "Danish", da: "Dansk" },

  // ─── Theme toggle ─────────────────────────────────────────────────
  "theme.toggleAria": { en: "Toggle theme", da: "Skift tema" },
  "theme.light": { en: "Light", da: "Lys" },
  "theme.dark": { en: "Dark", da: "Mørk" },

  // ─── Header ───────────────────────────────────────────────────────
  "header.brand": { en: "SlothCV", da: "SlothCV" },
  "header.signIn": { en: "Sign in", da: "Log ind" },
  "header.dashboard": { en: "Dashboard", da: "Oversigt" },
  "header.account": { en: "Account", da: "Konto" },
  "header.signOut": { en: "Sign out", da: "Log ud" },
  "header.signedInAs": { en: "Signed in as", da: "Logget ind som" },

  // ─── Footer ───────────────────────────────────────────────────────
  "footer.tagline": {
    en: "Free. No watermarks.",
    da: "Gratis. Ingen vandmærker.",
  },
  "footer.note": {
    en: "Hosted in the EU · Your data stays yours",
    da: "Hostet i EU · Dine data forbliver dine",
  },

  // ─── Landing page ─────────────────────────────────────────────────
  "landing.eyebrow": {
    en: "Free CV builder, no dark patterns",
    da: "Gratis CV-bygger, ingen mørke mønstre",
  },
  "landing.headlineA": { en: "Beautiful CVs.", da: "Smukke CV'er." },
  "landing.headlineB": { en: "Truly free.", da: "Helt gratis." },
  "landing.body": {
    en: "Pick a template, fill it in, and download a vector PDF. No watermark, no $1-trial-into-$30/month, no signup wall to export. Your work auto-saves the second you stop typing.",
    da: "Vælg en skabelon, udfyld den, og hent en vektor-PDF. Intet vandmærke, ingen $1-prøveperiode-til-$30/måned, ingen tilmeldingsmur for at hente. Dit arbejde gemmes automatisk det øjeblik du holder pause.",
  },
  "landing.startBuilding": { en: "Start building", da: "Begynd at bygge" },
  "landing.signIn": { en: "Sign in", da: "Log ind" },

  "features.pdfTitle": { en: "Vector PDF export", da: "Vektor-PDF-eksport" },
  "features.pdfBody": {
    en: "Selectable text, embedded fonts, ATS-readable. A4 + Letter + Legal.",
    da: "Markérbar tekst, indlejrede skrifttyper, ATS-læsbar. A4 + Letter + Legal.",
  },
  "features.dataTitle": { en: "Your data stays yours", da: "Dine data forbliver dine" },
  "features.dataBody": {
    en: "Hosted in the EU. Row-level security on every row. No tracking pixels.",
    da: "Hostet i EU. Row-level security på hver række. Ingen tracking-pixels.",
  },
  "features.watermarkTitle": { en: "No watermark, ever", da: "Aldrig nogen vandmærker" },
  "features.watermarkBody": {
    en: "Free is free. No upsell modals, no surprise charges, no trial trap.",
    da: "Gratis er gratis. Ingen opsalgs-modaler, ingen overraskelses-gebyrer, ingen prøveperiode-fælde.",
  },

  "templates.title": { en: "Templates to start from", da: "Skabeloner at starte fra" },
  "templates.body": {
    en: "ready-to-edit layouts. Click one to start — your content reflows automatically when you switch templates.",
    da: "færdige layouts. Klik på én for at starte — dit indhold flyder automatisk om når du skifter skabelon.",
  },
  "templates.use": { en: "Use →", da: "Brug →" },
  "templates.openDashboard": { en: "Open dashboard", da: "Åbn oversigten" },

  // ─── /new — template-picker landing for "+ New CV" ────────────────
  // Shown when a signed-in user clicks "+ New CV" from the dashboard.
  // Lets them browse the full gallery before any DB row is created;
  // only clicking "Use this template" actually creates the CV.
  "new.title": {
    en: "Choose a template",
    da: "Vælg en skabelon",
  },
  "new.subtitle": {
    en: "Pick a layout to start your CV. You can switch templates anytime in the editor without losing your content.",
    da: "Vælg et layout til at starte dit CV. Du kan altid skifte skabelon i editoren uden at miste dit indhold.",
  },
  "new.use": { en: "Use this template", da: "Brug denne skabelon" },
  "new.creating": { en: "Creating your CV…", da: "Opretter dit CV…" },
  "new.cancel": { en: "Cancel", da: "Annullér" },
  "new.backToDashboard": { en: "Back to dashboard", da: "Tilbage til oversigten" },
  "new.toastFailed": {
    en: "Couldn't create your CV. Please try again.",
    da: "Kunne ikke oprette dit CV. Prøv igen.",
  },

  // ─── Login ────────────────────────────────────────────────────────
  "login.title": { en: "Sign in to SlothCV", da: "Log ind på SlothCV" },
  "login.subtitle": {
    en: "Save your work and pick up where you left off, on any device.",
    da: "Gem dit arbejde og fortsæt hvor du slap, på enhver enhed.",
  },
  "login.email": { en: "Email", da: "E-mail" },
  "login.emailPlaceholder": { en: "you@example.com", da: "dig@eksempel.dk" },
  "login.sendLink": { en: "Send link", da: "Send link" },
  "login.sending": { en: "Sending…", da: "Sender…" },
  "login.linkSentTo": { en: "We sent a sign-in link to", da: "Vi sendte et login-link til" },
  "login.linkSentBody": {
    en: "Open it on this device to continue.",
    da: "Åbn det på denne enhed for at fortsætte.",
  },
  "login.googleButton": { en: "Continue with Google", da: "Fortsæt med Google" },
  "login.googleConnecting": { en: "Connecting…", da: "Forbinder…" },
  "login.or": { en: "or", da: "eller" },
  "login.errExpiredLink": {
    en: "That sign-in link expired. Try again — we'll send a fresh one.",
    da: "Login-linket udløb. Prøv igen — vi sender et nyt.",
  },
  "login.errExchangeGeneric": {
    en: "Sign-in didn't complete. Try again — request a fresh link if needed.",
    da: "Login blev ikke gennemført. Prøv igen — bed om et nyt link hvis nødvendigt.",
  },
  "login.errLinkUsed": {
    en: "That sign-in link has already been used. Request a new one to continue.",
    da: "Det login-link er allerede brugt. Bed om et nyt for at fortsætte.",
  },
  "login.errDifferentBrowser": {
    en: "Open the sign-in link in the same browser you started in. If your email opened in a different app, copy the link manually into this browser.",
    da: "Åbn login-linket i den samme browser, du startede i. Hvis din e-mail åbnede i en anden app, kopiér linket manuelt ind i denne browser.",
  },
  "login.errInterrupted": {
    en: "Sign-in was interrupted. Click the button again to retry.",
    da: "Login blev afbrudt. Klik på knappen igen for at prøve igen.",
  },
  "login.errSendFailed": {
    en: "Couldn't send the link. Try again in a moment.",
    da: "Kunne ikke sende linket. Prøv igen om lidt.",
  },
  "login.errGoogleFailed": {
    en: "Google sign-in failed. Try again.",
    da: "Google-login mislykkedes. Prøv igen.",
  },
  "login.linkSentSuccess": {
    en: "Check your inbox for a sign-in link.",
    da: "Tjek din indbakke for et login-link.",
  },
  "login.loading": { en: "Loading…", da: "Indlæser…" },
  "login.errNoAccount": {
    en: "No account found with that email. Sign up first?",
    da: "Ingen konto fundet med den e-mail. Opret en konto først?",
  },
  "login.errAccountExistsOtherMethod": {
    en: "An account with this email already exists. Try signing in with the method you used originally (Google or magic link).",
    da: "Der findes allerede en konto med denne e-mail. Log ind med den metode, du brugte oprindeligt (Google eller magisk link).",
  },
  "login.errAccountUseMagicLink": {
    en: "You signed up with magic link. Type your email below and click \"Send link\" — you'll get a fresh sign-in link in your inbox.",
    da: "Du oprettede kontoen med magisk link. Skriv din e-mail nedenfor og klik \"Send link\" — du får et nyt login-link i din indbakke.",
  },
  "login.errOAuthOnlyGoogle": {
    en: "You signed up with Google. Use \"Continue with Google\" below — magic-link sign-in isn't enabled for this account.",
    da: "Du oprettede kontoen med Google. Brug \"Fortsæt med Google\" nedenfor — login via magisk link er ikke aktiveret for denne konto.",
  },
  "login.errOAuthDeclined": {
    en: "Google sign-in was cancelled. Try again or use the email option.",
    da: "Google-login blev annulleret. Prøv igen eller brug e-mail-mulighed.",
  },
  // Surfaced when the realtime session-revocation listener
  // (`AuthProvider` in src/lib/auth-context.tsx) detects that the
  // signed-in user's row was deleted from auth.users. The bounce
  // happens within ~500 ms of the deletion, so the wording avoids
  // "session expired" (misleading — the session was actively
  // revoked, not timed out). Also intentionally non-accusatory:
  // the user might be a legitimate person whose account was
  // deleted in error, so we point them at support rather than
  // implying wrongdoing.
  "login.errAccountDeleted": {
    en: "You've been signed out — your account was deleted. If this looks wrong, contact support.",
    da: "Du er blevet logget ud — din konto blev slettet. Hvis dette ser forkert ud, kontakt support.",
  },
  "login.noAccount": {
    en: "Don't have an account?",
    da: "Har du ikke en konto?",
  },
  "login.signUpLink": { en: "Sign up", da: "Opret konto" },
  "login.sentWrongEmail": {
    en: "Wrong email? Try again",
    da: "Forkert e-mail? Prøv igen",
  },

  // ─── Auth (granular Supabase error codes) ─────────────────────────
  // Each maps to a specific Supabase ErrorCode value. Keep names tied
  // to the code (auth.errOverEmailRateLimit ↔ over_email_send_rate_limit)
  // so future maintainers can grep both directions.
  "auth.errOverEmailRateLimit": {
    en: "Too many sign-in emails sent to this address recently. Wait a few minutes and try again.",
    da: "For mange login-mails sendt til denne adresse for nylig. Vent et par minutter og prøv igen.",
  },
  "auth.errOverRequestRateLimit": {
    en: "Too many requests from your network. Wait a moment and try again.",
    da: "For mange forespørgsler fra dit netværk. Vent et øjeblik og prøv igen.",
  },
  "auth.errInvalidEmail": {
    en: "That doesn't look like a valid email address. Check for typos and try again.",
    da: "Det ligner ikke en gyldig e-mailadresse. Tjek for tastefejl og prøv igen.",
  },
  "auth.errValidationFailed": {
    en: "Some fields didn't pass validation. Check your inputs and try again.",
    da: "Nogle felter bestod ikke valideringen. Tjek dine indtastninger og prøv igen.",
  },
  "auth.errEmailNotAuthorized": {
    en: "This email address isn't allowed to sign up. Use a different one.",
    da: "Denne e-mailadresse må ikke oprette konto. Brug en anden.",
  },
  "auth.errEmailProviderDisabled": {
    en: "Email sign-in is temporarily disabled. Try \"Continue with Google\" instead.",
    da: "E-mail-login er midlertidigt deaktiveret. Prøv \"Fortsæt med Google\" i stedet.",
  },
  "auth.errProviderDisabled": {
    en: "That sign-in method is currently disabled. Try a different option.",
    da: "Den login-metode er aktuelt deaktiveret. Prøv en anden mulighed.",
  },
  "auth.errCaptchaFailed": {
    en: "We couldn't verify you're human. Reload the page and try again.",
    da: "Vi kunne ikke bekræfte at du er et menneske. Genindlæs siden og prøv igen.",
  },
  "auth.errUserBanned": {
    en: "This account has been suspended. Contact support if you believe this is a mistake.",
    da: "Denne konto er suspenderet. Kontakt support hvis du mener, det er en fejl.",
  },
  "auth.errEmailNotConfirmed": {
    en: "Your email isn't confirmed yet. Click the link in the email we sent you.",
    da: "Din e-mail er ikke bekræftet endnu. Klik på linket i e-mailen vi sendte dig.",
  },
  "auth.errFlowExpired": {
    en: "Your sign-in attempt expired. Start over from the sign-in page.",
    da: "Dit login-forsøg udløb. Start forfra fra login-siden.",
  },
  "auth.errFlowMissing": {
    en: "We lost track of your sign-in attempt — likely cookies or storage was cleared. Try again.",
    da: "Vi mistede sporet af dit login-forsøg — sandsynligvis blev cookies eller lager ryddet. Prøv igen.",
  },
  "auth.errOAuthCorrupted": {
    en: "The Google sign-in response was malformed. Try again.",
    da: "Svaret fra Google-login var ugyldigt. Prøv igen.",
  },
  "auth.errSessionGone": {
    en: "Your session expired. Sign in again to continue.",
    da: "Din session udløb. Log ind igen for at fortsætte.",
  },
  "auth.errNetworkTimeout": {
    en: "The request took too long. Check your internet connection and try again.",
    da: "Forespørgslen tog for lang tid. Tjek din internetforbindelse og prøv igen.",
  },
  "auth.errUnexpected": {
    en: "Something went wrong on our end. Try again — if it keeps happening, let us know.",
    da: "Der gik noget galt hos os. Prøv igen — hvis det fortsætter, så sig til.",
  },

  // ─── Signup ───────────────────────────────────────────────────────
  "signup.title": { en: "Create your SlothCV account", da: "Opret din SlothCV-konto" },
  "signup.subtitle": {
    en: "Free. Build up to 10 CVs, no credit card needed.",
    da: "Gratis. Lav op til 10 CV'er, uden betalingskort.",
  },
  "signup.firstName": { en: "First name", da: "Fornavn" },
  "signup.firstNamePlaceholder": { en: "Philip", da: "Philip" },
  "signup.lastName": { en: "Last name", da: "Efternavn" },
  "signup.lastNamePlaceholder": { en: "Sloth", da: "Sloth" },
  "signup.createAccount": { en: "Create account", da: "Opret konto" },
  "signup.googleButton": { en: "Continue with Google", da: "Fortsæt med Google" },
  "signup.googleOverridesName": {
    en: "Note: signing in with Google will use the name on your Google account.",
    da: "Bemærk: hvis du logger ind med Google, bruges navnet fra din Google-konto.",
  },
  "signup.haveAccount": { en: "Already have an account?", da: "Har du allerede en konto?" },
  "signup.signInLink": { en: "Sign in", da: "Log ind" },
  "signup.errFirstNameRequired": {
    en: "First name is required.",
    da: "Fornavn er påkrævet.",
  },
  "signup.errRateLimited": {
    en: "Too many attempts. Wait a minute and try again.",
    da: "For mange forsøg. Vent et øjeblik og prøv igen.",
  },
  "signup.errInvalidEmail": {
    en: "That doesn't look like a valid email address.",
    da: "Det ligner ikke en gyldig e-mailadresse.",
  },
  "signup.alreadyExistsHint": {
    en: "If you already signed up before, the link will sign you back in to your existing account — no new account is created.",
    da: "Hvis du allerede er oprettet, logger linket dig ind på din eksisterende konto — der oprettes ikke en ny.",
  },
  "signup.errAccountExists": {
    en: "An account with this email already exists.",
    da: "Der findes allerede en konto med denne e-mail.",
  },
  "signup.existingAccountTitle": {
    en: "An account already exists for",
    da: "Der findes allerede en konto for",
  },
  "signup.existingAccountBody": {
    en: "Please sign in instead with the method you originally used to create the account.",
    da: "Log ind i stedet med den metode, du oprindeligt brugte til at oprette kontoen.",
  },
  "signup.existingAccountBodyGoogle": {
    en: "You created this account with Google. Use \"Continue with Google\" on the sign-in page.",
    da: "Du oprettede kontoen med Google. Brug \"Fortsæt med Google\" på login-siden.",
  },
  "signup.existingAccountBodyMagic": {
    en: "You created this account with a magic link. Go to the sign-in page and we'll send you a fresh one.",
    da: "Du oprettede kontoen med et magisk link. Gå til login-siden, så sender vi et nyt.",
  },
  "signup.existingAccountBodyBoth": {
    en: "You can sign in either with Google or with a magic link to this email.",
    da: "Du kan logge ind enten med Google eller med et magisk link til denne e-mail.",
  },
  "signup.existingAccountGoToLogin": {
    en: "Go to sign in",
    da: "Gå til login",
  },
  "signup.existingAccountTryAnother": {
    en: "Try a different email",
    da: "Prøv en anden e-mail",
  },
  // ─── Dashboard ────────────────────────────────────────────────────
  "dashboard.title": { en: "Your CVs", da: "Dine CV'er" },
  "dashboard.subtitle": {
    en: "Auto-saved. Pick up where you left off.",
    da: "Auto-gemt. Fortsæt hvor du slap.",
  },
  "dashboard.usedSuffix": { en: "used", da: "brugt" },
  "dashboard.newCv": { en: "New CV", da: "Nyt CV" },
  "dashboard.creating": { en: "Creating…", da: "Opretter…" },
  "dashboard.limitReached": { en: "Limit reached", da: "Grænse nået" },
  "dashboard.limitTitle": {
    en: "You've reached the {n}-CV cap on this account. Delete one above to free up a slot.",
    da: "Du har nået grænsen på {n} CV'er på denne konto. Slet ét ovenfor for at frigøre en plads.",
  },
  "dashboard.empty.title": { en: "No CVs yet", da: "Ingen CV'er endnu" },
  "dashboard.empty.body": {
    en: 'Hit "New CV" to start your first one.',
    da: 'Klik på "Nyt CV" for at starte dit første.',
  },
  "dashboard.updated": { en: "Updated", da: "Opdateret" },
  "dashboard.justNow": { en: "just now", da: "lige nu" },
  "dashboard.minAgo": { en: "min ago", da: "min siden" },
  "dashboard.hrAgo": { en: "hr ago", da: "timer siden" },
  "dashboard.dayAgo": { en: "day ago", da: "dag siden" },
  "dashboard.daysAgo": { en: "days ago", da: "dage siden" },
  "dashboard.duplicateAria": { en: "Duplicate CV", da: "Dupliker CV" },
  "dashboard.variantAria": { en: "Save as variant", da: "Gem som variant" },
  "dashboard.variantPromptTitle": {
    en: "Save as a tailored variant",
    da: "Gem som tilpasset variant",
  },
  "dashboard.variantPromptDesc": {
    en: "Variants share their content with the master but get their own label so you can keep one CV for each role you apply to. Edits to a variant don't change the master.",
    da: "Varianter deler indhold med masteren, men får deres egen label, så du kan beholde ét CV per rolle du søger. Redigeringer i en variant ændrer ikke masteren.",
  },
  "dashboard.variantPromptLabel": {
    en: "Variant label",
    da: "Variant-label",
  },
  "dashboard.variantPromptPlaceholder": {
    en: "e.g. PM at Vercel, IC at Anthropic",
    da: "f.eks. PM hos Vercel, IC hos Anthropic",
  },
  "dashboard.variantPromptConfirm": {
    en: "Create variant",
    da: "Opret variant",
  },
  "dashboard.variantBadge": { en: "Variant of", da: "Variant af" },
  "dashboard.toastVariantCreated": {
    en: "Variant created.",
    da: "Variant oprettet.",
  },
  "dashboard.toastVariantFailed": {
    en: "Couldn't create variant.",
    da: "Kunne ikke oprette variant.",
  },
  "dashboard.deleteAria": { en: "Delete CV", da: "Slet CV" },
  "dashboard.confirmDelete": {
    en: "Delete this CV permanently?",
    da: "Slet dette CV permanent?",
  },
  "dashboard.confirmDeleteTitle": {
    en: "Delete this CV?",
    da: "Slet dette CV?",
  },
  "dashboard.confirmDeleteDesc": {
    en: "This permanently removes the CV and any uploaded photos. This can't be undone.",
    da: "Dette fjerner CV'et og alle uploadede billeder permanent. Dette kan ikke fortrydes.",
  },
  "dashboard.confirmDeleteDescNamed": {
    en: "“{name}” will be permanently removed along with any uploaded photos. This can't be undone.",
    da: "“{name}” vil blive permanent fjernet sammen med alle uploadede billeder. Dette kan ikke fortrydes.",
  },
  "dashboard.toastDeleted": { en: "Deleted.", da: "Slettet." },
  "dashboard.toastDeleteFailed": { en: "Delete failed.", da: "Sletning mislykkedes." },
  // Bulk-delete (Slet alle) — copy is intentionally heavy on the
  // irreversibility wording. The danger of "delete every CV" warrants
  // friction; cutesy microcopy here would be misleading. Both languages
  // explicitly include "cannot be undone" / "kan ikke fortrydes" so a
  // user mid-keyboard-flow can't accidentally confirm without reading.
  "dashboard.deleteAllCvs": {
    en: "Delete all CVs",
    da: "Slet alle CV'er",
  },
  "dashboard.confirmDeleteAllTitle": {
    en: "Delete all CVs?",
    da: "Slet alle dine CV'er?",
  },
  "dashboard.confirmDeleteAllDesc": {
    en: "Are you sure you want to delete all your CVs? Every CV, every variant, and every uploaded photo will be permanently removed. This cannot be undone.",
    da: "Er du sikker på, at du vil slette alle dine CV'er? Hvert CV, hver variant og alle uploadede billeder vil blive fjernet permanent. Dette kan ikke fortrydes.",
  },
  "dashboard.confirmDeleteAllConfirm": {
    en: "Yes, delete everything",
    da: "Ja, slet alt",
  },
  // Two separate strings — naive `{n} CV{s}` interpolation breaks
  // Danish plural morphology ("7 CVs" vs the correct "7 CV'er"). The
  // caller picks `.one` / `.other` based on the count; the
  // interpolator only handles the `{n}` substitution.
  "dashboard.toastDeletedAll.one": {
    en: "Deleted 1 CV.",
    da: "Slettede 1 CV.",
  },
  "dashboard.toastDeletedAll.other": {
    en: "Deleted {n} CVs.",
    da: "Slettede {n} CV'er.",
  },
  "dashboard.toastDeleteAllFailed": {
    en: "Bulk delete failed.",
    da: "Massesletning mislykkedes.",
  },
  "dashboard.toastDuplicated": { en: "Duplicated.", da: "Dupliceret." },
  "dashboard.toastDuplicateFailed": {
    en: "Duplicate failed.",
    da: "Duplikering mislykkedes.",
  },
  "dashboard.toastCreateFailed": {
    en: "Couldn't create CV.",
    da: "Kunne ikke oprette CV.",
  },
  "dashboard.toastRefreshFailed": {
    en: "Refresh failed.",
    da: "Genindlæsning mislykkedes.",
  },
  "dashboard.toastNewFailed": {
    en: "Couldn't start a new CV.",
    da: "Kunne ikke starte et nyt CV.",
  },
  "dashboard.preparingTemplate": { en: "Preparing your", da: "Forbereder dit" },
  "dashboard.preparingSuffix": { en: "CV…", da: "CV…" },
  "dashboard.preparingHint": {
    en: "Just a moment — we're setting things up.",
    da: "Et øjeblik — vi gør tingene klar.",
  },

  // ─── Editor (top-level) ───────────────────────────────────────────
  "editor.allCvs": { en: "All CVs", da: "Alle CV'er" },
  "editor.untitled": { en: "Untitled CV", da: "CV uden titel" },
  "editor.notFound": {
    en: "This CV doesn't exist or you don't have access.",
    da: "Dette CV findes ikke eller du har ikke adgang.",
  },
  "editor.loadFailed": { en: "Failed to load CV.", da: "Kunne ikke hente CV." },
  "editor.backToDashboard": { en: "Back to dashboard", da: "Tilbage til oversigten" },
  "editor.tab.content": { en: "Content", da: "Indhold" },
  "editor.tab.design": { en: "Design", da: "Design" },
  "editor.tab.add": { en: "Add", da: "Tilføj" },
  "editor.tab.templates": { en: "Templates", da: "Skabeloner" },
  "editor.tab.settings": { en: "Settings", da: "Indstillinger" },
  "editor.mobile.edit": { en: "Edit", da: "Rediger" },
  "editor.mobile.preview": { en: "Preview", da: "Forhåndsvisning" },

  // ─── Save indicator ───────────────────────────────────────────────
  "save.saving": { en: "Saving…", da: "Gemmer…" },
  "save.saved": { en: "Saved", da: "Gemt" },
  "save.dirty": { en: "Unsaved", da: "Ikke gemt" },
  "save.error": { en: "Save failed", da: "Gem mislykkedes" },
  "save.saveNow": { en: "Save", da: "Gem" },
  "save.savedNow": { en: "Saved.", da: "Gemt." },
  "save.namePromptTitle": {
    en: "Name your CV",
    da: "Navngiv dit CV",
  },
  "save.namePromptDesc": {
    en: "Give this CV a name so you can find it later. You can change it any time from Settings.",
    da: "Giv dette CV et navn, så du kan finde det igen. Du kan ændre det når som helst i Indstillinger.",
  },
  "save.namePromptLabel": {
    en: "CV title",
    da: "CV-titel",
  },
  "save.namePromptConfirm": {
    en: "Save CV",
    da: "Gem CV",
  },

  // ─── Preview pane ─────────────────────────────────────────────────
  "preview.label": { en: "Preview", da: "Forhåndsvisning" },
  "preview.hintClick": { en: "click to edit", da: "klik for at redigere" },
  "preview.hintDrag": { en: "drag to position", da: "træk for at placere" },
  "preview.fitToWidth": { en: "Fit to width", da: "Tilpas bredde" },

  // ─── Section list ─────────────────────────────────────────────────
  "sections.personal": { en: "Personal info", da: "Personlige oplysninger" },
  "sections.alwaysShown": { en: "always shown", da: "altid synlig" },
  "sections.add": { en: "Add section", da: "Tilføj sektion" },
  "sections.cancel": { en: "Cancel", da: "Annuller" },
  "sections.dragToReorder": { en: "Drag to reorder", da: "Træk for at omarrangere" },
  "sections.hide": { en: "Hide section", da: "Skjul sektion" },
  "sections.show": { en: "Show section", da: "Vis sektion" },
  "sections.delete": { en: "Delete section", da: "Slet sektion" },
  "sections.confirmDeleteTitle": {
    en: 'Delete "{name}"?',
    da: 'Slet "{name}"?',
  },
  "sections.confirmDeleteDesc": {
    en: "This removes the section and everything in it. You can add it back later, but the content will be gone.",
    da: "Dette fjerner sektionen og alt indhold i den. Du kan tilføje den igen senere, men indholdet er væk.",
  },
  "sections.confirmDelete": {
    en: 'Delete the "{name}" section?',
    da: 'Slet sektionen "{name}"?',
  },
  "sections.alreadyExists": {
    en: "{type} section already exists — opened it for you.",
    da: "{type}-sektionen findes allerede — åbnet for dig.",
  },
  "sections.alreadyExistsHint": {
    en: "Opens the existing {type} section instead of creating a duplicate.",
    da: "Åbner den eksisterende {type}-sektion i stedet for at oprette en dublet.",
  },
  "sections.blankTitle": {
    en: "Design from scratch",
    da: "Design fra bunden",
  },
  "sections.blankBody": {
    en: "The Blank template has no built-in sections or personal block. Build your CV by dropping shapes, text, lines, and images on the canvas.",
    da: "Blank-skabelonen har ingen indbyggede sektioner eller personlige felter. Byg dit CV ved at trække figurer, tekst, linjer og billeder på lærredet.",
  },
  "sections.blankCta": {
    en: "Open the Add tab on the left",
    da: "Åbn Add-fanen til venstre",
  },
  "sections.blankPreserveHint": {
    en: "Switch to any other template to bring back your sections and personal info — they're saved, just hidden here.",
    da: "Skift til en anden skabelon for at få dine sektioner og personlige oplysninger frem igen — de er gemt, bare skjult her.",
  },

  // ─── Section type labels ──────────────────────────────────────────
  "section.summary": { en: "Summary", da: "Resumé" },
  "section.experience": { en: "Experience", da: "Erfaring" },
  "section.education": { en: "Education", da: "Uddannelse" },
  "section.skills": { en: "Skills", da: "Færdigheder" },
  "section.languages": { en: "Languages", da: "Sprog" },
  "section.projects": { en: "Projects", da: "Projekter" },
  "section.certifications": { en: "Certifications", da: "Certifikater" },
  "section.awards": { en: "Awards", da: "Priser" },
  "section.publications": { en: "Publications", da: "Publikationer" },
  "section.volunteer": { en: "Volunteer", da: "Frivilligt arbejde" },
  "section.talks": { en: "Talks", da: "Foredrag" },
  "section.hobbies": { en: "Hobbies", da: "Hobbyer" },
  "section.references": { en: "References", da: "Referencer" },
  "section.custom": { en: "Custom", da: "Brugerdefineret" },

  // ─── Personal form ────────────────────────────────────────────────
  "personal.fullName": { en: "Full name", da: "Fulde navn" },
  "personal.fullNamePlaceholder": { en: "Jane Doe", da: "Anders Andersen" },
  "personal.headline": { en: "Headline", da: "Titel" },
  "personal.headlinePlaceholder": {
    en: "Senior Frontend Engineer",
    da: "Senior Frontend-udvikler",
  },
  "personal.email": { en: "Email", da: "E-mail" },
  "personal.emailPlaceholder": { en: "jane@example.com", da: "dig@eksempel.dk" },
  "personal.phone": { en: "Phone", da: "Telefon" },
  "personal.phonePlaceholder": { en: "+45 12 34 56 78", da: "+45 12 34 56 78" },
  "personal.location": { en: "Location", da: "Sted" },
  "personal.locationPlaceholder": {
    en: "Copenhagen, Denmark",
    da: "København, Danmark",
  },
  "personal.photo": { en: "Photo", da: "Foto" },
  "personal.uploadPhoto": { en: "Upload photo", da: "Upload foto" },
  "personal.replacePhoto": { en: "Replace photo", da: "Erstat foto" },
  "personal.uploading": { en: "Uploading…", da: "Uploader…" },
  "personal.removePhoto": { en: "Remove", da: "Fjern" },
  "personal.noPhoto": { en: "No photo", da: "Intet foto" },
  "personal.photoHint": {
    en: "JPG, PNG, WebP, GIF. Max 2 MB. Templates with a photo slot will use it.",
    da: "JPG, PNG, WebP, GIF. Maks. 2 MB. Skabeloner med fotoplads bruger det.",
  },
  "personal.pasteUrl": {
    en: "…or paste a URL instead",
    da: "…eller indsæt en URL i stedet",
  },
  "personal.links": { en: "Links", da: "Links" },
  "personal.add": { en: "Add", da: "Tilføj" },
  "personal.removeLink": { en: "Remove link", da: "Fjern link" },
  "personal.toastUploaded": { en: "Photo uploaded.", da: "Foto uploadet." },
  "personal.toastUploadFailed": { en: "Upload failed.", da: "Upload mislykkedes." },

  // ─── Account ──────────────────────────────────────────────────────
  "account.title": { en: "Account", da: "Konto" },
  "account.subtitle": {
    en: "Manage your profile, password, and account data.",
    da: "Administrer din profil, adgangskode og kontodata.",
  },
  "account.section.profile": { en: "Profile", da: "Profil" },
  "account.section.password": { en: "Password", da: "Adgangskode" },
  "account.section.session": { en: "Session", da: "Session" },
  "account.section.danger": { en: "Danger zone", da: "Farezone" },
  "account.displayName": { en: "Display name", da: "Visningsnavn" },
  "account.displayNamePlaceholder": { en: "Your name", da: "Dit navn" },
  "account.emailReadonly": {
    en: "Email is tied to your sign-in method and can't be changed from here yet.",
    da: "E-mail er knyttet til din login-metode og kan ikke ændres herfra endnu.",
  },
  "account.newPassword": { en: "New password", da: "Ny adgangskode" },
  "account.newPasswordPlaceholder": {
    en: "At least 8 characters",
    da: "Mindst 8 tegn",
  },
  "account.confirmPassword": {
    en: "Confirm new password",
    da: "Bekræft ny adgangskode",
  },
  "account.changePassword": { en: "Change password", da: "Skift adgangskode" },
  "account.savingPassword": { en: "Saving…", da: "Gemmer…" },
  "account.passwordHint": {
    en: "If you signed in with Google or an email link, setting a password here lets you also sign in with that password later.",
    da: "Hvis du er logget ind med Google eller et e-mail-link, kan du ved at sætte en adgangskode her også logge ind med denne senere.",
  },
  "account.signOut": { en: "Sign out", da: "Log ud" },
  "account.dangerBody": {
    en: "Permanently delete your account. This cannot be undone — every CV, version history, and uploaded avatar will be removed forever.",
    da: "Slet din konto permanent. Dette kan ikke fortrydes — alle CV'er, versionshistorik og uploadede avatarer fjernes for evigt.",
  },
  "account.deleteConfirmLabel": { en: "Type", da: "Skriv" },
  "account.deleteConfirmTo": { en: "to confirm", da: "for at bekræfte" },
  "account.deleteButton": {
    en: "Permanently delete my account",
    da: "Slet min konto permanent",
  },
  "account.deleting": { en: "Deleting…", da: "Sletter…" },
  "account.toastNameSaved": { en: "Display name saved.", da: "Visningsnavn gemt." },
  "account.toastSaveFailed": { en: "Save failed.", da: "Gem mislykkedes." },
  "account.toastAvatarSaved": { en: "Avatar updated.", da: "Avatar opdateret." },
  "account.toastAvatarRemoved": { en: "Avatar removed.", da: "Avatar fjernet." },
  "account.toastUploadFailed": { en: "Upload failed.", da: "Upload mislykkedes." },
  "account.toastRemoveFailed": { en: "Remove failed.", da: "Fjernelse mislykkedes." },
  "account.toastPasswordTooShort": {
    en: "Password must be at least 8 characters.",
    da: "Adgangskode skal være mindst 8 tegn.",
  },
  "account.toastPasswordMismatch": {
    en: "Passwords don't match.",
    da: "Adgangskoderne matcher ikke.",
  },
  "account.toastPasswordChanged": {
    en: "Password changed.",
    da: "Adgangskode ændret.",
  },
  "account.toastPasswordFailed": {
    en: "Couldn't change password.",
    da: "Kunne ikke ændre adgangskode.",
  },
  "account.toastDeleteConfirmRequired": {
    en: 'Type DELETE to confirm.',
    da: 'Skriv DELETE for at bekræfte.',
  },
  "account.toastAccountDeleted": { en: "Account deleted.", da: "Konto slettet." },
  "account.toastDeleteFailed": {
    en: "Delete failed.",
    da: "Sletning mislykkedes.",
  },
  "account.back": { en: "Back to dashboard", da: "Tilbage til oversigten" },

  // ─── Design tab section titles ────────────────────────────────────
  "design.color": { en: "Color", da: "Farve" },
  "design.typography": { en: "Typography", da: "Typografi" },
  "design.layout": { en: "Layout", da: "Layout" },
  "design.photo": { en: "Photo", da: "Foto" },
  "design.sectionStyle": { en: "Section style", da: "Sektionsstil" },
  "design.specialty": { en: "Specialty", da: "Specialitet" },
  "design.page": { en: "Page", da: "Side" },
  "design.watermark": { en: "Watermark", da: "Vandmærke" },

  // ─── Footer + legal ───────────────────────────────────────────────
  "footer.privacy": { en: "Privacy", da: "Privatlivspolitik" },
  "footer.terms": { en: "Terms", da: "Vilkår" },
  "footer.copyright": {
    en: "© {year} SlothCV",
    da: "© {year} SlothCV",
  },

  // ─── Cookie banner ────────────────────────────────────────────────
  "cookies.message": {
    en: "We use essential cookies to keep you signed in, plus your browser's local storage to remember your theme and language. No tracking, no analytics.",
    da: "Vi bruger essentielle cookies til at holde dig logget ind, samt din browsers lokale lager til at huske dit tema og sprog. Ingen tracking, ingen analytics.",
  },
  "cookies.learnMore": { en: "Learn more", da: "Læs mere" },
  "cookies.dismiss": { en: "Got it", da: "Forstået" },
  "cookies.ariaLabel": {
    en: "Cookie notice",
    da: "Cookie-meddelelse",
  },

  // ─── Settings tab ─────────────────────────────────────────────────
  "settings.cvTitle": { en: "CV title", da: "CV-titel" },
  "settings.cvTitleSavingFailed": { en: "Rename failed.", da: "Omdøbning mislykkedes." },
  "settings.export": { en: "Export", da: "Eksport" },
  "settings.exportPdf": { en: "Export PDF", da: "Eksportér PDF" },
  "settings.exportPdfGenerating": { en: "Generating PDF…", da: "Genererer PDF…" },
  "settings.exportPdfFailed": { en: "PDF export failed.", da: "PDF-eksport mislykkedes." },
  "settings.exportJson": { en: "Export JSON (backup)", da: "Eksportér JSON (sikkerhedskopi)" },
  "settings.navigate": { en: "Navigate", da: "Naviger" },
  "settings.backToDashboard": { en: "Back to dashboard", da: "Tilbage til oversigten" },
  "settings.dangerZone": { en: "Danger zone", da: "Farezone" },
  "settings.deleteCv": { en: "Delete this CV", da: "Slet dette CV" },

  // ─── Toolshelf (Add tab) ──────────────────────────────────────────
  "toolshelf.addToCanvas": { en: "Add to canvas", da: "Tilføj til lærred" },
  "toolshelf.addToCanvasHint": {
    en: "Drag a card onto the page, double-click to drop it at the default spot, or single-click to add and start tweaking.",
    da: "Træk et kort til siden, dobbeltklik for at slippe det på standardpladsen, eller enkeltklik for at tilføje og finjustere.",
  },
  "toolshelf.socialIcons": { en: "Social icons", da: "Sociale ikoner" },
  "toolshelf.socialIconsHint": {
    en: "Drop a brand glyph instead of importing your own. Recolour from the inspector after — every glyph is a single SVG path that tints to any hex.",
    da: "Slip et brand-symbol i stedet for at importere dit eget. Skift farve fra inspektøren bagefter — hvert symbol er en enkelt SVG-sti, der kan farves til enhver hex.",
  },
  "toolshelf.layers": { en: "Layers", da: "Lag" },
  "toolshelf.dragToCanvasTitle": {
    en: "Drag to canvas, double-click, or click to add a {label}",
    da: "Træk til lærred, dobbeltklik eller klik for at tilføje en {label}",
  },
  "toolshelf.dragSocialTitle": {
    en: "Drag to canvas, or click to add {label}",
    da: "Træk til lærred, eller klik for at tilføje {label}",
  },
  "toolshelf.tooltipDragHint": {
    en: "Tip: hold Shift while dragging to snap to 8 directions. Hold Ctrl/Cmd while dragging to disable snap-to-other-elements.",
    da: "Tip: hold Shift mens du trækker for at låse til 8 retninger. Hold Ctrl/Cmd mens du trækker for at deaktivere snap til andre elementer.",
  },

  // ─── Inspector (selected element) ─────────────────────────────────
  "inspector.selected": { en: "{kind} selected", da: "{kind} valgt" },
  "inspector.dragInPreview": {
    en: "Drag in the preview to move. Use these controls to fine-tune.",
    da: "Træk i forhåndsvisningen for at flytte. Brug disse kontroller til finjustering.",
  },
  "inspector.position": { en: "Position", da: "Position" },
  "inspector.size": { en: "Size", da: "Størrelse" },
  "inspector.fillStroke": { en: "Fill & stroke", da: "Fyld og streg" },
  "inspector.fill": { en: "Fill", da: "Fyld" },
  "inspector.stroke": { en: "Stroke", da: "Streg" },
  "inspector.strokeWidth": { en: "Stroke width", da: "Stregtykkelse" },
  "inspector.cornerRadius": { en: "Corner radius", da: "Hjørneradius" },
  "inspector.color": { en: "Color", da: "Farve" },
  "inspector.thickness": { en: "Thickness", da: "Tykkelse" },
  "inspector.dashed": { en: "Dashed", da: "Stiplet" },
  "inspector.text": { en: "Text", da: "Tekst" },
  "inspector.textContent": { en: "Content", da: "Indhold" },
  "inspector.textPlaceholder": { en: "Type your text…", da: "Skriv din tekst…" },
  "inspector.fontSize": { en: "Font size", da: "Skriftstørrelse" },
  "inspector.fontWeight": { en: "Weight", da: "Vægt" },
  "inspector.align": { en: "Align", da: "Justering" },
  "inspector.alignLeft": { en: "Left", da: "Venstre" },
  "inspector.alignCenter": { en: "Center", da: "Centreret" },
  "inspector.alignRight": { en: "Right", da: "Højre" },
  "inspector.italic": { en: "Italic", da: "Kursiv" },
  "inspector.underline": { en: "Underline", da: "Understregning" },
  "inspector.image": { en: "Image", da: "Billede" },
  "inspector.uploadImage": { en: "Upload image", da: "Upload billede" },
  "inspector.replaceImage": { en: "Replace", da: "Erstat" },
  "inspector.uploading": { en: "Uploading…", da: "Uploader…" },
  "inspector.clearImage": { en: "Clear", da: "Ryd" },
  "inspector.pasteUrlInstead": { en: "Paste a URL instead", da: "Indsæt en URL i stedet" },
  "inspector.imageUrl": { en: "Image URL", da: "Billed-URL" },
  "inspector.fit": { en: "Fit", da: "Tilpasning" },
  "inspector.fitCover": { en: "Cover", da: "Dæk" },
  "inspector.fitContain": { en: "Contain", da: "Indeholde" },
  "inspector.fitFill": { en: "Fill", da: "Fyld" },
  "inspector.icon": { en: "Icon", da: "Ikon" },
  "inspector.brand": { en: "Brand", da: "Brand" },
  "inspector.url": { en: "Link URL", da: "Link-URL" },
  "inspector.urlPlaceholder": {
    en: "https://linkedin.com/in/yourname",
    da: "https://linkedin.com/in/ditnavn",
  },
  "inspector.urlHint": {
    en: "Optional. When set, the icon becomes a clickable link in the exported PDF.",
    da: "Valgfrit. Når sat, bliver ikonet et klikbart link i den eksporterede PDF.",
  },
  "inspector.transform": { en: "Transform", da: "Transformér" },
  "inspector.rotate": { en: "Rotate (deg)", da: "Rotér (grader)" },
  "inspector.opacity": { en: "Opacity", da: "Gennemsigtighed" },
  "inspector.layer": { en: "Layer", da: "Lag" },
  "inspector.bringForward": { en: "Forward", da: "Frem" },
  "inspector.sendBackward": { en: "Backward", da: "Tilbage" },
  "inspector.hide": { en: "Hide", da: "Skjul" },
  "inspector.show": { en: "Show", da: "Vis" },
  "inspector.reset": { en: "Reset", da: "Nulstil" },
  "inspector.resetTransform": { en: "Reset transform", da: "Nulstil transformation" },
  "inspector.deleteElement": { en: "Delete element", da: "Slet element" },
  "inspector.deletePromptTitle": {
    en: "Delete this {kind}?",
    da: "Slet dette {kind}?",
  },
  "inspector.deletePromptDesc": {
    en: "The element will be removed from the canvas. Other elements stay where they are.",
    da: "Elementet fjernes fra lærredet. Andre elementer bliver hvor de er.",
  },
  "inspector.eyedropper": { en: "Pick from canvas", da: "Vælg fra lærred" },
  "inspector.eyedropperUnsupported": {
    en: "Eyedropper requires Chrome 95+ or Edge 95+.",
    da: "Pipette kræver Chrome 95+ eller Edge 95+.",
  },
  "inspector.recentColors": { en: "Recent", da: "Seneste" },
  "inspector.brandPalette": { en: "Brand palette", da: "Brand-palette" },
  "inspector.kind.rect": { en: "Rectangle", da: "Rektangel" },
  "inspector.kind.ellipse": { en: "Ellipse", da: "Ellipse" },
  "inspector.kind.line": { en: "Line", da: "Linje" },
  "inspector.kind.triangle": { en: "Triangle", da: "Trekant" },
  "inspector.kind.star": { en: "Star", da: "Stjerne" },
  "inspector.kind.hexagon": { en: "Hexagon", da: "Sekskant" },
  "inspector.kind.octagon": { en: "Octagon", da: "Ottekant" },
  "inspector.kind.diamond": { en: "Diamond", da: "Diamant" },
  "inspector.kind.heart": { en: "Heart", da: "Hjerte" },
  "inspector.kind.cross": { en: "Cross", da: "Kors" },
  "inspector.kind.sparkle": { en: "Sparkle", da: "Glimmer" },
  "inspector.kind.arrow": { en: "Arrow", da: "Pil" },
  "inspector.kind.text": { en: "Text", da: "Tekst" },
  "inspector.kind.image": { en: "Image", da: "Billede" },
  "inspector.kind.icon": { en: "Icon", da: "Ikon" },

  // ─── Shape labels (toolshelf cards) ───────────────────────────────
  "shape.text": { en: "Text", da: "Tekst" },
  "shape.text.hint": { en: "Headline, paragraph, label", da: "Overskrift, afsnit, label" },
  "shape.rect": { en: "Rectangle", da: "Rektangel" },
  "shape.rect.hint": { en: "Block, divider band", da: "Blok, deler-bånd" },
  "shape.ellipse": { en: "Ellipse", da: "Ellipse" },
  "shape.ellipse.hint": { en: "Circle, accent dot", da: "Cirkel, accent-prik" },
  "shape.line": { en: "Line", da: "Linje" },
  "shape.line.hint": { en: "Divider, rule", da: "Deler, linje" },
  "shape.triangle": { en: "Triangle", da: "Trekant" },
  "shape.triangle.hint": { en: "Geometric accent", da: "Geometrisk accent" },
  "shape.star": { en: "Star", da: "Stjerne" },
  "shape.star.hint": { en: "Highlight, rating", da: "Fremhævelse, rating" },
  "shape.hexagon": { en: "Hexagon", da: "Sekskant" },
  "shape.hexagon.hint": { en: "Tile, badge", da: "Flise, badge" },
  "shape.octagon": { en: "Octagon", da: "Ottekant" },
  "shape.octagon.hint": { en: "Stop, badge", da: "Stop, badge" },
  "shape.diamond": { en: "Diamond", da: "Diamant" },
  "shape.diamond.hint": { en: "Accent, gemstone", da: "Accent, ædelsten" },
  "shape.heart": { en: "Heart", da: "Hjerte" },
  "shape.heart.hint": { en: "Like, passion", da: "Like, passion" },
  "shape.cross": { en: "Cross", da: "Kors" },
  "shape.cross.hint": { en: "Plus, medical", da: "Plus, medicinsk" },
  "shape.sparkle": { en: "Sparkle", da: "Glimmer" },
  "shape.sparkle.hint": { en: "Glitter, highlight", da: "Glitter, fremhævelse" },
  "shape.arrow": { en: "Arrow", da: "Pil" },
  "shape.arrow.hint": { en: "Pointer, callout", da: "Pegepil, callout" },
  "shape.image": { en: "Image", da: "Billede" },
  "shape.image.hint": { en: "Photo, logo, screenshot", da: "Foto, logo, skærmbillede" },

  // ─── Common ───────────────────────────────────────────────────────
  "common.cancel": { en: "Cancel", da: "Annuller" },
  "common.save": { en: "Save", da: "Gem" },
  "common.done": { en: "Done", da: "Færdig" },
  "common.delete": { en: "Delete", da: "Slet" },
  "common.duplicate": { en: "Duplicate", da: "Dupliker" },
  "common.copy": { en: "Copy", da: "Kopiér" },
  "common.paste": { en: "Paste", da: "Indsæt" },
  "common.cut": { en: "Cut", da: "Klip" },
  "common.loading": { en: "Loading…", da: "Indlæser…" },
} as const satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof TRANSLATIONS;
