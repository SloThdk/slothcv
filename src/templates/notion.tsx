/**
 * Notion — friendly geometric sans, soft cards, generalist energy.
 *
 * Visual character:
 *   - Outfit (geometric sans, more friendly than Inter) for body.
 *   - Page background a touch off-white (#fbfbfa) — the color of a
 *     freshly-made paper bag.
 *   - Each section sits in its own soft gray "callout" card
 *     (#f7f6f3 background, 8px radius, 16px inside padding) — cribbed
 *     directly from Notion's callout block.
 *   - Section heads start with a small colored circle dot (a la
 *     Notion's emoji-prefix sections) sized 8px and tinted from the
 *     accent color. Reads warm, not corporate.
 *   - Plain bullet markers; section card spacing eats the visual rhythm.
 *
 * Industry-fit: PMs, generalists, ops people, content marketers,
 * non-technical operators at startups. Reads as "I know how to use
 * Notion which means I'm productive" without being twee.
 */

"use client";

import { TemplateFrame } from "./frame";
import { EditableSectionTitle, SectionBody } from "./components";
import { SectionActions } from "./section-actions";
import {
  elementStyle,
  positionStyle,
  resolveDesign,
  visibleSections,
} from "./shared";
import type { ResumeData } from "@/types/resume";

interface Props {
  data: ResumeData;
  fixedSize?: boolean;
  skipOverlay?: boolean;
}

// Notion's signature callout-card background color. Hardcoded because it's
// intrinsic to the Notion brand identity — if you swap this for the page
// background the cards become invisible.
const CARD_BG = "#f7f6f3";

// Page tint — slightly warmer than pure white. Hardcoded for the same reason.
const PAGE_TINT = "#fbfbfa";

// Section dot palette — small 8px dot that prefixes each section heading.
// Cycles through a 6-color rotation indexed by section position so the user
// doesn't get a wall of identical dots, but stays in a soft, Notion-emoji
// vibe. Hardcoded because they're intrinsic to the Notion identity.
const DOT_PALETTE = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function NotionTemplate({ data, fixedSize, skipOverlay }: Props) {
  const { design, personal } = data;
  const visible = visibleSections(data);

  // Override the page background regardless of the user's design.pageBg —
  // the warm tint is intrinsic to the Notion identity. Future: respect the
  // user's choice but apply the tint to the cards instead.
  const tintedData: ResumeData = {
    ...data,
    design: {
      ...design,
      pageBg: design.pageBg === "#FFFFFF" || design.pageBg === "#ffffff"
        ? PAGE_TINT
        : design.pageBg,
    },
  };

  return (
    <TemplateFrame data={tintedData} fixedSize={fixedSize} skipOverlay={skipOverlay}>
      <header
        data-section-id="personal"
        className="mb-8 cursor-pointer"
      >
        <div className="flex items-start gap-5">
          {design.photo.enabled && (
            <div
              data-element-id="personal.photo"
              className="cursor-grab"
              style={elementStyle(data, "personal.photo")}
            >
              {personal.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personal.photoUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="h-16 w-16 rounded-full object-cover"
                  // box-shadow + design.photo.borderColor override (Design → Photo → Border)
                  style={{ boxShadow: `0 0 0 ${design.photo.borderWidth ?? 2}px ${design.photo.borderColor || PAGE_TINT}` }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="grid h-full w-full place-items-center bg-[color-mix(in_srgb,currentColor_8%,transparent)] text-[color-mix(in_srgb,currentColor_45%,transparent)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div className="flex-1">
            <h1
              data-element-id="personal.name"
              className="block w-fit cursor-text text-[2.4em] leading-[1.1]"
              style={{
                color: design.textColor,
                fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), 'DM Sans', sans-serif)",
                fontWeight: 700,
                ...elementStyle(data, "personal.name"),
              }}
            >
              {personal.fullName || "Your name"}
            </h1>
            {personal.headline && (
              <p
                data-element-id="personal.headline"
                className="mt-1 block w-fit cursor-text text-[1em]"
                style={{
                  color: `${design.textColor}aa`,
                  fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), 'DM Sans', sans-serif)",
                  fontWeight: 400,
                  ...elementStyle(data, "personal.headline"),
                }}
              >
                {personal.headline}
              </p>
            )}
            <NotionContact data={data} />
          </div>
        </div>
      </header>

      <div className="space-y-3">
        {visible.map((s, i) => {
          const d = resolveDesign(design, s);
          const titleId = `section.${s.id}.title`;
          const dot = DOT_PALETTE[i % DOT_PALETTE.length];
          return (
            <section
              key={s.id}
              data-section-id={s.id}
              style={{
                ...positionStyle(s),
                background: CARD_BG,
                borderRadius: "8px",
                padding: "16px 18px",
              }}
              className="group relative cursor-pointer break-inside-avoid"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: dot }}
                  aria-hidden
                />
                <h2
                  data-element-id={titleId}
                  className="cursor-text text-[0.95em]"
                  style={{
                    color: design.textColor,
                    fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), 'DM Sans', sans-serif)",
                    fontWeight: 600,
                    ...elementStyle(data, titleId),
                  }}
                >
                  <EditableSectionTitle sid={s.id} data={data}>{s.title}</EditableSectionTitle>
                </h2>
              </div>
              <SectionBody section={s} design={d} data={data} />
              <SectionActions section={s} />
            </section>
          );
        })}
      </div>
    </TemplateFrame>
  );
}

function NotionContact({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const items: { id: string; label: string; href?: string; icon: string }[] = [];
  if (personal.email)
    items.push({ id: "personal.email", label: personal.email, icon: "✉" });
  if (personal.phone)
    items.push({ id: "personal.phone", label: personal.phone, icon: "☏" });
  if (personal.location)
    items.push({ id: "personal.location", label: personal.location, icon: "◎" });
  for (const l of personal.links) {
    items.push({
      id: `personal.links.${l.id}`,
      label: l.label || l.url,
      href: l.url,
      icon: "↗",
    });
  }
  if (items.length === 0) return null;
  const grab =
    "inline-flex items-center gap-1 cursor-text rounded-md px-2 py-0.5";
  return (
    <div
      className="mt-3 flex flex-wrap gap-1.5 text-[0.85em]"
      style={{
        color: `${design.textColor}aa`,
        fontFamily: "var(--cv-title-font, var(--font-outfit, 'Outfit'), 'DM Sans', sans-serif)",
      }}
    >
      {items.map((it) =>
        it.href ? (
          <a
            key={it.id}
            data-element-id={it.id}
            href={it.href.startsWith("http") ? it.href : `https://${it.href}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${grab} hover:underline`}
            style={{
              background: CARD_BG,
              color: design.textColor,
              ...elementStyle(data, it.id),
            }}
          >
            <span style={{ color: `${design.textColor}66` }} aria-hidden>
              {it.icon}
            </span>
            {it.label}
          </a>
        ) : (
          <span
            key={it.id}
            data-element-id={it.id}
            className={grab}
            style={{
              background: CARD_BG,
              color: design.textColor,
              ...elementStyle(data, it.id),
            }}
          >
            <span style={{ color: `${design.textColor}66` }} aria-hidden>
              {it.icon}
            </span>
            {it.label}
          </span>
        ),
      )}
    </div>
  );
}
