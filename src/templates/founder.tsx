/**
 * Founder — pitch-deck-inspired CV. Reads "Series A founder, AngelList top
 * angel, talks at SaaStr". Optimized for the warm intro: "Here's their
 * deck-style one-pager".
 *
 * Visual character:
 *   - HERO band at the top: oversized italic Fraunces quote pulled from
 *     personal.headline (or the first sentence of summary if no headline).
 *     This is the "we are building X" voice every founder deck opens with
 *   - BELOW the hero: three-column "Currently / Previously / Press" pillar
 *     layout. Currently shows experience.current items. Previously shows
 *     non-current. Press is talks (founders' "TechCrunch / Forbes / podcast"
 *     proxy)
 *   - All other sections fall below the pillars in a single column —
 *     education, awards, custom — but the pillars are the visual anchor
 *   - Violet `#6d28d9` accent — the SF / a16z / Linear startup violet —
 *     used on pillar headers in caps
 *   - Inter throughout for body, Fraunces only for the hero quote
 *   - White bg, sharp 2px violet rule under the hero band
 *   - Photo enabled top-right: 80×80 rounded-square if user wants the
 *     Patrick-Collison-style portrait
 *
 * Industry-fit: founders raising or operating, indie hackers post-exit,
 * angels, accelerator alumni (YC/Techstars), GTM/growth leaders pitching
 * themselves to a VC for an EIR slot.
 *
 * Hardcoded violet identity. Hero quote prefers personal.headline; falls
 * back to first sentence of the first summary section.
 */

"use client";

import { TemplateFrame } from "./frame";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  formatDateRange,
  positionStyle,
  visibleBullets,
  visibleSections,
} from "./shared";
import type {
  Bullet,
  ExperienceItem,
  GlobalDesign,
  ResumeData,
  Section,
  TalksSection,
} from "@/types/resume";
import { EditableFallback, EditableSectionTitle } from "./components";

const VIOLET = "#6d28d9";
const INK = "#0a0a0a";
const MUTED = "#6b7280";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

export function FounderTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Pillar feed: pull experience and talks out of the visible list so we
  // can render them in the three-pillar layout. Everything else stays
  // below in a single column.
  const expSection = visible.find((s) => s.type === "experience");
  const talksSection = visible.find((s) => s.type === "talks") as
    | TalksSection
    | undefined;
  const remainingSections = visible.filter(
    (s) => s.type !== "experience" && s.type !== "talks",
  );

  // Hero quote: prefer headline, else first sentence of first summary.
  const summaryFirstSentence = (() => {
    const sum = visible.find((s) => s.type === "summary") as
      | { type: "summary"; body: string }
      | undefined;
    if (!sum?.body) return "";
    const m = sum.body.match(/^(.*?[.!?])(\s|$)/);
    return m ? m[1] : sum.body.slice(0, 120);
  })();
  const heroQuote = personal.headline || summaryFirstSentence;

  // Bucket experience into Currently / Previously by the .current flag.
  const currentJobs: ExperienceItem[] = [];
  const pastJobs: ExperienceItem[] = [];
  if (expSection && expSection.type === "experience") {
    for (const it of expSection.items.filter((i) => i.visible)) {
      (it.current ? currentJobs : pastJobs).push(it);
    }
  }
  const expSectionId = expSection?.id;

  return (
    <TemplateFrame data={data} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      {/* Header — name + photo */}
      <header
        data-section-id="personal"
        className="mb-4 flex cursor-pointer items-end justify-between gap-5"
      >
        <div>
          <h1
            data-element-id="personal.name"
            className="block w-fit cursor-text text-[2.4em] leading-[1.05] tracking-tight transition-shadow hover:ring-2 hover:ring-neutral-900/20 hover:ring-offset-2"
            style={{
              color: INK,
              fontFamily: "var(--font-inter, 'Inter'), sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              ...elementStyle(data, "personal.name"),
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          <FounderContact data={data} />
        </div>
        {design.photo.enabled && personal.photoUrl && (
          <div
            data-element-id="personal.photo"
            className="cursor-grab"
            style={elementStyle(data, "personal.photo")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personal.photoUrl}
              alt=""
              referrerPolicy="no-referrer"
              draggable={false}
              className="h-20 w-20 rounded-2xl object-cover"
              style={{ outline: `2px solid ${VIOLET}33`, outlineOffset: "2px" }}
            />
          </div>
        )}
      </header>

      {/* Hero quote band — oversized italic Fraunces. The pitch line. */}
      {heroQuote && (
        <div
          data-element-id="personal.headline"
          className="mb-5 cursor-text rounded-md py-3 transition-shadow hover:ring-2 hover:ring-neutral-900/20"
          style={elementStyle(data, "personal.headline")}
        >
          <p
            className="text-[1.6em] italic leading-[1.25]"
            style={{
              color: INK,
              fontFamily:
                "var(--font-fraunces, 'Fraunces'), 'EB Garamond', serif",
              fontWeight: 400,
            }}
          >
            <span style={{ color: VIOLET }} aria-hidden>
              “
            </span>
            {heroQuote}
            <span style={{ color: VIOLET }} aria-hidden>
              ”
            </span>
          </p>
        </div>
      )}
      <div className="mb-6 h-[2px] w-full" style={{ background: VIOLET }} />

      {/* Three-pillar grid: Currently / Previously / Press */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
      >
        <FounderPillar
          title="Currently"
          data={data}
        >
          {expSectionId &&
            currentJobs.map((it) => (
              <FounderJobCard
                key={it.id}
                item={it}
                data={data}
                sectionId={expSectionId}
                design={design}
              />
            ))}
          {currentJobs.length === 0 && (
            <FounderEmpty>No active roles.</FounderEmpty>
          )}
        </FounderPillar>
        <FounderPillar
          title="Previously"
          data={data}
        >
          {expSectionId &&
            pastJobs.map((it) => (
              <FounderJobCard
                key={it.id}
                item={it}
                data={data}
                sectionId={expSectionId}
                design={design}
              />
            ))}
          {pastJobs.length === 0 && (
            <FounderEmpty>Add prior roles.</FounderEmpty>
          )}
        </FounderPillar>
        <FounderPillar
          title="Press"
          data={data}
          sectionForActions={talksSection}
        >
          {talksSection
            ? talksSection.items
                .filter((t) => t.visible)
                .map((t) => {
                  const id = `section.${talksSection.id}.item.${t.id}`;
                  return (
                    <article
                      key={t.id}
                      data-element-id={id}
                      className="cursor-grab rounded-sm text-[0.85em] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
                      style={elementStyle(data, id)}
                    >
                      {t.url ? (
                        <a
                          href={
                            t.url.startsWith("http") ? t.url : `https://${t.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-2 hover:underline"
                          style={{ color: INK, fontWeight: 600 }}
                        >
                          <EditableFallback data={data} fieldId={`${id}.title`} value={t.title} placeholder="Title" />
                        </a>
                      ) : (
                        <span className="font-semibold"><EditableFallback data={data} fieldId={`${id}.title`} value={t.title} placeholder="Title" /></span>
                      )}
                      {t.venue && (
                        <div style={{ color: VIOLET }}><EditableFallback data={data} fieldId={`${id}.venue`} value={t.venue} placeholder="Venue" /></div>
                      )}
                      {t.date && (
                        <div className="text-[0.82em]" style={{ color: MUTED }}>
                          <EditableFallback data={data} fieldId={`${id}.date`} value={t.date} placeholder="Date" />
                        </div>
                      )}
                    </article>
                  );
                })
            : null}
          {(!talksSection ||
            talksSection.items.filter((t) => t.visible).length === 0) && (
            <FounderEmpty>Add talks, podcasts, press.</FounderEmpty>
          )}
        </FounderPillar>
      </div>

      {/* Below pillars — everything else, single column */}
      {remainingSections.length > 0 && (
        <div className="mt-7 space-y-5">
          {remainingSections.map((s) => (
            <FounderTailSection
              key={s.id}
              section={s}
              design={design}
              data={data}
            />
          ))}
        </div>
      )}

      {/* Render the original experience section as a hidden anchor for
          SectionActions / drag — invisible to the user but keeps the
          per-section reorder/delete affordance on the visible card cluster. */}
      {expSection && (
        <section
          data-section-id={expSection.id}
          className="absolute -top-px left-0 h-px w-full opacity-0"
          aria-hidden
        >
          <SectionActions section={expSection} />
        </section>
      )}
    </TemplateFrame>
  );
}

function FounderContact({ data }: { data: ResumeData }) {
  const { personal } = data;
  const items: { id: string; label: string; href?: string }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone });
  if (personal.location)
    items.push({ id: "personal.location", label: personal.location });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
    });
  }
  if (items.length === 0) return null;
  const grab =
    "inline-block cursor-text rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/20";
  return (
    <p
      className="mt-1 text-[0.85em]"
      style={{
        color: MUTED,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {items.map((p, i) => (
        <span key={p.id}>
          {i > 0 && (
            <span className="mx-2" style={{ color: VIOLET }}>
              ·
            </span>
          )}
          {p.href ? (
            <a
              data-element-id={p.id}
              href={p.href.startsWith("http") ? p.href : `https://${p.href}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${grab} underline-offset-2 hover:underline`}
              style={{ color: VIOLET, ...elementStyle(data, p.id) }}
            >
              {p.label}
            </a>
          ) : (
            <span
              data-element-id={p.id}
              className={grab}
              style={elementStyle(data, p.id)}
            >
              {p.label}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

function FounderPillar({
  title,
  children,
  data,
  sectionForActions,
}: {
  title: string;
  children: React.ReactNode;
  data: ResumeData;
  sectionForActions?: Section;
}) {
  // Pillar wrapper. Allows section actions (move/delete) only when a real
  // section underlies this pillar — currently only Press is a real section.
  void data; // reserved for future per-pillar override styling
  return (
    <div
      data-section-id={sectionForActions?.id}
      className="group relative space-y-2.5 rounded-md p-2 transition-[background-color,box-shadow] hover:bg-violet-50/40 hover:ring-2 hover:ring-violet-300/40"
    >
      <h2
        className="text-[0.78em] uppercase"
        style={{
          color: VIOLET,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 800,
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
      {sectionForActions && <SectionActions section={sectionForActions} />}
    </div>
  );
}

function FounderJobCard({
  item,
  data,
  sectionId,
  design,
}: {
  item: ExperienceItem;
  data: ResumeData;
  sectionId: string;
  design: GlobalDesign;
}) {
  const id = `section.${sectionId}.item.${item.id}`;
  return (
    <article
      data-element-id={id}
      className="cursor-grab rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
      style={elementStyle(data, id)}
    >
      <h3
        className="text-[0.95em]"
        style={{
          color: INK,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 700,
        }}
      >
        {item.role}
      </h3>
      {item.company && (
        <div
          className="text-[0.85em]"
          style={{ color: VIOLET, fontWeight: 600 }}
        >
          {item.company}
        </div>
      )}
      <div
        className="text-[0.78em]"
        style={{
          color: MUTED,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
        }}
      >
        {formatDateRange(
          item.startDate,
          item.endDate,
          item.current,
          design.dateFormat,
        )}
        {item.location && ` · ${item.location}`}
      </div>
      <FounderBullets
        bullets={item.bullets}
        data={data}
        sectionId={sectionId}
      />
    </article>
  );
}

function FounderBullets({
  bullets,
  data,
  sectionId,
}: {
  bullets: Bullet[];
  data: ResumeData;
  sectionId: string;
}) {
  const list = visibleBullets(bullets);
  if (list.length === 0) return null;
  return (
    <ul
      className="mt-1 space-y-0.5 text-[0.85em] leading-[1.5]"
      style={{
        color: INK,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {list.map((b) => {
        const id = `section.${sectionId}.bullet.${b.id}`;
        return (
          <li
            key={b.id}
            data-element-id={id}
            className="flex cursor-text gap-1.5 rounded-sm transition-shadow hover:ring-2 hover:ring-neutral-900/15"
            style={elementStyle(data, id)}
          >
            <span
              className="select-none"
              style={{ color: VIOLET }}
              aria-hidden
            >
              ▸
            </span>
            <span className="flex-1 whitespace-pre-wrap">{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function FounderEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.82em] italic"
      style={{
        color: MUTED,
        fontFamily: "var(--font-inter, 'Inter'), sans-serif",
      }}
    >
      {children}
    </p>
  );
}

/** Below-pillar sections: render in a compact single-column form so they
 *  don't fight the pillars for visual primacy. */
function FounderTailSection({
  section,
  design,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  const titleId = `section.${section.id}.title`;
  return (
    <section
      data-section-id={section.id}
      style={positionStyle(section)}
      className="group relative cursor-pointer break-inside-avoid rounded-md p-1 -m-1 transition-[background-color,box-shadow] hover:bg-violet-50/40 hover:ring-2 hover:ring-neutral-900/10"
    >
      <h2
        data-element-id={titleId}
        className="mb-1 inline-block cursor-text text-[0.78em] uppercase transition-shadow hover:ring-2 hover:ring-neutral-900/30 hover:ring-offset-2"
        style={{
          color: VIOLET,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          fontWeight: 800,
          letterSpacing: "0.18em",
          ...elementStyle(data, titleId),
        }}
      >
        <EditableSectionTitle sid={section.id} data={data}>{section.title}</EditableSectionTitle>
      </h2>
      <div
        className="mb-2 h-px w-full"
        style={{ background: `${VIOLET}33` }}
      />
      <FounderTailBody section={section} design={design} data={data} />
      <SectionActions section={section} />
    </section>
  );
}

function FounderTailBody({
  section,
  data,
}: {
  section: Section;
  design: GlobalDesign;
  data: ResumeData;
}) {
  if ("body" in section && (section as { body?: string }).body) {
    const id = `section.${section.id}.body`;
    return (
      <p
        data-element-id={id}
        className="cursor-text whitespace-pre-wrap text-[0.92em] leading-[1.55] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
        style={{
          color: INK,
          fontFamily: "var(--font-inter, 'Inter'), sans-serif",
          ...elementStyle(data, id),
        }}
      >
        {(section as { body: string }).body}
      </p>
    );
  }
  if ("items" in section) {
    const its = (section as {
      items: {
        id: string;
        name?: string;
        text?: string;
        proficiency?: string;
        visible: boolean;
      }[];
    }).items;
    const visible = its.filter((i) => i.visible);
    return (
      <div className="flex flex-wrap gap-1.5">
        {visible.map((it) => {
          const id = `section.${section.id}.item.${it.id}`;
          const label = it.name ?? it.text ?? "";
          return (
            <span
              key={it.id}
              data-element-id={id}
              className="cursor-grab rounded-md px-2 py-0.5 text-[0.85em] transition-shadow hover:ring-2 hover:ring-neutral-900/15"
              style={{
                background: `${VIOLET}10`,
                border: `1px solid ${VIOLET}33`,
                color: INK,
                fontFamily: "var(--font-inter, 'Inter'), sans-serif",
                ...elementStyle(data, id),
              }}
            >
              {label}
              {it.proficiency && (
                <span style={{ color: VIOLET }}> · <EditableFallback data={data} fieldId={`section.${section.id}.item.${it.id}.proficiency`} value={it.proficiency} placeholder="Proficiency" /></span>
              )}
            </span>
          );
        })}
      </div>
    );
  }
  return null;
}
