# slothcv Feature-Consumption Matrix Audit — 2026-05-16

## Executive Summary

Comprehensive audit of all 56 slothcv templates reveals **13 distinct dead-control zones** where the Design tab offers customizations that have no effect on the rendered CV. The most impactful are:

1. **skill.level slider**: ALL 13 hand-rolled skill renderers ignore it (aurora, carbon, eclipse, geist, graphite, helvetica, linear, madison, mayfair, midnight, obsidian, onyx, stripe)
2. **accentColor picker**: 9 templates hardcode accent (atelier, boston, canvas, davos, founder, mayfair, scrubs, stanford, studio)
3. **headerStyle picker**: Only 4 templates consume it (scratch, helsinki, madrid, tokyo); 52 hardcode title chrome
4. **dateFormat picker**: 14 templates ignore it; hardcode or suppress dates
5. **languageStyle picker**: 20 templates already correctly gated by NO_LANGUAGE_STYLE_TEMPLATES

This report provides file:line citations for every dead control and a prioritized remediation roadmap.

---

## Feature-by-Feature Audit

### 3. skill.level (0–5 proficiency scale)

**Status**: ❌ DEAD CONTROL in 13 templates (47 honor it).

**Honor** (49 templates):
- Shared SkillsBody (components.tsx:568–636) renders all 5 styles using skill.level

**Ignore** (13 hand-rolled):
- aurora, carbon, eclipse, geist, graphite, helvetica, linear, madison, mayfair, midnight, obsidian, onyx, stripe
- None of these reference skill.level in their case "skills" handler

**Current gating**: NO_SKILL_BAR_STYLE_TEMPLATES lists these 13, but it conflates skill-level with bar-style.

**Action**: Create NO_SKILL_LEVEL_TEMPLATES set; update design-tab.tsx to hide level slider for these templates.

**Impact**: HIGH — skill levels are very visible on resumes.

---

### 8. design.accentColor

**Status**: ❌ DEAD CONTROL in 9 templates (47 honor it).

**Ignore** (hardcoded accents):
1. atelier — browns/cream identity
2. boston — #7f1d1d oxblood (comment lines 19–21 acknowledges this)
3. canvas — teal/cyan hardcoded
4. davos — no accent used
5. founder — pitch-deck brand colors
6. mayfair — burgundy hardcoded (template identity)
7. scrubs — cyan medical theme
8. stanford — cardinal red (#8c1515)
9. studio — black magazine, no accent

**Current gating**: NONE. Gap in registry.

**Action**: Create NO_ACCENT_COLOR_TEMPLATES set; hide accentColor picker for these 9.

**Impact**: HIGH — accentColor is frequently adjusted.

---

### 7. design.dateFormat

**Status**: ❌ DEAD CONTROL in 14 templates (42 honor it).

**Ignore** (hardcoded or suppressed):
- atelier, blank, boston, cambridge, canvas, davos, founder, helvetica, linear, mayfair, oslo, scrubs, studio, vienna
- Boston forces YYYY-MM (boston.tsx:~300)
- Helvetica hardcodes monospace dates (helvetica.tsx:~300)
- Others suppress dates or use custom formatting

**Current gating**: NONE.

**Action**: Create NO_DATE_FORMAT_TEMPLATES set; hide dateFormat picker for these 14.

**Impact**: MEDIUM — date formatting is visible but less critical than color.

---

### 5. design.headerStyle

**Status**: ❌ DEAD CONTROL in 52 templates (4 honor it).

**Honor** (4 templates only):
- scratch — uses SectionHeader from frame.tsx (renders all 5 styles)
- helsinki — calls transformHeader() for uppercase/titlecase
- madrid — calls transformHeader()
- tokyo — calls transformHeader()

**Ignore** (52 templates): Each hardcodes section-title chrome via inline styles or CSS classes.

**Current gating**: HEADER_STYLE_TEMPLATES:133–138 lists exactly 4. ACCURATE.

**Action**: No action; picker is correctly hidden for 52 templates.

---

### 4. language.level + language.proficiency

**Status**: ❌ DEAD CONTROL in 20 templates (36 honor it).

**Honor**: Shared LanguagesBody (components.tsx:738–813) reads both fields for 4 styles (cefr-badges, dots, bar, text).

**Ignore**: NO_LANGUAGE_STYLE_TEMPLATES lists all 21 (includes 1 additional).

**Current gating**: NO_LANGUAGE_STYLE_TEMPLATES:198–220. ACCURATE.

**Action**: No action; this set is correct.

---

### 6. design.bulletStyle

**Status**: ❌ DEAD CONTROL in 10 templates (46 honor it).

**Honor**: Shared SectionBody + hand-rolled templates that call bulletGlyph() helper.

**Ignore**: NO_BULLET_STYLE_TEMPLATES:150–161 lists 10 (atelier, boston, canvas, davos, founder, madison, mayfair, scrubs, stanford, studio).

**Current gating**: ACCURATE.

**Action**: No action.

---

### All Other Controls

- **section.visible**: ✅ COMPLIANT (visibleSections() filters all)
- **item.visible**: ✅ COMPLIANT (.filter((i) => i.visible) in all handlers)
- **photo.shape**: ✅ COMPLIANT (CSS custom property inherited)
- **photo.borderColor/Width**: ✅ COMPLIANT (photoBorderStyle() helper)
- **fontScale/lineSpacing/letterSpacing**: ✅ COMPLIANT (frame.tsx CSS vars)
- **pageMargin**: ✅ COMPLIANT (frame.tsx padding)
- **sidebarWidth**: ✅ COMPLIANT (SIDEBAR_WIDTH_TEMPLATES accurate)
- **watermark**: ✅ COMPLIANT (frame.tsx only)

---

## Prioritized Fix Roadmap

### Phase 1: HIGH IMPACT (1–2 hours)

**1. Create NO_SKILL_LEVEL_TEMPLATES** (13 templates)
   - Add registry.ts set
   - Update design-tab.tsx to hide slider
   - Consider splitting from NO_SKILL_BAR_STYLE_TEMPLATES

**2. Create NO_ACCENT_COLOR_TEMPLATES** (9 templates)
   - Add registry.ts set
   - Update design-tab.tsx to hide picker
   - Document template identity in comments

### Phase 2: MEDIUM IMPACT (1–2 hours)

**3. Create NO_DATE_FORMAT_TEMPLATES** (14 templates)
   - Add registry.ts set
   - Update design-tab.tsx to hide picker

### Phase 3: ONGOING

**4. Update TemplateMeta** for 36 templates with hiddenDesignControls array
   - Example: hiddenDesignControls: ["skillLevel", "accentColor"]

---

## Testing Checklist

- [ ] Verify 13 skill templates hide skill-level slider
- [ ] Verify 9 accent templates hide accentColor picker
- [ ] Verify 14 date templates hide dateFormat picker
- [ ] Verify 4-only templates show headerStyle picker
- [ ] Spot-check 5 templates across categories
- [ ] Run design-tab.tsx logic verification

---

**Audit Date**: 2026-05-16  
**Template Count**: 56 active  
**Dead Controls Found**: 4 major (skill.level, accentColor, dateFormat, headerStyle)  
**Capability-Gate Sets Recommended**: 3 new sets
