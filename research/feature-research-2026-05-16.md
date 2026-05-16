# SlothCV Feature Research — 2026-05-16

Deep research deliverable. Source-cited. Editorial verdicts at the end.

Scope: features SlothCV does NOT have yet, ranked by real evidence of demand. Skips items already on the v0.5 / v1.0 roadmap or already proposed in this session (JSON Resume import, anonymous trial, ATS linter, version snapshots, Danish snippets, keyboard shortcuts, mobile editor polish, print preview pane).

---

## Section A — Top complaints across all CV builders (ranked by frequency)

| # | Theme | Frequency signal | Slothcv exposure |
|---|-------|------------------|------------------|
| 1 | **Paywall ambush at download** — user spends 30-60 min building, then download is paywalled | Universal across Resume.io, Zety, NovoResume, MyPerfectResume, Resume Genius reviews | None — slothcv is genuinely free |
| 2 | **ATS-killing two-column / sidebar layouts** — beautiful template, parser sees garbage | 72% of Canva templates fail parse; Workday + Taleo + iCIMS hard-fail multi-column | Partial — slothcv has 64 templates, no published ATS-pass rate per template |
| 3 | **PDF exports as image / outlined vector text** — selectable-text test fails | Canva exports flatten to image; Figma exports rasterize on text effects | Slothcv export uses window.print() so text stays selectable — strong position |
| 4 | **Cancellation friction / surprise auto-renew** | Resume.io, Zety, Resume Genius, MyPerfectResume all hammered | None — no subscription |
| 5 | **No DOCX export** — ATS portals + offline edit demand | FlowCV + Enhancv users beg for it; Resume.io added it under pressure | Slothcv has none — gap |
| 6 | **No PDF/LinkedIn import — full retype** — paying users stuck typing 3 jobs over | Universal across all builders' low-star reviews | Slothcv has none — gap |
| 7 | **Page-break chaos** — section heading orphaned at page bottom, content flows past page edge | Reactive Resume issues #952, #1834, #2263; VisualCV docs admit manual workarounds | Slothcv likely affected — vector PDF inherits this problem |
| 8 | **No collaboration / share-for-feedback** — can't get a friend or mentor to comment | Kickresume gap explicitly called out; Canva offers it; Google Docs is the benchmark | Slothcv has none — gap |
| 9 | **AI output is generic / hallucinated** — buzzword soup, fake skills | Rezi 1-star reviews mention hallucinated skills + name misspellings | N/A — slothcv has no AI by design |
| 10 | **Templates locked or rigid** — can't add a custom section in free tier | Kickresume free users can't add awards/certs/projects | N/A — slothcv has all 14 sections + custom |
| 11 | **Lost work after subscription ends** — pay-to-keep-access | NovoResume + Resume Genius low-stars | N/A — slothcv data is yours forever |
| 12 | **Slow / unresponsive customer support** — weeks for a ticket | FlowCV + NovoResume + Resume Genius repeatedly | N/A scale concern — solo-maintainer reality |
| 13 | **No way to explain employment gaps gracefully** — career break isn't a job entry | Mentioned in Enhancv review threads + Indeed/FlexJobs guidance | Gap — slothcv has no first-class "career break" entity |
| 14 | **Mobile editor unusable** — works on phone but tedious | FlowCV "wish more mobile-friendly"; iOS apps cited as workflow-respecting | Gap — slothcv mobile UX unknown |
| 15 | **No real-time view of how ATS reads the document** | Top Reddit complaint per multiple aggregators | Gap — slothcv has no parse preview |

Sources: [Trustpilot Resume.io reviews summary](https://www.trustpilot.com/review/resume.io), [Trustpilot Zety](https://www.trustpilot.com/review/zety.com), [Canva ATS failure analysis 2026](https://resumegencv.com/blog/why-canva-resumes-fail-ats-scans), [Two-column ATS catastrophe writeup](https://resumegyani.in/ats-guides/two-column-resume-ats-problem), [FlowCV review with cons](https://resumejudge.com/blog/flowcv-review/), [Reactive Resume page break issue #952](https://github.com/AmruthPillai/Reactive-Resume/issues/952), [Workday/Greenhouse/Lever parser internals](https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work).

---

## Section B — Top requested features users beg for (ranked by frequency)

### 1. Import from existing PDF / DOCX / LinkedIn export

**Evidence:**
- [FlowCV import flow now PDF + DOCX + image + text paste](https://flowcv.com/) — vendor felt forced to ship it
- [Reactive Resume LinkedIn import bad UX issue #2037](https://github.com/AmruthPillai/Reactive-Resume/issues/2037) — users want it even when buggy
- [Teal three import paths](https://help.tealhq.com/en/articles/9457699-import-existing-resume-or-linkedin-profile) — table-stakes for paid tools
- [Rezemo G2 review: "import option does not work well — only half the data"](https://www.g2.com/products/rezemo-resume-builder-and-optimizer-for-g-suite/reviews) — even bad import beats no import

**What SlothCV would need:** Server-side parser (PDF.js for text-layer PDFs, mammoth for DOCX, or a hosted endpoint with `unstructured.io` / OpenResume's parser). LinkedIn data export is a downloaded zip of CSVs — parsing those is mechanical. SlothCV's no-AI stance is fine here: schema-mapping not generation.

**Effort:** L (>1 week — parser fidelity is a long tail)

**Slothcv-fit:** Strong — biggest gap between slothcv and competitors. No-AI doesn't apply here, this is structured-data extraction. Privacy positioning gets stronger if parsing happens client-side via PDF.js.

---

### 2. DOCX export (alongside PDF)

**Evidence:**
- [FlowCV Trustpilot: "users wished CVs could be downloaded in DOCX format"](https://resumejudge.com/blog/flowcv-review/)
- [Enhancv review: "lack of Word download option, can be inconvenient if employer requests .DOCX"](https://resumegenius.com/reviews/enhancv-reviews)
- [Resume.io shipped DOCX after years of pressure](https://updates.resume.io/export-to-docx-feature-126674)
- [PDF-vs-Word format guide: "many employers and application systems specifically require a Word document"](https://enhancv.com/blog/resume-in-pdf-or-word/)

**What SlothCV would need:** Generate a `.docx` from the same JSON model as the PDF. Use `docx` (npm) or generate Office Open XML directly. Per-template DOCX styling map is the work — won't be perfectly identical to the PDF but recruiters know that.

**Effort:** M (≤1 week per major template family; not all 64 templates need DOCX day-one — ship for the 9 Danish-norm + 5-10 universal templates first)

**Slothcv-fit:** Strong — explicit ATS-portal demand, requires no compromise of "no AI" or "EU privacy" stance.

---

### 3. Cover letter builder (matching template per CV)

**Evidence:**
- [Enhancv "uses the same design on your cover letter and resume"](https://enhancv.com/cover-letter-builder/) — competitive table stakes
- [Zety has 18 paired templates](https://zety.com/blog/resume-cover-letter-same-template)
- [Novorésumé "all cover letter templates have a perfectly matching resume template"](https://novoresume.com/cover-letter-templates)
- [ResumeBuilder.com guidance: "an easy way to ensure cover letter and resume match is using same template"](https://www.resumebuilder.com/career-center/should-cover-letter-and-resume-template-match/)
- Workindenmark explicitly recommends a tailored cover letter accompanies the CV.

**What SlothCV would need:** New entity type `cover_letter` linked to a CV; reuse the template engine to produce a 1-page paired layout. Pull header (name/contact) automatically from the CV. No AI generation — provide a structured field set: recipient, opening, body, closing, signature.

**Effort:** L (>1 week — new entity, new templates × N, header sync, but reuses 80% of infrastructure)

**Slothcv-fit:** Strong — Danish hiring norm requires it (workindenmark.dk explicitly), zero conflict with no-AI stance (text fields stay user-authored).

---

### 4. Public share link with view counter / analytics

**Evidence:**
- [Reactive Resume sharing-publicly docs](https://docs.rxresu.me/guides/sharing-your-resume-publicly) — flagship feature
- [FlowCV public share standard offering](https://flowcv.com/) 
- [Hirective custom URL with analytics](https://www.hirective.com/learn/how-to-share-resume-online) — view-tracking is the differentiator
- [QR code on resume CareerBuilder 2023 survey: 68% recruiters say it makes a resume more memorable](https://www.qrcode-tiger.com/qr-codes-on-resume) — the link drives the QR

**What SlothCV would need:** This is on roadmap (v0.5 with HMAC). Add: simple per-view counter (anonymized — country + day, no IP retained, GDPR-clean), QR generator that resolves to the share link, optional view-expiry (auto-disable after N days for time-bounded job applications).

**Effort:** S (≤2 days — counter is one Cloudflare Worker + KV, QR is a 5KB lib)

**Slothcv-fit:** Strong — analytics privacy story is a positioning win versus US tools.

---

### 5. Paste a job posting → highlight matched/missing keywords (no rewriting)

**Evidence:**
- [Jobscan: "match rate based on top ATS including iCIMS, Lever, Greenhouse, Taleo"](https://www.jobscan.co/) — most-cited tool in r/resumes per multiple aggregators
- [SkillSyncer free ATS scanner with match score](https://skillsyncer.com/)
- [ResyMatch by Cultivated Culture](https://cultivatedculture.com/resume-scanner/)
- [Targeted Resume "Relevancy Score" — comparing resume to job description finding missed keywords](https://resumeworded.com/targeted-resume)
- Reddit r/resumes #1 concern per multiple summary articles: "ATS compatibility is by far the #1 concern"
- [Jobscan critique noted: "it's an analyzer, not a builder — users still need to make changes in a separate tool"](https://www.aitooldiscovery.com/guides/ai-job-search-tools-reddit) — slothcv's wedge: be both

**What SlothCV would need:** Local TF-IDF / keyword-extraction in the browser. No LLM. Paste job description → extract noun-phrases + capitalized terms + recurring verbs → highlight which exist in the active CV vs which are missing, with click-to-jump-to-section. Can be 100% client-side.

**Effort:** M (≤1 week — keyword extraction is a known problem; BM25 or compromise-style NLP libs run in-browser)

**Slothcv-fit:** Strong — this is the single most-wanted feature in Reddit threads, and slothcv can ship it without AI (keyword extraction ≠ generation). Position: "we tell you what to fix, you do the writing — your voice, not GPT's."

---

### 6. Multiple resume variants + base resume sync

**Evidence:**
- [Teal Resume Syncing — "maintain one base resume, tailor for different positions, edits sync across versions"](https://www.tealhq.com/post/manage-multiple-resumes) — featured offering
- [Careerflow Base Resume → clone → tailor pattern](https://help.careerflow.ai/en/articles/11690959-how-to-clone-a-resume) 
- [VisualCV duplicate + customize per JD](https://support.visualcv.com/article/35-how-do-i-copy-an-existing-resume)
- [Resume.io duplicate is a top FAQ](https://help.resume.io/article/18-how-do-i-duplicate-or-create-multiple-versions-of-my-resume)
- Slothcv currently has 10 CV cap per user — duplicate exists but no concept of base + variants

**What SlothCV would need:** New "base" flag on a CV. Variants link back to base. When user edits the base, prompt: "apply to N variants?" (per-section diff). Don't auto-cascade — recruiters tailor per role intentionally.

**Effort:** M (≤1 week — schema add + a diff UI)

**Slothcv-fit:** Strong — directly addresses the per-application tailoring workflow that Danish CVs explicitly require ("Recruiters can spot a generic CV instantly" per [workindenmark.dk](https://www.workindenmark.dk/job-search-in-denmark/your-cv/a-good-personal-profile-counts/)).

---

### 7. Real-time selectable-text PDF integrity check

**Evidence:**
- [Mirrai Careers on Figma "vector trap" rasterizing text](https://mirrai.careers/insights/resume-template-figma) — common failure mode
- [Canva ATS-fail because text exports as image](https://resumegencv.com/blog/why-canva-resumes-fail-ats-scans)
- [WisGrowth ATS PDF Checker — entire product built around this single test](https://www.wisgrowth.com/ats-pdf-checker)
- [Test method: "Open exported PDF, try to select a single word"](https://medium.com/@c.a.narain/why-creating-resumes-with-canva-is-not-suitable-for-job-applications-especially-for-ats-f45aadff8b0e)

**What SlothCV would need:** After every PDF export, run a 1-second client-side PDF.js extract pass. If extracted text length < 80% of source CV text, banner: "Export failed integrity check — text may not be ATS-readable. Try a different template." Slothcv's window.print() approach should pass — but verify-and-show-the-user is the differentiator.

**Effort:** S (≤2 days — PDF.js integration + rule)

**Slothcv-fit:** Strong — turns slothcv's existing technical strength into a visible user-facing trust signal. "We verified your export is ATS-readable" is a screenshot-worthy moment.

---

### 8. Per-CV section snippets / examples library

**Evidence:**
- [Indeed resume samples library](https://www.indeed.com/career-advice/resume-samples)
- [Kickresume 2,250+ samples written by real hires](https://www.kickresume.com/en/help-center/resume-samples/)
- [Resume.io 500+ examples](https://resume.io/resume-examples)
- [Novoresume 90+ examples](https://novoresume.com/career-blog/resume-examples)
- Reddit recurring complaint: "I just want to see what others wrote, not buzzword soup from AI"

**What SlothCV would need:** Per-genre example bullets (curated, user-written, NOT AI). Click → insert into editor as starting point. Tag by industry, role level, language (DA/EN). Crowdsource later — start with a curated 50-100 examples per Danish-norm template.

**Effort:** M (≤1 week to build the schema + UX; ongoing content is the real cost)

**Slothcv-fit:** Strong — zero-AI way to give users what they actually want from "AI suggestions" (a head start, not a hallucination).

---

### 9. Quantification / weak-verb writing helper (no rewriting)

**Evidence:**
- [Resumly STAR-method bullet structuring guide](https://www.resumly.ai/blog/how-to-structure-resume-achievements-using-the-star-method)
- [CV Word Checker — green/red word highlighting tool](https://www.cvwordchecker.com/) — entire site dedicated to this
- [Wonsulting XYZ formula (accomplished X by doing Y resulting in Z)](https://www.wonsulting.com/job-search-hub/the-power-of-quantifiable-results-how-to-use-the-xyz-formula-to-supercharge-your-resume)
- Active voice consensus across all CV-writing guidance

**What SlothCV would need:** Lightweight in-editor linter (regex + word-list, not LLM). Flags: weak verbs ("responsible for", "helped with", "worked on"), passive voice ("was managed by"), missing numbers in bullets where percentages/durations would land. Show inline. Don't rewrite.

**Effort:** S (≤2 days — wordlist + regex rules + inline UI)

**Slothcv-fit:** Strong — the "we coach, we don't write for you" positioning is consistent.

---

### 10. Career break / employment gap as first-class entry type

**Evidence:**
- [FlexJobs guide on listing "Career Break" as a job entry](https://www.flexjobs.com/blog/post/how-talk-about-long-unemployment-gap-during-job-interview)
- [Resume Worded: "candidates who provided reasoning for gap got 60% more interviews"](https://resumeworded.com/gap-on-resume-key-advice)
- [Enhancv review: "user wanted ability to add note between work experiences to explain gaps"](https://resumegenius.com/reviews/enhancv-reviews) — explicit unmet request
- LinkedIn rolled out "Career Break" as a profile entry type 2022 — industry-validated norm

**What SlothCV would need:** New section item type alongside experience/education: `career_break` with sub-types (parental leave, education, illness, sabbatical, caregiver, travel, other). Renders neutrally in the timeline. Skills-during-break field optional.

**Effort:** S (≤2 days)

**Slothcv-fit:** Strong — Danish workplace explicitly accepts and expects this; differentiator vs international tools that hide gaps with creative formatting.

---

### 11. References as a separate downloadable document

**Evidence:**
- [Danish norm: "anbefalinger kan fås ved nærmere henvendelse" (references on request) at the bottom of CV](https://www.thelocal.dk/20180816/five-tips-for-writing-an-effective-danish-cv)
- [Aalborg Universitet CV guide: separate references page that you submit with resume](https://www.students.aau.dk/choices-along-the-way-and-jobs/job-and-internship-search/cv)
- [Workindenmark recommends references separately](https://www.workindenmark.dk/job-search-in-denmark/your-cv) (implicit in document structure guidance)

**What SlothCV would need:** Toggle on the references section: "Show in CV / Available on request only / Generate separate document." Third option exports a matching second PDF with name/contact header + reference list.

**Effort:** S (≤2 days)

**Slothcv-fit:** Strong — Danish-specific norm that international tools miss.

---

### 12. Photo editor with background remove + circle-crop

**Evidence:**
- [Resume.io: "crop, rotate, reposition, modify background" in builder](https://help.resume.io/en/articles/3785280)
- [Canva, Pixelcut, Pokecut, remove.bg all built standalone tools for this niche](https://www.fotor.com/features/resume-photo-editor/)
- Danish CV norm: photo expected for service/sales/healthcare roles ("approachable, neutral background" per cv.dk guidance)

**What SlothCV would need:** Browser-native: client-side background removal (ONNX runtime + a 5MB MODNet model loads once), circle/square crop, brightness/contrast. No upload to server. Matches slothcv's privacy stance.

**Effort:** M (≤1 week — model integration is the bulk; UI is straightforward)

**Slothcv-fit:** Strong — Danish-norm-friendly + privacy story holds (background removal in-browser, photo never leaves device).

---

### 13. Rich-text formatting in bullets (bold/italic on specific words)

**Evidence:**
- [Teal supports bold/italic/underline/hyperlink/itemize](https://help.tealhq.com/en/articles/10108990-bold-italicize-underline-hyperlink-and-itemize-your-resume-content)
- [Enhancv exposes Bold/Italic/Underline popup](https://help.enhancv.com/en/articles/3064116-how-to-format-text-using-bold-italic-or-underline)
- Recruiter consensus: bolding key keywords inside bullets passes the 6-11 second scan ([InterviewPal 2025: 11.2-second average scan](https://www.interviewpal.com/blog/how-long-recruiters-actually-spend-reading-your-resume-data-study))
- Caveat: underline confused with link, ATS may treat as URL — surface this guidance inline

**What SlothCV would need:** Tiptap or Lexical-based inline editor on bullet text fields. Bold/italic only (skip underline, surface why). Limit to bullets, not headers.

**Effort:** M (≤1 week — editor library + per-field state)

**Slothcv-fit:** Medium — useful but secondary to #1-#10. Watch for ATS regression (test on Workday/Greenhouse before shipping).

---

### 14. Auto-fit / one-page-pressure-test indicator

**Evidence:**
- [Rezi: "AI handles spacing and layout to ensure single-page design"](https://www.rezi.ai/posts/how-to-fit-a-resume-on-one-page) — vendor leans on this
- Universal "1-page resume" pressure for entry-level roles
- Reactive Resume page break issue #952 has 100+ thumbs-up over years

**What SlothCV would need:** Live overflow indicator: red/yellow/green badge on each page showing how close to overflow. Click → suggestions: "shrink line height to 1.15", "drop oldest experience", "drop bullet 4 of role X (lowest density)". No auto-rewriting — the user clicks the lever.

**Effort:** S (≤2 days — measure DOM heights, surface deltas)

**Slothcv-fit:** Strong — explicit complaint, fits "tools-not-magic" stance.

---

### 15. Section-snippet templates for Danish-specific phrases

**Evidence:**
- Workindenmark personal profile do's: "List your top three competences that match the requirements of the job" — structured pattern
- [CV.dk personlig profil convention: 3-4 lines, top of CV](https://cv.dk/) 
- [CVHjælp Danish 2026 templates with copy-ready structure](https://cvhjaelp.dk/cv-skabelon)
- Already proposed in session — but expanding scope: not just language snippets, but full Danish-norm section scaffolds (personlig profil 4 sentences template, kompetencer with hård/blød split, references-on-request boilerplate)

**What SlothCV would need:** Per-section "Insert Danish-norm scaffold" button. Pre-populates the structure (not the content) per Danish-CV expert convention.

**Effort:** S (≤2 days — content is the cost, schema is trivial)

**Slothcv-fit:** Strong — extends existing section types, plays to Danish-template strength.

---

### 16. Anonymized / blind CV one-click export

**Evidence:**
- [Blind CV Generator (CryptoJobsList) — entire free tool](https://cryptojobslist.com/tools/blind-cv-generator)
- [Affinda AI Resume Redactor — paid product](https://www.affinda.com/resume-redactor)
- [Pinpoint blind recruitment software](https://www.pinpointhq.com/features/blind-recruitment-software/)
- [MeVitae: 50%+ diversity increase claim from blind CVs](https://www.mevitae.com/blind-recruiting)
- EU diversity-hiring trend (DK + DE + NL public sector adopting blind screening)

**What SlothCV would need:** Toggle "Export anonymized" — strips name, photo, address, dates of birth, replaces with initials, keeps experience/education content. Auto-redacts company names if user opts in.

**Effort:** S (≤2 days — render-time toggle in the template engine)

**Slothcv-fit:** Strong — lines up with EU privacy positioning + hiring-bias zeitgeist.

---

### 17. CEFR language-skill picker (A1-C2) instead of free-form

**Evidence:**
- [Europass CEFR is the de facto EU language-skill standard](https://europass.europa.eu/en) — 10M users
- [Europass guide: "dedicated language section using CEFR scale ranging from A1 to C2"](https://www.mycvcreator.com/blog/europass-cv-a-guide-to-the-format-pros-cons-and-modern-alternatives)
- Danish recruiters expect Danish + English fluency markers explicitly per workindenmark

**What SlothCV would need:** In the languages section, add CEFR-level dropdown alongside the free-form input. Optional — can still type "modersmål" or "fluent". When CEFR is set, render with the standard label format.

**Effort:** S (≤2 days)

**Slothcv-fit:** Strong — EU-positioning win, costs almost nothing.

---

### 18. JSON Resume EXPORT (you mentioned import already)

**Evidence:**
- [JSON Resume schema 1.0.0 standard, 2014, community-maintained](https://jsonresume.org/schema)
- [Reactive Resume JSON-Resume export issue #2102](https://github.com/AmruthPillai/Reactive-Resume/issues?q=is%3Aissue+label%3Aenhancement+sort%3Areactions-%2B1-desc) — top-12 enhancement
- Multiple downstream tools (resume-cli, custom themes, GitHub Pages renderers) consume JSON Resume

**What SlothCV would need:** Map slothcv's internal JSON to the JSON Resume schema; expose as a one-click export. Slothcv already has JSON export — just emit the standardized version too.

**Effort:** S (≤2 days — schema mapping + writer)

**Slothcv-fit:** Strong — open-standard interop reinforces "your data, portable" stance. Cheap.

---

### 19. Multi-language parallel editor (DA + EN side-by-side)

**Evidence:**
- [Flowcase parallel editing](https://www.flowcase.com/blog/managing-multi-language-cvs-is-easy-with-flowcase) — entire product wedge
- [Immersive Translate side-by-side bilingual display recommendation](https://immersivetranslate.com/en/document/resume-translator/)
- Danish job market reality: many candidates submit DA + EN versions for same role

**What SlothCV would need:** Variant linked to base CV with `language: en` flag; editor view shows DA/EN side-by-side per section. No auto-translate (no AI) — user fills both. Field-level diff helps user see what's untranslated.

**Effort:** M (≤1 week — variant linking + diff UI)

**Slothcv-fit:** Strong — Danish/EU-specific gap that no major builder handles well without AI.

---

### 20. Rich-text inline links with click-tracking-free icons

**Evidence:**
- [Enhancv links-on-resume guidance: "blue text underlined or with appropriate icon"](https://enhancv.com/blog/links-in-resume/)
- Developer/designer recurring requests for proper GitHub/Behance/Dribbble icon support (not just generic "website")
- Slothcv has custom-element icons but no first-class typed-link entity

**What SlothCV would need:** First-class typed-link entries with auto-icon: `github`, `gitlab`, `linkedin`, `behance`, `dribbble`, `mastodon`, `bluesky`, `personal-site`. Auto-shorten URL display ("github.com/foo" not the full URL).

**Effort:** S (≤2 days — type expansion + icon set)

**Slothcv-fit:** Strong — specifically strengthens slothcv vs developer/designer competitors.

---

### 21. Self-hosting / portable export (single ZIP of whole account)

**Evidence:**
- [Reactive Resume positions on self-hosting + privacy](https://github.com/amruthpillai/reactive-resume) — 25k+ GH stars on the back of this
- GDPR Article 20 right to data portability — formal user right, not optional
- Privacy-conscious users actively asking on r/selfhosted and r/privacy

**What SlothCV would need:** "Download all my data" button → ZIP of every CV (JSON + JSON Resume + PDF + DOCX) + all uploaded photos. Already trivially doable with current architecture; just expose it.

**Effort:** S (≤2 days)

**Slothcv-fit:** Strong — Article 20 GDPR exposure flag + reinforces "your data" positioning.

---

### 22. Per-bullet visibility toggle (already on roadmap — but extend)

This is on roadmap. Extension worth noting: per-bullet visibility should also include "show only in specific variant" — so a CV with 3 variants can have a bullet that appears only in the "Senior Developer" version, not the "Tech Lead" version. Reduces variant count + maintenance.

**Slothcv-fit:** Strong (extension to existing roadmap item)

---

### 23. Ramped-up keyboard shortcuts (already on session list)

(Already proposed.) Minor extension worth noting: cmd+K command palette is the universal expectation now (Linear, Notion, Raycast). Adds discoverability for the existing 14-section + 16-accent + 30-font configs.

---

### 24. Color contrast / print-readability checker

**Evidence:**
- [Resume Companion accessibility commitment](https://resumecompanion.com/accessibility/) — vendors are starting to invest
- [WCAG-AA contrast minimum 4.5:1 for body text, 3:1 for large text](https://silktide.com/toolbar/) — public-sector applicants in DK need this for accessible-document compliance
- Slothcv has 16 accent presets + custom hex — no contrast check today

**What SlothCV would need:** Live contrast badge in the Design tab. If accent + body conflict (e.g., yellow on white), warn before export. Trivially implementable from APCA or WCAG-AA contrast formulas.

**Effort:** S (≤2 days)

**Slothcv-fit:** Strong — niche but cheap, and Danish/EU public-sector applicants explicitly need WCAG-compliant docs.

---

### 25. "Save snapshot before this big edit" panic button

Adjacent to per-CV version snapshots (already proposed). The expansion: a manual "snapshot now" button in the editor toolbar with optional label. Lightweight — just a JSON dump to a `cv_snapshots` table with a foreign key. User-controlled, not auto-versioning. Useful before "I'm going to rewrite the experience section, just in case."

**Effort:** S (≤2 days — fits within existing snapshot work)

**Slothcv-fit:** Strong (extension)

---

## Section C — Danish/EU-specific gaps (international tools miss these)

### C1. Personlig profil 3-line scaffold per Danish norm

**Evidence:** [Workindenmark personal profile do's: 4-8 lines, top-3 competences mapped to job requirements, NOT aspirations](https://www.workindenmark.dk/job-search-in-denmark/your-cv/a-good-personal-profile-counts/dos-and-donts/) — Danish recruiters reject aspirational language outright. International builders (Resume.io, Zety) push the US "objective statement" pattern that Danish recruiters explicitly reject.

**What SlothCV would need:** When DA locale active, the summary section's placeholder text shows the Danish 3-line scaffold ("Match dine top-3 kompetencer til jobbet — IKKE dine karrieremål"). One-click insert template.

---

### C2. Civilstand / age / family disclosure as opt-in fields per Danish norm

**Evidence:** [Workindenmark explicitly recommends including age, marital status, and family info](https://www.workindenmark.dk/job-search-in-denmark/your-cv/personal-details-in-your-cv) — opposite of US norm, where this is illegal to ask. International builders hide or block these fields by default.

**What SlothCV would need:** When DA locale or Danish-norm template active, expose age / civilstand / children fields as standard. Don't pre-fill — let user decide. Tooltip explains the Danish-vs-US norm difference.

---

### C3. References-on-request boilerplate (DA + EN parallel)

**Evidence:** [Danish CV norm: "Anbefalinger kan fås ved nærmere henvendelse" at bottom](https://www.thelocal.dk/20180816/five-tips-for-writing-an-effective-danish-cv); [Aalborg Universitet CV guide](https://www.students.aau.dk/choices-along-the-way-and-jobs/job-and-internship-search/cv)

**What SlothCV would need:** One-click insert of the standard DA / EN boilerplate phrase in the references section. Already overlap with feature #11.

---

### C4. CEFR language framework (overlap with #17)

EU-specific. Already covered.

---

### C5. K-status / fagforening / a-kasse field for blue-collar Danish CVs

**Evidence:** [Krifa CV examples](https://krifa.dk/jobsoegning/cv/cv-eksempler-og-skabeloner) and [HK CV guidance](https://www.hk.dk/karriere/jobsoegningen/maalrettet-cv) reflect Danish blue-collar convention of including union membership / a-kasse on the CV (signal of stability + union solidarity in trades). Slothcv already has 9 Danish-norm trade templates — natural extension.

**What SlothCV would need:** Optional "Fagligt tilhørsforhold" field on the Danish-norm trade templates only. Inserts "Medlem af [HK / 3F / FOA / etc]" with a small union badge if user opts in.

**Effort:** S (≤2 days — schema + per-template render rule)

**Slothcv-fit:** Strong — incumbent international tools cannot do this; slothcv's 9 Danish trade templates are the perfect surface area.

---

### C6. NemID / MitID portfolio link affordance (Danish digital identity)

**Evidence:** Danish public-sector and many private hires now expect a MitID-verified profile or work-permit status indicator. Not a CV field per se but a "Verified via MitID" badge link to a side-channel-safe verification page would be a uniquely Danish trust signal.

**What SlothCV would need:** Skip for v1. Defer until clear demand — risks sliding into identity-broker territory. Note in this report and revisit.

**Effort:** L (>1 week — significant UX/legal work)

**Slothcv-fit:** Weak now, monitor for v2.

---

### C7. EU "noindex/private-by-default" public share

**Evidence:** Slothcv roadmap already includes HMAC public share. The DK/EU expansion: by default the share page should be `noindex, noarchive, nocache` and have a 90-day auto-expiry. [GDPR Art. 17 right-to-erasure](https://gdpr-info.eu/art-17-gdpr/) means a permanently-Googleable old CV becomes a permanent obligation.

**What SlothCV would need:** Default on the public share page: `<meta robots="noindex,noarchive">` + 90-day auto-expire countdown visible to user with "extend" button. Already partially implied in v0.5 roadmap.

---

### C8. DPA-friendly account export (overlap with #21)

GDPR Article 20 portability right — covered above. EU users have the formal right to demand this; shipping it preempts complaints.

---

### C9. Photo guidance per Danish industry

**Evidence:** Photo expected in service/sales/healthcare/customer-facing roles in DK ([cv.dk skabelon-til-cv/billede](https://cv.dk/skabelon-til-cv/billede)); discouraged in academic / international roles. International builders treat photo as universal-on or universal-off.

**What SlothCV would need:** Per-template default (photo on for advokat/sygeplejerske/SOSU/hospitality/retail templates, photo off for developer/staff engineer templates) — slothcv probably already does this. If not, ship it. Surface a tooltip on photo toggle: "Danish norm: photo expected for [this template's industry]."

---

### C10. Skattefradrag / kørselsfradrag CV-relevance hints (skip — out of scope)

Tempting since Philip's work touches Danish accounting, but not a CV-builder feature. Not recommended.

---

## Section D — Recruiter / ATS perspective (5-10 things that make a CV actually get read)

### D1. Single-column linear text PDF (parser-safe)

**Evidence:** [Workday/iCIMS/Taleo all hard-fail multi-column](https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work); [single-column 94% parse fidelity vs 71% for two-column](https://blakecrosley.com/work/ats-insider). [Greenhouse 2024 parser upgrade gave 15-20% fewer parse errors but multi-column still hostile](https://www.atshiring.com/en/learn/workday-ats-guide-2025).

**Slothcv implication:** Audit which of the 64 templates are single-column. Tag each template with an ATS-safety badge (Strong/Medium/Risky). Sort the template gallery by ATS-safety by default.

---

### D2. Standard section headings ("Experience", "Education", "Skills" — not creative)

**Evidence:** [Lever, Greenhouse, Workday parsers look for canonical section headings](https://resumeoptimizerpro.com/blog/lever-ats-resume-guide). Creative headers like "Where I've Made Magic" tank parse rate.

**Slothcv implication:** Section names in slothcv must be configurable but the export should use the ATS-canonical name in the underlying text/HTML structure even if the rendered display is custom. Parser sees `<h2>Experience</h2>`, eye sees "Where I've shipped".

---

### D3. Selectable text in PDF (already covered #7)

Vector outlines = blank to ATS. Slothcv's window.print() approach is correct; verify-and-show is the ship-feature.

---

### D4. Reverse chronological order, dates in MMM YYYY format

**Evidence:** [Workindenmark recommends reverse chronological](https://www.workindenmark.dk/job-search-in-denmark/your-cv); [Lever stores parsed profile separately from original — date parsing is a key field](https://resumeoptimizerpro.com/blog/lever-ats-resume-guide); date format inconsistency is a top parse-failure mode.

**Slothcv implication:** Date field should validate MMM YYYY format (or ISO 2024-03 → render as MMM YYYY). Block ambiguous "03/24" inputs.

---

### D5. Quantified achievements (numbers > adjectives)

**Evidence:** [Wonsulting XYZ formula](https://www.wonsulting.com/job-search-hub/the-power-of-quantifiable-results-how-to-use-the-xyz-formula-to-supercharge-your-resume); [Resumly STAR method guide](https://www.resumly.ai/blog/how-to-structure-resume-achievements-using-the-star-method); [InterviewPal 11.2-second scan finds bullets with numbers fastest](https://www.interviewpal.com/blog/how-long-recruiters-actually-spend-reading-your-resume-data-study).

**Slothcv implication:** Covered in feature #9 — surface "no number in this bullet — consider adding metric" hint.

---

### D6. Active verbs at the start of every bullet

**Evidence:** [CV Word Checker](https://www.cvwordchecker.com/) — green-action / red-passive coding; [Resume.io STAR guidance](https://resume.io/blog/star-method-resume); [LinkedIn passive-voice writeup](https://www.linkedin.com/advice/0/how-can-you-identify-correct-passive-voice-resume-ukyie).

**Slothcv implication:** Covered in feature #9.

---

### D7. ≤2 pages for ≤10 years experience, ≤3 pages for senior

**Evidence:** [Workindenmark "1-2 pages for most candidates, up to 3 for very senior"](https://www.workindenmark.dk/job-search-in-denmark/your-cv); [Indeed 6-second-scan myth followups](https://www.indeed.com/career-advice/resumes-cover-letters/how-long-do-employers-look-at-resumes); [InterviewPal 2025 study](https://www.interviewpal.com/blog/how-long-recruiters-actually-spend-reading-your-resume-data-study).

**Slothcv implication:** Covered in feature #14 — overflow indicator.

---

### D8. Standard sans-serif font 10-12pt

**Evidence:** [Visual CV Denmark guide](https://www.visualcv.com/international/denmark-cv/); [Best resume fonts 2026 with ATS data](https://resumeoptimizerpro.com/blog/best-resume-fonts).

**Slothcv implication:** Slothcv has 30+ fonts. Tag each font with ATS-safety (Strong/Medium/Weak — display-fonts like cursive scripts are Weak) and surface in font picker.

---

### D9. Greenhouse parses better than Workday — file format choice matters per ATS

**Evidence:** [Workday vs Greenhouse vs Lever parser comparison](https://www.hireflow.net/blog/workday-vs-greenhouse-vs-lever-which-parses-best). [LinkedIn PDF parses 52% completeness on Workday](https://resumeoptimizerpro.com/blog/linkedin-resume-builder).

**Slothcv implication:** When DOCX export ships (#2), surface guidance: "Submitting via Workday? DOCX will parse better than PDF."

---

### D10. Modern parsers top out at 87% field accuracy — humans hit 96%

**Evidence:** [General accuracy baseline writeup](https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work).

**Slothcv implication:** Don't over-promise on ATS perfection. Marketing copy: "We render parser-safe — but no tool can guarantee Workday won't mangle 1 in 8 fields. We give you the controls; you tailor and verify."

---

## Section E — Big-bet differentiators SlothCV could OWN

The wedge is: free / EU / open / no-AI / vector PDF / privacy. Pick features no major competitor does well and that double down on this wedge.

### E1. "Verified ATS-readable" badge after every export

The killer feature. Combine #3 (selectable-text PDF) + #7 (real-time integrity check) + per-template ATS-safety scoring. Show user a green-check post-export: "We just re-parsed your PDF — Experience, Education, Skills all extracted correctly. Workday and Greenhouse will see this." No competitor does the post-export verify. Resume.io ships PDFs that fail; slothcv would ship PDFs that PROVE they passed.

**Why slothcv specifically:** The window.print() approach already produces parser-safe output. The verify pass is a 1-second client-side PDF.js extraction. This is purely a marketing-of-existing-capability move.

**Effort:** S-M.

---

### E2. "Job-posting → keyword diff" as the no-AI alternative to ATS scanners

Feature #5 above. Jobscan / Rezi / SkillSyncer all charge $20-50/mo for this. Slothcv ships it free, in-browser, no LLM. Positioning: "We tell you what's missing. You write the bullets — your voice, not a hallucination."

**Why slothcv specifically:** No-AI stance is the differentiator vs Rezi (which lies and says it's "AI-powered" when it's just keyword extraction wrapped in marketing). Slothcv's honesty about what it is = a wedge.

**Effort:** M.

---

### E3. The complete Danish hiring stack in one tool

DA UI + 9 Danish-norm trade templates + personlig profil scaffold (#C1) + civilstand/age fields (#C2) + references-on-request boilerplate (#C3, #11) + fagforening/a-kasse field (#C5) + DA/EN parallel editor (#19) + photo per Danish industry (#C9). No international builder approaches this depth. CV.dk and Jofibo and CVHjælp each cover parts; none cover all.

**Why slothcv specifically:** Philip is in Denmark, has the cultural fluency, and slothcv already has more Danish templates than any international builder. Doubling down here owns a market that the global tools cannot serve.

**Effort:** Medium per feature, large in aggregate.

---

### E4. Privacy-as-feature: client-side everything, audit-friendly

Background-remove in browser (#12). Keyword diff in browser (#5, #E2). PDF integrity check in browser (#7). LinkedIn parse in browser. Photos never leave device. JSON export portable (#21). Public share is `noindex` + auto-expire (#C7). The "we run in your browser" story is unmatched by any major competitor (all of which centralize for monetization).

**Why slothcv specifically:** Schrems II makes EU users actively wary of US-hosted tools. Slothcv hosts in EU + does compute in browser = the strongest privacy story in the category.

**Effort:** Distributed across other features.

---

### E5. Open-data export = trust signal

JSON Resume schema export (#18). Plus: full account ZIP export (#21). Plus: every CV individually exportable as JSON. The implicit promise: "If we ever go away, you have everything." No major competitor does this — they all want to be the data jail.

**Why slothcv specifically:** Reinforces the "free forever, your data" stance with a verifiable mechanism, not just a claim.

**Effort:** S.

---

### E6. Career-break as a respected entry type

Feature #10. LinkedIn rolled this out in 2022. Resume.io / Zety / NovoResume still don't have it as a native type. Danish hiring norms accept career breaks (parental leave especially) without stigma — the Nordic context makes this feature land harder than in US tools.

**Why slothcv specifically:** Cheap to ship, EU-norm-friendly, signals "we get how real careers actually look" — strong inbound for parents returning to work.

**Effort:** S.

---

### E7. "Print-ready by design" — no fixing the export, ever

Most tools' "PDF preview" doesn't match the actual export. Slothcv uses window.print() which means the editor preview IS the export. Lean into this: kill the "preview" pane and call it "Print preview" because that's literally what the user sees on paper. Ship the print-preview pane already proposed in this session, but brand it as "WYSIWYG print" — every other builder lies about this.

**Why slothcv specifically:** Architectural truth-in-advertising — slothcv's stack happens to make this honest, not aspirational.

**Effort:** S.

---

### E8. Crowd-curated Danish-norm example library

Feature #8 + Danish trade focus. Curated user-written examples (no AI), filterable by Danish industry templates (advokat/revisor/sygeplejerske/etc). Ship with 50-100 hand-curated examples per Danish template, then open user-submitted contributions with a moderation queue. Becomes a content moat.

**Why slothcv specifically:** No one is building a Danish-trade-CV example library. Position: "real CVs that real Danish recruiters shortlisted, not GPT-5 buzzword soup."

**Effort:** M for shipping, ongoing for content.

---

## Section F — Things to NOT build (LOOKS appealing, burns engineering)

### F1. AI bullet rewriting / "improve my resume with AI"

Tempting because it's the loudest market noise. DON'T:
1. Master plan forbids it.
2. Rezi 1-star reviews are full of hallucinated skills, name misspellings, generic buzzword output ([Trustpilot Rezi summary](https://www.tealhq.com/post/rezi-review)).
3. Reddit recurring complaint: "AI just added buzzwords, made my resume sound like everyone else's."
4. Doing it "right" requires either: (a) Anthropic/OpenAI calls = recurring cost slothcv would have to monetize = breaks the free promise, or (b) on-device LLM = 1GB+ model that breaks the lightweight stance.

**Position around it:** "We don't write bullets for you because the resumes that work are the ones in your voice. We do tell you what's missing (#5) and what's weak (#9)."

---

### F2. AI cover letter generation

Same reasoning as F1. Cover letters even more so — a generic AI cover letter is a guaranteed reject in Denmark per workindenmark.dk explicit guidance: "Recruiters can spot a generic CV instantly." Building it is poison — the user's experience after using it will be worse interview rates.

**Position:** ship the cover letter BUILDER (#3), skip the GENERATOR.

---

### F3. Auto-translate CV to N languages

Same anti-AI logic. Danish recruiters reading auto-translated English-to-Danish CVs reject for tone/idiom errors. Multilingual is real demand (#19) but parallel-editing-by-the-user is the right answer, not auto-translation.

---

### F4. Built-in job board / job aggregator

Teal pivoted into this, FlowCV added it. It's a different product. Building it requires: scraper infrastructure, legal exposure (some job sites prohibit scraping), and ongoing maintenance for every site that changes its DOM. Slothcv would dilute its wedge.

**Position:** stay focused. Resume builder. Not a career platform.

---

### F5. Chrome extension for one-click apply / autofill

Loud Reddit demand, but the implementation is a snake pit. Site-specific selectors, breaks every time Workday ships an update, indistinguishable from spam-apply tools that recruiters hate. Tools doing this (LazyApply, Sonara) get banned by ATS vendors. Burns trust.

**Position:** ship JSON Resume export (#18). Let third-party autofillers consume it.

---

### F6. Mobile native apps (iOS/Android)

Reddit/G2 demand exists. Building it = double the codebase, double the QA, App Store / Play Store political risk. Slothcv as PWA + mobile-friendly editor (already on roadmap) covers 90% of the value at 10% of the cost.

**Position:** PWA. Add-to-Home-Screen flow. Skip native unless growth justifies the cost.

---

### F7. Built-in interview prep / coaching

Adjacent feature explored by Teal, Kickresume, Enhancv. Wedges away from the resume-builder identity. Probably better as a separate product if Philip wants to build one.

**Position:** out of scope.

---

### F8. Video CV / Loom integration

[Gen Z creative-CV trend article](https://www.recruiter.co.uk/news/2025/07/viral-tiktok-video-sparks-surge-creative-cv-gen-z-candidates) — exists, niche, Gen Z hiring managers explicitly more critical of execution per same source. Hosting video = bandwidth costs that break the free promise. Embedding third-party videos = users' videos vanish when the third party deletes them.

**Position:** support a "Video portfolio link" field that points to wherever the user hosts it (Loom, Vimeo, YouTube unlisted). Don't host the video.

---

## Appendix 1 — AI features users want but slothcv won't ship — how to position around

| User wants | Slothcv non-AI alternative | Positioning line |
|---|---|---|
| AI bullet rewriting | Weak-verb / passive-voice linter (#9) | "We coach. You write. Your voice gets the interview." |
| AI cover letter | Cover letter builder (#3) + Danish scaffolds | "A generic cover letter is auto-reject in DK. Build one we'll be proud of." |
| ATS keyword optimization | Job-posting keyword diff (#5) | "We highlight what's missing. You decide if it belongs." |
| AI translate | Parallel DA/EN editor (#19) | "Auto-translated CVs read like auto-translated CVs. Yours won't." |
| AI auto-tailor for each job | Variant + sync model (#6) + keyword diff (#5) | "Tailor in 30 seconds. Same data model. Your edits, not GPT's." |
| Resume score | Per-template ATS-safety badge + verified-PDF check (#E1) | "We don't fake a number. We verify what the parser actually sees." |

---

## Appendix 2 — Things I couldn't source (excluded from main list)

- "Slothcv mobile UX is bad" — claim is plausible based on FlowCV pattern but not directly tested. Marked as a likely gap in Section A; needs first-party testing before action.
- "Average dwell time before someone abandons a resume builder" — couldn't find a source-cited figure with any confidence interval.
- "Danish hiring managers prefer DOCX or PDF" — couldn't find a Danish-specific recruiter survey. International data exists.

---

## Sources (deduplicated)

### Trustpilot / aggregator complaints
- https://www.trustpilot.com/review/resume.io
- https://www.trustpilot.com/review/zety.com
- https://www.trustpilot.com/review/flowcv.com
- https://www.trustpilot.com/review/myperfectresume.com
- https://www.trustpilot.com/review/resumegenius.com
- https://www.trustpilot.com/review/kickresume.com
- https://www.trustpilot.com/review/tealhq.com
- https://zety.pissedconsumer.com/review.html
- https://resumegenius.pissedconsumer.com/review.html

### Tool reviews + comparisons
- https://resumejudge.com/blog/flowcv-review/
- https://resumejudge.com/blog/novoresume-review/
- https://resumegenius.com/reviews/novoresume-reviews
- https://resumegenius.com/reviews/enhancv-reviews
- https://resumegenius.com/reviews/teal-resume-builder-reviews
- https://www.tealhq.com/post/two-column-resume
- https://www.tealhq.com/post/manage-multiple-resumes
- https://www.tealhq.com/post/rezi-review
- https://www.tealhq.com/post/novoresume-review
- https://www.tealhq.com/post/flowcv-reviews
- https://www.rezi.ai/posts/teal-review
- https://www.rezi.ai/posts/canva-ai-resume-builder-review
- https://4dayweek.io/blog/kickresume-review
- https://www.remotejobassistant.com/blog/teal-resume-review
- https://www.remotejobassistant.com/blog/kickresume-review
- https://pitchmeai.com/blog/resume-io-review
- https://pitchmeai.com/blog/best-ai-resume-builder-reddit
- https://pitchmeai.com/blog/kickresume-trustpilot-rating-analysis
- https://www.aitooldiscovery.com/guides/ai-job-search-tools-reddit
- https://resumeoptimizerpro.com/blog/best-ai-resume-builder-reddit

### ATS / recruiter / parser internals
- https://resumeoptimizerpro.com/blog/how-resume-parsers-actually-work
- https://resumeoptimizerpro.com/blog/greenhouse-ats-resume-guide
- https://resumeoptimizerpro.com/blog/lever-ats-resume-guide
- https://resumeoptimizerpro.com/blog/linkedin-resume-builder
- https://www.atshiring.com/en/learn/workday-ats-guide-2025
- https://www.hireflow.net/blog/workday-vs-greenhouse-vs-lever-which-parses-best
- https://www.jobscan.co/blog/resume-tables-columns-ats/
- https://www.jobscan.co/blog/ats-formatting-mistakes/
- https://www.jobscan.co/blog/20-ats-friendly-resume-templates/
- https://blakecrosley.com/work/ats-insider
- https://resumegyani.in/ats-guides/two-column-resume-ats-problem
- https://resumegencv.com/blog/why-canva-resumes-fail-ats-scans
- https://www.candycv.com/how-to/dont-make-your-resume-with-canva-why-its-templates-fail-and-what-to-use-instead-25
- https://medium.com/@c.a.narain/why-creating-resumes-with-canva-is-not-suitable-for-job-applications-especially-for-ats-f45aadff8b0e
- https://www.worxksolutions.com/post/your-canva-resume-is-pretty-but-it-s-not-ats-compliant
- https://mirrai.careers/insights/resume-template-figma
- https://www.wisgrowth.com/ats-pdf-checker
- https://www.interviewpal.com/blog/how-long-recruiters-actually-spend-reading-your-resume-data-study
- https://standout-cv.com/stats/how-long-recruiters-spend-looking-at-cv

### Keyword / scanner tools (competitive analysis)
- https://www.jobscan.co/
- https://skillsyncer.com/
- https://cultivatedculture.com/resume-scanner/
- https://resumeworded.com/targeted-resume
- https://www.loopcv.pro/tools/resume-keywords-checker/
- https://www.cvwordchecker.com/

### Reactive Resume / open-source reference
- https://github.com/AmruthPillai/Reactive-Resume
- https://github.com/AmruthPillai/Reactive-Resume/issues/952
- https://github.com/AmruthPillai/Reactive-Resume/issues/1834
- https://github.com/AmruthPillai/Reactive-Resume/issues/2037
- https://github.com/AmruthPillai/Reactive-Resume/issues/2063
- https://github.com/AmruthPillai/Reactive-Resume/issues/2102
- https://github.com/AmruthPillai/Reactive-Resume/issues/2263
- https://github.com/AmruthPillai/Reactive-Resume/issues/2499
- https://github.com/AmruthPillai/Reactive-Resume/issues/2508
- https://docs.rxresu.me/guides/sharing-your-resume-publicly
- https://docs.rxresu.me/guides/json-resume-schema

### Standards / open data
- https://jsonresume.org/schema
- https://github.com/jsonresume/resume-schema
- https://europass.europa.eu/en
- https://gdpr-info.eu/art-17-gdpr/
- https://www.dataprotection.ie/en/individuals/know-your-rights/right-erasure-articles-17-19-gdpr

### Danish / EU job market
- https://www.workindenmark.dk/job-search-in-denmark/your-cv
- https://www.workindenmark.dk/job-search-in-denmark/your-cv/personal-details-in-your-cv
- https://www.workindenmark.dk/job-search-in-denmark/your-cv/a-good-personal-profile-counts
- https://www.workindenmark.dk/job-search-in-denmark/your-cv/a-good-personal-profile-counts/dos-and-donts/
- https://www.workindenmark.dk/job-search-in-denmark/your-cover-letter
- https://cv.dk/skabelon-til-cv
- https://cv.dk/skabelon-til-cv/billede
- https://cvhjaelp.dk/cv-skabelon
- https://jofibo.com/da/blog/hvordan-skriver-man-et-cv
- https://www.djoef.dk/jobsoegning/skriv-et-godt-cv
- https://www.hk.dk/karriere/jobsoegningen/maalrettet-cv
- https://krifa.dk/jobsoegning/cv/cv-eksempler-og-skabeloner
- https://www.students.aau.dk/choices-along-the-way-and-jobs/job-and-internship-search/cv
- https://studerende.ida.dk/english/benefits-for-students/job-search/the-cv
- https://www.thelocal.dk/20180816/five-tips-for-writing-an-effective-danish-cv
- https://www.howtoliveindenmark.com/danish-business-culture/job-hunting-denmark-danish-cv/
- https://www.visualcv.com/international/denmark-cv/
- https://www.cvwizard.com/da/artikler/profiltekst-cv
- https://www.jobindex.dk/guides/cv-skabeloner-og-eksempler
- https://www.mycvcreator.com/blog/europass-cv-a-guide-to-the-format-pros-cons-and-modern-alternatives

### Specific feature evidence
- https://flowcv.com/cover-letter-builder
- https://help.tealhq.com/en/articles/9457699-import-existing-resume-or-linkedin-profile
- https://help.tealhq.com/en/articles/10108990-bold-italicize-underline-hyperlink-and-itemize-your-resume-content
- https://help.careerflow.ai/en/articles/11690959-how-to-clone-a-resume
- https://help.resume.io/article/18-how-do-i-duplicate-or-create-multiple-versions-of-my-resume
- https://help.resume.io/article/10-can-i-download-my-resume-to-word-or-pdf
- https://updates.resume.io/export-to-docx-feature-126674
- https://help.enhancv.com/en/articles/3064116-how-to-format-text-using-bold-italic-or-underline
- https://enhancv.com/blog/links-in-resume/
- https://enhancv.com/blog/resume-in-pdf-or-word/
- https://enhancv.com/cover-letter-builder/
- https://enhancv.com/features/translate-resume/
- https://www.flowcase.com/blog/managing-multi-language-cvs-is-easy-with-flowcase
- https://www.qrcode-tiger.com/qr-codes-on-resume
- https://www.hirective.com/learn/how-to-share-resume-online
- https://cryptojobslist.com/tools/blind-cv-generator
- https://www.affinda.com/resume-redactor
- https://www.mevitae.com/blind-recruiting
- https://resumeworded.com/gap-on-resume-key-advice
- https://www.flexjobs.com/blog/post/how-talk-about-long-unemployment-gap-during-job-interview
- https://novoresume.com/career-blog/employment-gap-in-resume
- https://www.wonsulting.com/job-search-hub/the-power-of-quantifiable-results-how-to-use-the-xyz-formula-to-supercharge-your-resume
- https://resumly.ai/blog/how-to-structure-resume-achievements-using-the-star-method
- https://resume.io/blog/star-method-resume

### Trends 2025-2026
- https://www.recruiter.co.uk/news/2025/07/viral-tiktok-video-sparks-surge-creative-cv-gen-z-candidates
- https://www.cvwizard.com/en/articles/future-of-job-applications-for-gen-z
- https://breezy.hr/blog/gen-z-recruiting-trends
- https://resumegenius.com/blog/resume-help/current-resume-trends
- https://www.myperfectresume.com/career-center/resumes/how-to/6-resume-trends-you-should-follow

---

## Final editorial verdict — top 15 to ship, in order of impact / effort ratio

1. **Verified ATS-readable badge after export** (#E1) — S effort, biggest marketing payoff
2. **DOCX export** (#2) — M effort, single biggest gap vs every competitor
3. **Job-posting → keyword diff** (#5) — M effort, owns the no-AI alternative to ATS scanners
4. **PDF / DOCX / LinkedIn export import** (#1) — L effort, biggest UX onboarding lift
5. **Cover letter builder (paired template)** (#3) — L effort, Danish-norm requirement
6. **Career break first-class entry type** (#10) — S effort, EU-norm fit + screenshot moment
7. **CEFR language picker** (#17) — S effort, EU positioning win
8. **Personlig profil 3-line scaffold + civilstand fields + references-on-request boilerplate** (#C1, #C2, #C3, #11) — bundled, S effort, owns Danish norm
9. **Variants + base sync** (#6) — M effort, addresses tailoring workflow Danish recruiters require
10. **Public share with view counter + QR + auto-expire** (#4 + #C7) — S effort extension to existing v0.5 work
11. **Auto-fit / overflow indicator** (#14) — S effort, addresses universal page-break complaint
12. **JSON Resume export** (#18) — S effort, open-standard interop trust signal
13. **Quantification / weak-verb writing helper** (#9) — S effort, no-AI coaching position
14. **Photo editor with background-remove** (#12) — M effort, Danish-norm + privacy story
15. **Section examples library curated for Danish trades** (#8 + #E8) — M effort + ongoing content, content moat

The full list ranked by raw user-demand frequency would put PDF/LinkedIn import at #1 and DOCX at #2 — but ATS-verified badge is the cheapest screenshot-worthy moment, and shipping it first makes everything else more credible.
