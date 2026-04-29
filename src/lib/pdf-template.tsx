/**
 * PDF document — react-pdf companion to the DOM templates.
 *
 * react-pdf renders to a Yoga (Flexbox) layout engine. It does NOT support:
 *   - CSS grid
 *   - background-image gradients
 *   - many CSS pseudo-elements
 *   - margin: collapsing across blocks
 *
 * So we reproduce the visual gist of each template using only flex + simple
 * border/background tricks. The output is selectable text, embedded fonts,
 * and ATS-friendly.
 *
 * One PDF document covers all 7 DOM templates by branching on
 * `data.meta.template` for the layout, then rendering shared section blocks.
 */

"use client";

import {
  Document,
  Image as PdfImage,
  Link as PdfLink,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  AwardsSection,
  CertificationsSection,
  CustomElement,
  CustomSection,
  EducationSection,
  ExperienceSection,
  GlobalDesign,
  HobbiesSection,
  IconElement,
  ImageElement,
  LanguagesSection,
  LineElement,
  ProjectsSection,
  PublicationsSection,
  ReferencesSection,
  ResumeData,
  Section,
  SkillsSection,
  SummarySection,
  TalksSection,
  TextElement,
  VolunteerSection,
} from "@/types/resume";
import {
  SOCIAL_ICONS_BY_NAME,
  isSocialIconName,
} from "@/lib/social-icons";
import type { Style as PdfStyle } from "@react-pdf/types";
import {
  bulletGlyph,
  formatDateRange,
  marginMm,
  visibleSections,
} from "@/templates/shared";
import { NO_PHOTO_TEMPLATES } from "@/lib/design-labels";

const SIDEBAR_TYPES = new Set([
  "skills",
  "languages",
  "certifications",
  "hobbies",
  "references",
]);

const SIDEBAR_TEMPLATES = new Set(["berlin"]);
const TWO_COL_TEMPLATES = new Set(["tokyo"]);
const FULL_HEADER_TEMPLATES = new Set(["madrid"]);

// ---------- Override helpers ----------
//
// The DOM editor lets users free-drag every annotated element via
// `data.elementOverrides[id]` (`{dx, dy, rotate?}`) and free-drag whole
// sections via `section.position` + `section.rotation`. The PDF render
// MUST mirror those edits — otherwise users see their carefully-placed
// layout snap back to template defaults on export, which is exactly the
// "I moved things and the PDF doesn't show it" complaint.
//
// react-pdf's transform support is more limited than CSS but DOES handle
// `translate(...)` and `rotate(...)` strings. We compose them the same
// way `elementStyle()` / `positionStyle()` do in the DOM templates so
// edit → preview → export stays visually consistent.

/** Inline style additions that apply an element-level override (dx/dy/rotate)
 *  to a react-pdf View/Text. Returns an empty object when no override is set
 *  so call-sites can spread it unconditionally without changing the render
 *  tree's structural identity. */
function elementOverrideStyle(
  data: ResumeData,
  id: string,
): { transform?: string } {
  const o = data.elementOverrides?.[id];
  if (!o) return {};
  const dx = o.dx ?? 0;
  const dy = o.dy ?? 0;
  const rot = o.rotate ?? 0;
  const hasMove = dx !== 0 || dy !== 0;
  const hasRot = rot !== 0;
  if (!hasMove && !hasRot) return {};
  const parts: string[] = [];
  if (hasMove) parts.push(`translate(${dx}, ${dy})`);
  if (hasRot) parts.push(`rotate(${rot})`);
  return { transform: parts.join(" ") };
}

/** Same idea but for whole-section positions/rotations. Sections in the
 *  PDF always render through `<SectionBlock>` so this drops into one place
 *  there, matching the DOM `positionStyle()` helper. */
function sectionOverrideStyle(section: Section): { transform?: string } {
  const p = section.position;
  const r = section.rotation ?? 0;
  const hasPos = !!p && (p.x !== 0 || p.y !== 0);
  const hasRot = r !== 0;
  if (!hasPos && !hasRot) return {};
  const parts: string[] = [];
  if (hasPos) parts.push(`translate(${p!.x}, ${p!.y})`);
  if (hasRot) parts.push(`rotate(${r})`);
  return { transform: parts.join(" ") };
}

// ---------- Top-level Document ----------

export function ResumePdf({ data }: { data: ResumeData }) {
  const { design } = data;
  const m = marginMm(design);
  // Page itself has NO padding now. The doc-content padding moves to a
  // sibling <View>, leaving the page-level coordinate space free for
  // an absolutely-positioned custom-elements overlay whose x/y match
  // the editor's A4-sheet-edge coordinates 1:1.
  const marginPt = m * 2.83465;
  const pageStyle = StyleSheet.create({
    page: {
      backgroundColor: design.pageBg,
      color: design.textColor,
      fontFamily: "Helvetica",
      fontSize: 10 * design.fontScale,
      lineHeight: design.lineSpacing,
    },
    // Doc content lives inside a padded wrapper. flexGrow: 1 so it fills
    // the page vertically (matches the previous Page-padding behaviour).
    docPad: {
      paddingTop: marginPt,
      paddingBottom: marginPt,
      paddingLeft: marginPt,
      paddingRight: marginPt,
      flexGrow: 1,
    },
  });

  return (
    <Document>
      <Page size={mapPageSize(data.design.pageSize)} style={pageStyle.page}>
        <View style={pageStyle.docPad}>
          <Layout data={data} />
        </View>
        {/* Watermark — rendered between layout and the custom-elements
            layer so toolshelf shapes still float above it like in the
            editor. Absolutely positioned to a page corner. */}
        <PdfWatermark data={data} />
        {/* Custom elements (toolshelf shapes / icons / images / text) —
            absolutely positioned in editor-page-edge coordinates so the
            PDF reflects exactly what the user assembled in the visual
            designer. Rendered AFTER the layout so it stacks on top. */}
        <CustomElementsPdfLayer data={data} />
      </Page>
    </Document>
  );
}

/** Map our internal A4/Letter/Legal to react-pdf's accepted strings. */
function mapPageSize(s: ResumeData["design"]["pageSize"]): "A4" | "LETTER" | "LEGAL" {
  if (s === "Letter") return "LETTER";
  if (s === "Legal") return "LEGAL";
  return "A4";
}

// ---------- Layout dispatcher ----------

function Layout({ data }: { data: ResumeData }) {
  const tpl = data.meta.template;
  if (SIDEBAR_TEMPLATES.has(tpl)) return <SidebarLayout data={data} />;
  if (TWO_COL_TEMPLATES.has(tpl)) return <TwoColLayout data={data} />;
  if (FULL_HEADER_TEMPLATES.has(tpl)) return <FullHeaderLayout data={data} />;
  return <SingleLayout data={data} />;
}

// ---------- Profile photo ----------
//
// Renders `personal.photoUrl` as a circular/rounded/square/arch frame to
// match the DOM templates. Skipped when:
//   - The active template is in NO_PHOTO_TEMPLATES (text-only by design)
//   - `design.photo.enabled` is false
//   - `personal.photoUrl` is empty or a `blob:` URL (editor-temp preview
//     that react-pdf cannot resolve)
//
// Visual parity targets: Berlin's accent-outlined ring, the rounded-square
// shape variants, and the size scale defaults defined in resume-defaults.ts.
function Photo({
  data,
  size = 80,
  outlined = true,
}: {
  data: ResumeData;
  /** Edge length in PDF points. The DOM uses px / em; we convert at the
   *  call-site. Default 80 ≈ 28mm — same scale as the DOM avatars. */
  size?: number;
  /** Whether to draw the accent outline ring around the photo. Berlin
   *  uses it; minimal templates can pass false. */
  outlined?: boolean;
}) {
  const { personal, design } = data;
  if (NO_PHOTO_TEMPLATES.has(data.meta.template)) return null;
  if (!design.photo.enabled) return null;
  const url = personal.photoUrl?.trim();
  if (!url) return null;
  if (url.startsWith("blob:")) return null;
  const shape = design.photo.shape;
  const radius =
    shape === "circle"
      ? size / 2
      : shape === "rounded"
        ? Math.round(size / 4)
        : 0;
  const archRadius = shape === "arch" ? size : 0;
  return (
    <View
      style={{
        width: size,
        height: shape === "arch" ? size * 1.15 : size,
        borderRadius: archRadius || radius,
        // For arch we approximate with top-rounded only by drawing the
        // photo itself with full radius — react-pdf doesn't support
        // border-top-left-radius / etc. so this is the best we can do.
        overflow: "hidden",
        borderWidth: outlined ? 1.5 : 0,
        borderColor: outlined ? `${design.accentColor}66` : "transparent",
        borderStyle: "solid",
        ...elementOverrideStyle(data, "personal.photo"),
      }}
    >
      <PdfImage
        src={url}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </View>
  );
}

// ---------- Watermark ----------
//
// Mirror the DOM `<Watermark>` — oversized branding text in one of the
// four corners, low-opacity, accent-tinted. Honours `design.watermarkText`
// + `design.watermarkPosition` and applies the user's drag offset via
// `elementOverrides["design.watermark"]` so a watermark dragged in the
// editor lands at the same spot in the exported PDF.
function PdfWatermark({ data }: { data: ResumeData }) {
  const { design } = data;
  const text = (design.watermarkText ?? "").trim();
  const pos = design.watermarkPosition ?? "off";
  if (!text || pos === "off") return null;
  const color =
    (design.watermarkColor ?? "").trim() || design.accentColor;
  const corner: PdfStyle =
    pos === "bottom-left"
      ? { left: 12, bottom: 12 }
      : pos === "bottom-right"
        ? { right: 12, bottom: 12 }
        : pos === "top-left"
          ? { left: 12, top: 12 }
          : { right: 12, top: 12 };
  return (
    <Text
      style={{
        position: "absolute",
        ...corner,
        color,
        fontSize: 56,
        fontWeight: 800,
        opacity: 0.85,
        letterSpacing: 1.5,
        ...elementOverrideStyle(data, "design.watermark"),
      }}
    >
      {text}
    </Text>
  );
}

// ---------- Header ----------

function Header({ data, dense = false }: { data: ResumeData; dense?: boolean }) {
  const { personal, design } = data;
  return (
    <View style={{ marginBottom: dense ? 8 : 14 }}>
      <Text
        style={{
          fontSize: 20 * design.fontScale,
          fontWeight: 700,
        }}
      >
        {personal.fullName || "Your name"}
      </Text>
      {personal.headline && (
        <Text
          style={{
            color: design.accentColor,
            fontSize: 11 * design.fontScale,
            marginTop: 2,
          }}
        >
          {personal.headline}
        </Text>
      )}
      <ContactRow data={data} />
    </View>
  );
}

function ContactRow({ data }: { data: ResumeData }) {
  const { personal, design } = data;
  const parts: string[] = [];
  if (personal.email) parts.push(personal.email);
  if (personal.phone) parts.push(personal.phone);
  if (personal.location) parts.push(personal.location);
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: 4,
        gap: 6,
      }}
    >
      {parts.map((p, i) => (
        <Text key={i} style={{ fontSize: 9 * design.fontScale, color: "#666" }}>
          {p}
        </Text>
      ))}
      {personal.links.map((l) => (
        <PdfLink
          key={l.id}
          src={normalizeHref(l.url)}
          style={{
            fontSize: 9 * design.fontScale,
            color: design.accentColor,
            textDecoration: "none",
          }}
        >
          {l.label || l.url}
        </PdfLink>
      ))}
    </View>
  );
}

// ---------- Layouts ----------

function SingleLayout({ data }: { data: ResumeData }) {
  const visible = visibleSections(data);
  const showHeader = data.meta.template !== "madrid";
  return (
    <View>
      {showHeader && <Header data={data} />}
      {visible.map((s) => (
        <SectionBlock key={s.id} section={s} design={data.design} />
      ))}
    </View>
  );
}

function FullHeaderLayout({ data }: { data: ResumeData }) {
  const visible = visibleSections(data);
  const { design, personal } = data;
  return (
    <View>
      <View
        style={{
          backgroundColor: design.accentColor,
          marginLeft: -marginMm(design) * 2.83465,
          marginRight: -marginMm(design) * 2.83465,
          marginTop: -marginMm(design) * 2.83465,
          paddingTop: 18,
          paddingBottom: 14,
          paddingLeft: marginMm(design) * 2.83465,
          paddingRight: marginMm(design) * 2.83465,
          marginBottom: 14,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: 700 }}>
          {personal.fullName || "Your name"}
        </Text>
        {personal.headline && (
          <Text style={{ color: "#ffffff", opacity: 0.9, marginTop: 2 }}>
            {personal.headline}
          </Text>
        )}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: 6,
            gap: 8,
          }}
        >
          {personal.email ? (
            <Text style={{ color: "#ffffff", opacity: 0.9, fontSize: 9 }}>
              {personal.email}
            </Text>
          ) : null}
          {personal.phone ? (
            <Text style={{ color: "#ffffff", opacity: 0.9, fontSize: 9 }}>
              {personal.phone}
            </Text>
          ) : null}
          {personal.location ? (
            <Text style={{ color: "#ffffff", opacity: 0.9, fontSize: 9 }}>
              {personal.location}
            </Text>
          ) : null}
          {personal.links.map((l) => (
            <Text
              key={l.id}
              style={{ color: "#ffffff", opacity: 0.9, fontSize: 9 }}
            >
              {l.label || l.url}
            </Text>
          ))}
        </View>
      </View>
      {visible.map((s) => (
        <SectionBlock key={s.id} section={s} design={design} />
      ))}
    </View>
  );
}

function SidebarLayout({ data }: { data: ResumeData }) {
  const visible = visibleSections(data);
  const sidebar = visible.filter((s) => SIDEBAR_TYPES.has(s.type));
  const main = visible.filter((s) => !SIDEBAR_TYPES.has(s.type));
  const { design, personal } = data;
  const sidebarPct = Math.round(design.sidebarWidth * 100);

  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View
        style={{
          width: `${sidebarPct}%`,
          backgroundColor: `${design.accentColor}11`,
          padding: 8,
          borderLeft: `2 solid ${design.accentColor}`,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: 700 }}>
          {personal.fullName || "Your name"}
        </Text>
        {personal.headline && (
          <Text
            style={{
              color: design.accentColor,
              fontSize: 10,
              marginTop: 2,
              marginBottom: 4,
            }}
          >
            {personal.headline}
          </Text>
        )}
        {personal.email && (
          <Text style={{ fontSize: 9, color: "#444", marginTop: 1 }}>
            {personal.email}
          </Text>
        )}
        {personal.phone && (
          <Text style={{ fontSize: 9, color: "#444", marginTop: 1 }}>
            {personal.phone}
          </Text>
        )}
        {personal.location && (
          <Text style={{ fontSize: 9, color: "#444", marginTop: 1 }}>
            {personal.location}
          </Text>
        )}
        {personal.links.map((l) => (
          <PdfLink
            key={l.id}
            src={normalizeHref(l.url)}
            style={{
              fontSize: 9,
              color: design.accentColor,
              textDecoration: "none",
              marginTop: 1,
            }}
          >
            {l.label || l.url}
          </PdfLink>
        ))}
        <View style={{ marginTop: 8 }}>
          {sidebar.map((s) => (
            <View key={s.id} style={{ marginBottom: 8 }}>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: design.accentColor,
                  textTransform: "uppercase",
                  marginBottom: 3,
                  letterSpacing: 0.6,
                }}
              >
                {s.title}
              </Text>
              <SectionBody section={s} design={design} compact />
            </View>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {main.map((s) => (
          <SectionBlock key={s.id} section={s} design={design} />
        ))}
      </View>
    </View>
  );
}

function TwoColLayout({ data }: { data: ResumeData }) {
  const visible = visibleSections(data);
  const left: Section[] = [];
  const right: Section[] = [];
  visible.forEach((s, i) => (i % 2 === 0 ? left : right).push(s));
  return (
    <View>
      <Header data={data} />
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 1 }}>
          {left.map((s) => (
            <SectionBlock key={s.id} section={s} design={data.design} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {right.map((s) => (
            <SectionBlock key={s.id} section={s} design={data.design} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------- Section block ----------

function SectionBlock({
  section,
  design,
}: {
  section: Section;
  design: GlobalDesign;
}) {
  return (
    <View style={{ marginBottom: 10 }} wrap={false}>
      <Text
        style={{
          fontSize: 10 * design.fontScale,
          fontWeight: 700,
          color: design.accentColor,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {section.title}
      </Text>
      {design.dividerStyle !== "none" && (
        <View
          style={{
            height: 0.6,
            backgroundColor: `${design.accentColor}55`,
            marginBottom: 4,
          }}
        />
      )}
      <SectionBody section={section} design={design} />
    </View>
  );
}

function SectionBody({
  section,
  design,
  compact = false,
}: {
  section: Section;
  design: GlobalDesign;
  compact?: boolean;
}) {
  switch (section.type) {
    case "summary":
      return <SummaryPdf section={section} />;
    case "experience":
      return <ExperiencePdf section={section} design={design} />;
    case "education":
      return <EducationPdf section={section} design={design} />;
    case "skills":
      return <SkillsPdf section={section} design={design} compact={compact} />;
    case "languages":
      return <LanguagesPdf section={section} design={design} />;
    case "projects":
      return <ProjectsPdf section={section} design={design} />;
    case "certifications":
      return <CertificationsPdf section={section} design={design} />;
    case "awards":
      return <AwardsPdf section={section} design={design} />;
    case "publications":
      return <PublicationsPdf section={section} design={design} />;
    case "volunteer":
      return <VolunteerPdf section={section} design={design} />;
    case "talks":
      return <TalksPdf section={section} design={design} />;
    case "hobbies":
      return <HobbiesPdf section={section} />;
    case "references":
      return <ReferencesPdf section={section} />;
    case "custom":
      return <CustomPdf section={section} design={design} />;
  }
}

// ---------- Section bodies ----------

function SummaryPdf({ section }: { section: SummarySection }) {
  if (!section.body.trim()) return null;
  return <Text>{section.body}</Text>;
}

function Bullets({
  bullets,
  design,
}: {
  bullets: { id: string; text: string; visible: boolean }[];
  design: GlobalDesign;
}) {
  const visible = bullets.filter((b) => b.visible && b.text.trim().length > 0);
  if (visible.length === 0) return null;
  const glyph = bulletGlyph(design);
  return (
    <View style={{ marginTop: 2 }}>
      {visible.map((b) => (
        <View
          key={b.id}
          style={{ flexDirection: "row", marginTop: 2, gap: 4 }}
        >
          {glyph ? (
            <Text style={{ color: design.accentColor }}>{glyph}</Text>
          ) : null}
          <Text style={{ flex: 1 }}>{b.text}</Text>
        </View>
      ))}
    </View>
  );
}

function ExperiencePdf({
  section,
  design,
}: {
  section: ExperienceSection;
  design: GlobalDesign;
}) {
  return (
    <View>
      {section.items
        .filter((i) => i.visible)
        .map((it) => (
          <View key={it.id} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: 700 }}>
                {it.role}
                {it.company ? `, ${it.company}` : ""}
              </Text>
              <Text style={{ fontSize: 9, color: "#666" }}>
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </Text>
            </View>
            {it.location ? (
              <Text style={{ fontSize: 9, color: "#666" }}>{it.location}</Text>
            ) : null}
            <Bullets bullets={it.bullets} design={design} />
          </View>
        ))}
    </View>
  );
}

function EducationPdf({
  section,
  design,
}: {
  section: EducationSection;
  design: GlobalDesign;
}) {
  return (
    <View>
      {section.items
        .filter((i) => i.visible)
        .map((it) => (
          <View key={it.id} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: 700 }}>
                {it.degree}
                {it.field ? `, ${it.field}` : ""}
              </Text>
              <Text style={{ fontSize: 9, color: "#666" }}>
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </Text>
            </View>
            <Text style={{ fontSize: 10 }}>
              {it.institution}
              {it.location ? ` · ${it.location}` : ""}
              {it.gpa ? ` · GPA ${it.gpa}` : ""}
            </Text>
            <Bullets bullets={it.bullets} design={design} />
          </View>
        ))}
    </View>
  );
}

function SkillsPdf({
  section,
  design,
  compact,
}: {
  section: SkillsSection;
  design: GlobalDesign;
  compact?: boolean;
}) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return null;
  // In compact mode, render as comma-separated list (sidebar usage).
  if (compact || design.skillBarStyle === "text-only") {
    return <Text>{items.map((s) => s.name).join(" · ")}</Text>;
  }
  if (design.skillBarStyle === "pills") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {items.map((s) => (
          <Text
            key={s.id}
            style={{
              backgroundColor: `${design.accentColor}22`,
              color: design.accentColor,
              fontSize: 8,
              paddingTop: 1,
              paddingBottom: 1,
              paddingLeft: 4,
              paddingRight: 4,
              borderRadius: 4,
            }}
          >
            {s.name}
          </Text>
        ))}
      </View>
    );
  }
  return (
    <View>
      {items.map((s) => (
        <View
          key={s.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 1,
          }}
        >
          <Text>{s.name}</Text>
          {s.level > 0 && (
            <View style={{ flexDirection: "row", gap: 1 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 6,
                    height: 4,
                    backgroundColor:
                      i < s.level ? design.accentColor : "#e5e5e5",
                    borderRadius: 1,
                    marginTop: 4,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function LanguagesPdf({
  section,
  design,
}: {
  section: LanguagesSection;
  design: GlobalDesign;
}) {
  const items = section.items.filter((i) => i.visible);
  if (items.length === 0) return null;
  return (
    <View>
      {items.map((l) => (
        <View
          key={l.id}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 1,
          }}
        >
          <Text>{l.name}</Text>
          <Text style={{ color: design.accentColor, fontSize: 9 }}>
            {l.proficiency}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProjectsPdf({
  section,
  design,
}: {
  section: ProjectsSection;
  design: GlobalDesign;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <View>
      {items.map((it) => (
        <View key={it.id} style={{ marginTop: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 700 }}>
              {it.url ? (
                <PdfLink
                  src={normalizeHref(it.url)}
                  style={{ color: design.accentColor }}
                >
                  {it.name}
                </PdfLink>
              ) : (
                it.name
              )}
              {it.role ? ` · ${it.role}` : ""}
            </Text>
            <Text style={{ fontSize: 9, color: "#666" }}>
              {formatDateRange(
                it.startDate,
                it.endDate,
                it.current,
                design.dateFormat,
              )}
            </Text>
          </View>
          {it.techStack ? (
            <Text style={{ fontSize: 9, color: "#666" }}>{it.techStack}</Text>
          ) : null}
          <Bullets bullets={it.bullets} design={design} />
        </View>
      ))}
    </View>
  );
}

function CertificationsPdf({
  section,
  design,
}: {
  section: CertificationsSection;
  design: GlobalDesign;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <View>
      {items.map((c) => (
        <View key={c.id} style={{ marginTop: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 700 }}>{c.name}</Text>
            <Text style={{ fontSize: 9, color: "#666" }}>
              {c.date}
              {c.expiry ? ` – ${c.expiry}` : ""}
            </Text>
          </View>
          {c.issuer ? <Text style={{ fontSize: 9 }}>{c.issuer}</Text> : null}
          {c.url ? (
            <PdfLink
              src={normalizeHref(c.url)}
              style={{ color: design.accentColor, fontSize: 8 }}
            >
              Verify
            </PdfLink>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function AwardsPdf({
  section,
  design,
}: {
  section: AwardsSection;
  design: GlobalDesign;
}) {
  void design;
  const items = section.items.filter((i) => i.visible);
  return (
    <View>
      {items.map((a) => (
        <View key={a.id} style={{ marginTop: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 700 }}>
              {a.name}
              {a.issuer ? ` · ${a.issuer}` : ""}
            </Text>
            {a.date ? (
              <Text style={{ fontSize: 9, color: "#666" }}>{a.date}</Text>
            ) : null}
          </View>
          {a.description ? <Text style={{ fontSize: 10 }}>{a.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function PublicationsPdf({
  section,
  design,
}: {
  section: PublicationsSection;
  design: GlobalDesign;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <View>
      {items.map((p) => (
        <View key={p.id} style={{ marginTop: 3 }}>
          <Text>
            <Text style={{ fontWeight: 700 }}>{p.title}</Text>
            {p.authors ? ` — ${p.authors}` : ""}
            {p.venue ? `. ${p.venue}` : ""}
            {p.date ? ` (${p.date})` : ""}
          </Text>
          {p.url ? (
            <PdfLink
              src={normalizeHref(p.url)}
              style={{ color: design.accentColor, fontSize: 9 }}
            >
              {p.url}
            </PdfLink>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function VolunteerPdf({
  section,
  design,
}: {
  section: VolunteerSection;
  design: GlobalDesign;
}) {
  return (
    <View>
      {section.items
        .filter((i) => i.visible)
        .map((it) => (
          <View key={it.id} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: 700 }}>
                {it.role}
                {it.organization ? `, ${it.organization}` : ""}
              </Text>
              <Text style={{ fontSize: 9, color: "#666" }}>
                {formatDateRange(
                  it.startDate,
                  it.endDate,
                  it.current,
                  design.dateFormat,
                )}
              </Text>
            </View>
            {it.location ? (
              <Text style={{ fontSize: 9, color: "#666" }}>{it.location}</Text>
            ) : null}
            <Bullets bullets={it.bullets} design={design} />
          </View>
        ))}
    </View>
  );
}

function TalksPdf({
  section,
  design,
}: {
  section: TalksSection;
  design: GlobalDesign;
}) {
  const items = section.items.filter((i) => i.visible);
  return (
    <View>
      {items.map((t) => (
        <View key={t.id} style={{ marginTop: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 700 }}>
              {t.url ? (
                <PdfLink
                  src={normalizeHref(t.url)}
                  style={{ color: design.accentColor }}
                >
                  {t.title}
                </PdfLink>
              ) : (
                t.title
              )}
              {t.venue ? ` · ${t.venue}` : ""}
            </Text>
            {t.date ? (
              <Text style={{ fontSize: 9, color: "#666" }}>{t.date}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function HobbiesPdf({ section }: { section: HobbiesSection }) {
  const items = section.items.filter((i) => i.visible && i.text.trim());
  if (items.length === 0) return null;
  return <Text>{items.map((h) => h.text).join(" · ")}</Text>;
}

function ReferencesPdf({ section }: { section: ReferencesSection }) {
  if (section.onRequest)
    return <Text style={{ fontStyle: "italic" }}>References available on request.</Text>;
  const items = section.items.filter((i) => i.visible);
  return (
    <View>
      {items.map((r) => (
        <View key={r.id} style={{ marginTop: 3 }}>
          <Text style={{ fontWeight: 700 }}>{r.name}</Text>
          <Text style={{ fontSize: 10 }}>
            {r.role}
            {r.company ? ` · ${r.company}` : ""}
          </Text>
          <Text style={{ fontSize: 9, color: "#666" }}>
            {r.email}
            {r.email && r.phone ? " · " : ""}
            {r.phone}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CustomPdf({
  section,
  design,
}: {
  section: CustomSection;
  design: GlobalDesign;
}) {
  return (
    <View>
      {section.body ? <Text>{section.body}</Text> : null}
      {section.items.length > 0 && <Bullets bullets={section.items} design={design} />}
    </View>
  );
}

// ---------- helpers ----------

function normalizeHref(s: string): string {
  const t = (s || "").trim();
  if (!t) return "#";
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return t;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return "#";
}

// ===========================================================================
// Custom-elements PDF layer
// ---------------------------------------------------------------------------
//
// The toolshelf lets users drop free-form shapes / icons / text / images /
// social-icons onto the canvas at absolute (x, y) page coordinates. The
// editor preview renders them via `templates/custom-elements-layer.tsx`.
//
// PIXEL-PERFECT export contract:
//   - Editor canvas uses CSS pixels at 96 DPI; an A4 page is 794×1123 px.
//   - PDF uses points at 72 DPI; an A4 page is 595×842 pt.
//   - Conversion: pt = px × 72/96 = px × 0.75 (exact).
// Multiplying every x/y/w/h by 0.75 lands each element at precisely the
// same visual position the user dragged it to in the editor.
//
// react-pdf semantics worth remembering:
//   - Yoga (the layout engine) supports `position: 'absolute'` with
//     `left/top/width/height` and uses the nearest positioned ancestor as
//     the offset origin. We make the <Page> the positioning ancestor so
//     custom elements are positioned relative to the A4 page edge — same
//     as the editor's `customElements[].x/y` semantics.
//   - SVG paths render via <Svg viewBox=... ><Path d=.../></Svg>. The
//     <Svg> sizes itself to its parent's width/height; the path scales
//     with the viewBox. Same paths the editor uses on the canvas — what
//     you see is what you export.
//   - <Link src=...>...</Link> wraps any child in a clickable annotation.
//     Used for IconElement.url and ImageElement.linkUrl.
//   - Rotation: `transform: 'rotate(<deg>deg)'` works on Views, with
//     transformOrigin defaulting to top-left. We override to "center
//     center" so the element rotates around its centre — matches the
//     editor's CSS `transformOrigin: center center`.

const PT_PER_PX = 0.75;

function CustomElementsPdfLayer({ data }: { data: ResumeData }) {
  const items = (data.customElements ?? [])
    .filter((e) => e.visible !== false)
    // Sort ascending by z so DOM order matches stack order — react-pdf,
    // like the browser, paints later elements on top of earlier ones.
    .sort((a, b) => a.z - b.z);
  if (items.length === 0) return null;
  return (
    <View
      // Full-page absolute overlay. The Page is the positioning context;
      // 0/0/0/0 makes this view fill exactly the page rect. Children
      // with their own absolute position are placed relative to this
      // overlay's top-left, which equals the page top-left (matches
      // the editor's `el.x/el.y` are page-edge coords).
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {items.map((el) => (
        <PdfCustomElement key={el.id} el={el} />
      ))}
    </View>
  );
}

function PdfCustomElement({ el }: { el: CustomElement }) {
  // Rotation transform string. Empty string means no transform — applied
  // to every kind below so wrapper styling stays consistent.
  const rotateXfm = el.rotate ? `rotate(${el.rotate}deg)` : undefined;
  const baseStyle = {
    position: "absolute" as const,
    left: el.x * PT_PER_PX,
    top: el.y * PT_PER_PX,
    width: el.w * PT_PER_PX,
    height: el.h * PT_PER_PX,
    opacity: el.opacity ?? 1,
    transform: rotateXfm,
    // Match the editor's `transformOrigin: center center`. react-pdf
    // accepts the same CSS string syntax.
    transformOrigin: "center center",
  };

  switch (el.kind) {
    case "rect":
      return (
        <View
          style={{
            ...baseStyle,
            backgroundColor: el.fill,
            borderRadius: el.radius ?? 0,
            borderWidth: el.strokeWidth ?? 0,
            borderColor: el.stroke ?? "transparent",
          }}
        />
      );
    case "ellipse":
      return (
        <View
          style={{
            ...baseStyle,
            backgroundColor: el.fill,
            // 9999 forces a fully-rounded shape regardless of dimensions —
            // an ellipse becomes a true ellipse, a square becomes a circle.
            borderRadius: 9999,
            borderWidth: el.strokeWidth ?? 0,
            borderColor: el.stroke ?? "transparent",
          }}
        />
      );
    case "line":
      return <PdfLineElement el={el} baseStyle={baseStyle} />;
    case "text":
      return <PdfTextElement el={el} baseStyle={baseStyle} />;
    case "image":
      return <PdfImageElement el={el} baseStyle={baseStyle} />;
    case "icon":
      return <PdfIconElement el={el} baseStyle={baseStyle} />;
    // Polygon-family — all share an SVG path render. The path strings
    // are duplicated from `templates/custom-elements-layer.tsx` so the
    // PDF stays self-contained (no editor-runtime imports).
    case "triangle":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path="M 50 0 L 100 100 L 0 100 Z"
        />
      );
    case "star":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path={starPath()}
        />
      );
    case "hexagon":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path={hexagonPath()}
        />
      );
    case "octagon":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path={octagonPath()}
        />
      );
    case "diamond":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path="M 50 0 L 100 50 L 50 100 L 0 50 Z"
        />
      );
    case "heart":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 95"
          path="M 50 15 C 30 -5, -5 5, 5 35 C 12 60, 30 75, 50 92 C 70 75, 88 60, 95 35 C 105 5, 70 -5, 50 15 Z"
        />
      );
    case "cross":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path="M 35 0 L 65 0 L 65 35 L 100 35 L 100 65 L 65 65 L 65 100 L 35 100 L 35 65 L 0 65 L 0 35 L 35 35 Z"
        />
      );
    case "sparkle":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 100 100"
          path="M 50 0 L 56 44 L 100 50 L 56 56 L 50 100 L 44 56 L 0 50 L 44 44 Z"
        />
      );
    case "arrow":
      return (
        <PdfShape
          baseStyle={baseStyle}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          viewBox="0 0 200 100"
          path="M 0 35 L 130 35 L 130 10 L 200 50 L 130 90 L 130 65 L 0 65 Z"
        />
      );
  }
}

/** Render a line element. Editor draws a horizontal line via `border-top`
 *  inside the wrapper; in PDF we just paint a filled View at the
 *  configured thickness. Position is the wrapper's mid-Y so the visible
 *  line lands at the same baseline the editor renders it at. */
function PdfLineElement({
  el,
  baseStyle,
}: {
  el: LineElement;
  baseStyle: PdfStyle;
}) {
  // Centred within the wrapper's height — same as the editor's
  // `marginTop: (el.h - el.thickness) / 2` rule.
  const thickPt = el.thickness * PT_PER_PX;
  const heightPt = el.h * PT_PER_PX;
  const offset = (heightPt - thickPt) / 2;
  return (
    <View style={{ ...baseStyle }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: offset,
          height: thickPt,
          backgroundColor: el.color,
        }}
      />
    </View>
  );
}

/** Render a text element. Wraps inside the wrapper's box (paragraph
 *  semantics — react-pdf doesn't support CSS `white-space: nowrap`
 *  cleanly, so single-line headings just render at one line if the
 *  user sized the box wide enough, else they wrap). Font props mirror
 *  the editor's TextElement. */
function PdfTextElement({
  el,
  baseStyle,
}: {
  el: TextElement;
  baseStyle: PdfStyle;
}) {
  return (
    <View style={baseStyle}>
      <Text
        style={{
          color: el.color,
          fontSize: el.fontSize * PT_PER_PX,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily ?? "Helvetica",
          textAlign: el.align ?? "left",
          fontStyle: el.italic ? "italic" : "normal",
          textDecoration: el.underline ? "underline" : "none",
        }}
      >
        {el.text}
      </Text>
    </View>
  );
}

/** Render an image element. Empty url → skip render entirely (the
 *  editor's striped placeholder is editor-only chrome; in the exported
 *  PDF an empty box would just look broken). When `linkUrl` is set,
 *  wrap the image in a clickable PdfLink. The wrapper View carries the
 *  position/rotation; the inner PdfImage fills it. */
function PdfImageElement({
  el,
  baseStyle,
}: {
  el: ImageElement;
  baseStyle: PdfStyle;
}) {
  if (!el.url) return null;
  // react-pdf's Image cannot consume blob: URLs reliably — they're
  // editor-temporary previews. Skip them; the user's persistent
  // Supabase URL replaces the blob within seconds of upload.
  if (el.url.startsWith("blob:")) return null;
  const inner = (
    <PdfImage
      src={el.url}
      style={{
        width: "100%",
        height: "100%",
        // react-pdf accepts the same objectFit values as CSS for
        // most cases. "fill" is the default; "cover" / "contain"
        // map directly.
        objectFit: el.fit ?? "cover",
        borderRadius: el.radius ?? 0,
      }}
    />
  );
  if (el.linkUrl && el.linkUrl.trim()) {
    return (
      <View style={baseStyle}>
        <PdfLink src={normalizeHref(el.linkUrl)} style={{ textDecoration: "none" }}>
          {inner}
        </PdfLink>
      </View>
    );
  }
  return <View style={baseStyle}>{inner}</View>;
}

/** Render a brand-glyph icon element. Looks up the SVG path in the
 *  social-icons registry, draws it via react-pdf's <Svg>/<Path>, and
 *  wraps in a clickable PdfLink when `url` is set. The fill colour
 *  comes from `el.color` so users who recoloured the icon in the
 *  inspector get the same recolouring in the PDF. */
function PdfIconElement({
  el,
  baseStyle,
}: {
  el: IconElement;
  baseStyle: PdfStyle;
}) {
  if (!isSocialIconName(el.iconName)) return null;
  const def = SOCIAL_ICONS_BY_NAME[el.iconName];
  // The viewBox string in the registry is "0 0 24 24" (Simple-Icons
  // standard); react-pdf's <Svg> takes width/height plus a viewBox
  // attr. Filling the wrapper completely so the icon scales with the
  // user's resize.
  const inner = (
    <Svg
      width="100%"
      height="100%"
      viewBox={def.viewBox}
    >
      <Path d={def.path} fill={el.color} />
    </Svg>
  );
  if (el.url && el.url.trim()) {
    return (
      <View style={baseStyle}>
        <PdfLink src={normalizeHref(el.url)} style={{ textDecoration: "none" }}>
          {inner}
        </PdfLink>
      </View>
    );
  }
  return <View style={baseStyle}>{inner}</View>;
}

/** Generic SVG-path shape wrapper. Used for triangle / star / hexagon /
 *  octagon / diamond / heart / cross / sparkle / arrow — all of which
 *  share the same fill+stroke schema and only differ by their path
 *  string. Keeping the path data inline (vs importing from the editor
 *  module) so this PDF module stays free of editor-runtime imports
 *  and can be lazy-loaded without dragging the editor bundle in. */
function PdfShape({
  baseStyle,
  fill,
  stroke,
  strokeWidth,
  viewBox,
  path,
}: {
  baseStyle: PdfStyle;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  viewBox: string;
  path: string;
}) {
  return (
    <View style={baseStyle}>
      <Svg width="100%" height="100%" viewBox={viewBox}>
        <Path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth ?? 0}
        />
      </Svg>
    </View>
  );
}

/** Star path — duplicated from custom-elements-layer.tsx so this file
 *  stays self-contained. Five-point star with outer radius 48 / inner 22
 *  on a 100×100 viewBox. */
function starPath(): string {
  const cx = 50,
    cy = 50,
    R = 48,
    r = 22;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? R : r;
    pts.push(`${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function hexagonPath(): string {
  const cx = 50,
    cy = 50,
    R = 48;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${cx + R * Math.cos(angle)} ${cy + R * Math.sin(angle)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function octagonPath(): string {
  const cx = 50,
    cy = 50,
    R = 48;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    pts.push(`${cx + R * Math.cos(angle)} ${cy + R * Math.sin(angle)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}
