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
  Page,
  StyleSheet,
  Text,
  View,
  Link as PdfLink,
} from "@react-pdf/renderer";
import type {
  AwardsSection,
  CertificationsSection,
  CustomSection,
  EducationSection,
  ExperienceSection,
  GlobalDesign,
  HobbiesSection,
  LanguagesSection,
  ProjectsSection,
  PublicationsSection,
  ReferencesSection,
  ResumeData,
  Section,
  SkillsSection,
  SummarySection,
  TalksSection,
  VolunteerSection,
} from "@/types/resume";
import {
  bulletGlyph,
  formatDateRange,
  marginMm,
  visibleSections,
} from "@/templates/shared";

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

// ---------- Top-level Document ----------

export function ResumePdf({ data }: { data: ResumeData }) {
  const { design } = data;
  const m = marginMm(design);
  const pageStyle = StyleSheet.create({
    page: {
      backgroundColor: design.pageBg,
      color: design.textColor,
      fontFamily: "Helvetica",
      // react-pdf uses points; A4 default is 595x842pt. Margins given in mm
      // are converted to pt (1mm = 2.83465pt).
      paddingTop: m * 2.83465,
      paddingBottom: m * 2.83465,
      paddingLeft: m * 2.83465,
      paddingRight: m * 2.83465,
      fontSize: 10 * design.fontScale,
      lineHeight: design.lineSpacing,
    },
  });

  return (
    <Document>
      <Page size={mapPageSize(data.design.pageSize)} style={pageStyle.page}>
        <Layout data={data} />
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
