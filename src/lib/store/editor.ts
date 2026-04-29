/**
 * Editor store — the in-memory source of truth while a CV is open.
 *
 * Responsibilities:
 *   - Hold the current `ResumeData` (hydrated from Supabase on editor mount).
 *   - Expose immutable update helpers for every editable field.
 *   - Track `saveStatus` (`saving | saved | dirty | offline | error`) and the
 *     last-saved timestamp so the header can render the auto-save indicator.
 *   - Schedule a debounced save 1 second after the last mutation.
 *
 * Design choices:
 *   - Zustand over Redux/Context — we mutate at high frequency (every
 *     keystroke). Zustand's selector-based subscription means typing in one
 *     section's field doesn't re-render every other section's form.
 *   - All state is held inside one store; per-component selectors keep render
 *     scope tight.
 *   - The store is *not* persisted to localStorage. Anonymous trial mode
 *     (Phase 2.5) will layer that on as a separate concern.
 */

"use client";

import { create } from "zustand";
import { saveResumeData } from "@/lib/resumes";
import {
  defaultAwardItem,
  defaultCertificationItem,
  defaultCustomElement,
  defaultDesignForTemplate,
  defaultEducationItem,
  defaultExperienceItem,
  defaultHobbyItem,
  defaultLanguageItem,
  defaultProjectItem,
  defaultPublicationItem,
  defaultReferenceItem,
  defaultResumeData,
  defaultSection,
  defaultSkillItem,
  defaultTalkItem,
  defaultVolunteerItem,
} from "@/lib/resume-defaults";
import type {
  CustomElement,
  CustomElementKind,
  ElementOffset,
  GlobalDesign,
  PersonalInfo,
  ResumeData,
  Section,
  SectionType,
  TemplateId,
} from "@/types/resume";

/** Auto-save indicator state machine. */
export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface EditorState {
  /** UUID of the row in `resumes`, or null if the editor isn't bound yet. */
  resumeId: string | null;
  /** The active CV. Always non-null after `hydrate` resolves. */
  data: ResumeData;
  saveStatus: SaveStatus;
  /** ISO timestamp of the last successful save. */
  lastSavedAt: string | null;
  /** The most recent save error message, if any. */
  saveError: string | null;
  /** "Please scroll the section list to this id when it next mounts."
   *  Set by the preview's click-without-drag handler; read+cleared by
   *  the SectionList component on mount. Lives in the store (instead of
   *  a window event) because the SectionList may not even be rendered
   *  when the click happens — if the user is on the Design tab and
   *  clicks a section in the preview, the tab switch happens first and
   *  THEN SectionList mounts, by which time a window event would already
   *  be lost. Persisting the intent in the store survives the mount race. */
  pendingJumpId: string | null;
  /** Element-id currently being inline-edited via double-click. Read by
   *  `<InlineTextEditor>` to render the textarea overlay. Set by the
   *  preview's onDoubleClick handler when the lens supports the id. */
  editingElementId: string | null;

  // ---- Undo / redo history ----
  /** Stack of historical `data` snapshots. Bounded to HISTORY_LIMIT to
   *  prevent unbounded memory growth on long sessions. Newest entry is
   *  at the END of the array. The CURRENT data is always at
   *  `history[historyIndex]`; entries AFTER that are redo candidates. */
  history: ResumeData[];
  historyIndex: number;

  // ---- Lifecycle ----
  hydrate: (id: string, data: ResumeData) => void;
  reset: () => void;

  // ---- Mutators ----
  setMeta: (patch: Partial<ResumeData["meta"]>) => void;
  setTemplate: (template: TemplateId) => void;
  setDesign: (patch: Partial<GlobalDesign>) => void;
  setPersonal: (patch: Partial<PersonalInfo>) => void;

  /** Replace the entire sections array (used by drag-reorder). */
  setSections: (sections: Section[]) => void;
  addSection: (type: SectionType) => string;
  removeSection: (id: string) => void;
  toggleSectionVisible: (id: string) => void;
  updateSection: <T extends Section>(id: string, patch: Partial<T>) => void;
  /** Append a new default-shaped item to the end of an items-bearing
   *  section's `items[]`. Returns the new item id (so the caller can
   *  scroll to / select it) or null if the section doesn't have an
   *  items concept (summary, custom — those use a `body` string or
   *  bullets array). Picks the right default factory based on
   *  `section.type`, so callers don't have to know which factory
   *  function to call — a single "+ Add entry" gesture in the live
   *  preview works for every section type. */
  addItemToSection: (sectionId: string) => string | null;

  /** Request the section list to scroll/expand a given section id when
   *  it mounts (or immediately if already mounted). Pass null to clear. */
  requestJumpToSection: (id: string | null) => void;
  /** Set / clear the inline-edit target. Pass null to exit edit mode. */
  setEditingElementId: (id: string | null) => void;

  // ---- Undo / redo ----
  /** Step backwards in the history. No-op if already at the oldest entry. */
  undo: () => void;
  /** Step forwards in the history. No-op if at the newest entry. */
  redo: () => void;
  /** True when there's something to undo (historyIndex > 0). */
  canUndo: () => boolean;
  /** True when there's something to redo (historyIndex < history.length - 1). */
  canRedo: () => boolean;

  // ---- Per-element drag ----
  /** Patch (or clear, when `pos === undefined`) the drag offset for an
   *  individual element identified by its stable `data-element-id`. */
  setElementPosition: (id: string, pos: ElementOffset | undefined) => void;
  /** Wipe every per-element offset — used by template-swap to avoid
   *  stale offsets bleeding into a different layout. */
  clearElementOverrides: () => void;

  // ---- Toolshelf (free-form custom elements) ----
  /** Currently-selected custom element id, or null for none. Drives the
   *  inspector panel UI. Lives in the store so click-on-preview and
   *  Layers panel can both write to it. */
  selectedElementId: string | null;
  /** In-app clipboard for CTRL-C / CTRL-V on custom elements. Holds a
   *  cloned snapshot of the selected element(s) so paste produces a
   *  fresh copy with new ids. Lives in-memory only — survives across
   *  selection changes within a session, but not across reloads
   *  (intentional: clipboard contents shouldn't accumulate forever).
   *  System clipboard is also written via navigator.clipboard.writeText
   *  for cross-tab paste; that path is best-effort. */
  clipboard: CustomElement[] | null;
  /** Add a default-shaped element of the given kind. Returns its new id
   *  so the caller can immediately select it. Optional `at` overrides
   *  the default (80, 80) drop position — used by the toolshelf's
   *  drag-onto-canvas flow so the element lands where the cursor was
   *  released rather than at a fixed corner.
   *
   *  Optional `init` is shallow-merged over the defaultCustomElement()
   *  result. Used by the social-icon palette: every social-icon card
   *  shares `kind: "icon"` but each card stamps a different
   *  `iconName` + brand `color` — `init` carries those without
   *  needing a separate addIconElement() function or a follow-up
   *  updateCustomElement() call (which would burn an extra undo step). */
  addCustomElement: (
    kind: CustomElementKind,
    at?: { x: number; y: number },
    init?: Partial<CustomElement>,
  ) => string;
  /** Patch a custom element's properties. Generic patch type because the
   *  toolshelf inspector touches any field. */
  updateCustomElement: <T extends CustomElement>(
    id: string,
    patch: Partial<T>,
  ) => void;
  /** Move element forward / backward in z-order by ±1. */
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  /** Hard-delete the element and clear selection if it was selected. */
  removeCustomElement: (id: string) => void;
  /** Set the selected element id. Pass null to deselect. */
  selectElement: (id: string | null) => void;
  /** Copy the selected custom element(s) into the in-app clipboard.
   *  No-op if no element is selected. Returns the count copied so
   *  callers can show a toast. */
  copySelectedElement: () => number;
  /** Cut = copy + delete. Returns the count cut. */
  cutSelectedElement: () => number;
  /** Paste the clipboard's contents at +offset from the originals.
   *  Returns the new element id(s) so callers can select them. The
   *  paste produces FRESH ids so the originals are untouched. */
  pasteClipboard: (offsetPx?: number) => string[];
  /** Duplicate the selected element in place — same as copy + paste
   *  without touching the clipboard. PS/Figma keystroke is Cmd-D.
   *  Returns the new element id, or null if nothing selected. */
  duplicateSelectedElement: () => string | null;
}

// ---------- Save scheduling ----------
//
// AUTO-SAVE IS ENABLED — 800 ms debounce per the commit-cancel research
// (NN/G threshold for "feels instant" on text autosave is 1000 ms; we
// pick 800 to land just under). The marketing copy on the landing
// promises "auto-saves the second you stop typing" and re-enabling
// makes that true.
//
// The earlier disable-autosave move was an over-correction. The real
// issue was that template-swap snapshotted unwanted state. The fix
// for THAT is to let the user explicitly opt in to a swap (a confirm
// modal in the templates tab, separate from autosave). Auto-saving
// every other change is the right default — undo (Cmd+Z) protects
// against regret.
//
// Debounce semantics: every store mutation calls scheduleSave() which
// arms a 800 ms timer. Subsequent mutations within the window reset
// the timer. When the timer fires, we issue exactly one save with the
// latest data. flushPendingSave() force-fires the timer (used by the
// beforeunload guard so a closing tab still saves what's pending).

const AUTOSAVE_DEBOUNCE_MS = 800;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushSave();
  }, AUTOSAVE_DEBOUNCE_MS);
}

// ---------- Undo / redo history ----------

/** Maximum history depth before the oldest entry gets dropped. 50 is
 *  enough to recover from the typical "I made a mess of this section"
 *  without blowing memory on long sessions. Each entry is a deep clone
 *  of `data` (~1-50KB depending on CV size), so 50 × 50KB = 2.5MB ceiling. */
const HISTORY_LIMIT = 50;

/** Debounce window for snapshot pushes. Coalesces rapid changes (every
 *  keystroke when typing in a section form) into a single undo step.
 *  250ms is short enough that the user perceives it as "instant" but
 *  long enough that a continuous typing burst becomes one atomic step. */
const HISTORY_DEBOUNCE_MS = 250;

let historyTimer: ReturnType<typeof setTimeout> | null = null;
/** Set to true while an undo/redo is replaying — prevents the snapshot
 *  effect from re-recording the replay as a NEW step. */
let isReplayingHistory = false;

/** Schedule a debounced snapshot of the current data into history. */
function scheduleHistorySnapshot() {
  if (typeof window === "undefined") return;
  if (isReplayingHistory) return;
  if (historyTimer) clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    historyTimer = null;
    pushHistorySnapshot();
  }, HISTORY_DEBOUNCE_MS);
}

function pushHistorySnapshot() {
  if (isReplayingHistory) return;
  const state = useEditorStore.getState();
  // Deep clone via structuredClone — preserves nested shapes without the
  // JSON-stringify dance, supported in every browser since 2022.
  const snapshot = structuredClone(state.data);
  // Drop any redo branch we'd land on top of, then append + cap.
  const trimmed = state.history.slice(0, state.historyIndex + 1);
  trimmed.push(snapshot);
  // Drop the oldest entries if we're over the cap. Adjust historyIndex
  // accordingly so it still points at the latest entry.
  while (trimmed.length > HISTORY_LIMIT) trimmed.shift();
  useEditorStore.setState({
    history: trimmed,
    historyIndex: trimmed.length - 1,
  });
}

async function flushSave() {
  const { resumeId, data } = useEditorStore.getState();
  if (!resumeId) return;
  useEditorStore.setState({ saveStatus: "saving", saveError: null });
  try {
    await saveResumeData(resumeId, data);
    useEditorStore.setState({
      saveStatus: "saved",
      lastSavedAt: new Date().toISOString(),
    });
  } catch (e) {
    useEditorStore.setState({
      saveStatus: "error",
      saveError: e instanceof Error ? e.message : "Save failed.",
    });
  }
}

/** Force an immediate flush (e.g. on page-unload). Returns the pending save. */
export function flushPendingSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return flushSave();
}

// ---------- Store ----------

export const useEditorStore = create<EditorState>((set, get) => ({
  resumeId: null,
  data: defaultResumeData(),
  saveStatus: "idle",
  lastSavedAt: null,
  saveError: null,
  selectedElementId: null,
  clipboard: null,
  pendingJumpId: null,
  editingElementId: null,
  history: [defaultResumeData()],
  historyIndex: 0,

  hydrate(id, data) {
    // Reset the history to a single entry on hydrate — the loaded CV
    // becomes the new "step 0" so the user can't undo back into a
    // previous CV's state.
    set({
      resumeId: id,
      data,
      saveStatus: "idle",
      saveError: null,
      selectedElementId: null,
      pendingJumpId: null,
      editingElementId: null,
      history: [structuredClone(data)],
      historyIndex: 0,
    });
  },

  reset() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (historyTimer) {
      clearTimeout(historyTimer);
      historyTimer = null;
    }
    const fresh = defaultResumeData();
    set({
      resumeId: null,
      data: fresh,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null,
      selectedElementId: null,
      pendingJumpId: null,
      editingElementId: null,
      history: [structuredClone(fresh)],
      historyIndex: 0,
    });
  },

  undo() {
    const state = get();
    if (state.historyIndex <= 0) return;
    const newIndex = state.historyIndex - 1;
    const target = state.history[newIndex];
    if (!target) return;
    isReplayingHistory = true;
    try {
      set({
        data: structuredClone(target),
        historyIndex: newIndex,
        saveStatus: "dirty",
        // Clear ephemeral selection / edit state so the user lands on a
        // clean canvas at the previous step.
        selectedElementId: null,
        editingElementId: null,
      });
    } finally {
      // Defer the flag reset by a frame so any cascade React updates
      // triggered by the data swap don't accidentally re-record.
      requestAnimationFrame(() => {
        isReplayingHistory = false;
      });
    }
  },

  redo() {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const newIndex = state.historyIndex + 1;
    const target = state.history[newIndex];
    if (!target) return;
    isReplayingHistory = true;
    try {
      set({
        data: structuredClone(target),
        historyIndex: newIndex,
        saveStatus: "dirty",
        selectedElementId: null,
        editingElementId: null,
      });
    } finally {
      requestAnimationFrame(() => {
        isReplayingHistory = false;
      });
    }
  },

  canUndo() {
    return get().historyIndex > 0;
  },

  canRedo() {
    const s = get();
    return s.historyIndex < s.history.length - 1;
  },

  requestJumpToSection(id) {
    set({ pendingJumpId: id });
  },

  setEditingElementId(id) {
    set({ editingElementId: id });
  },

  setMeta(patch) {
    set((s) => ({
      data: { ...s.data, meta: { ...s.data.meta, ...patch } },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  setTemplate(template) {
    set((s) => {
      // Strip every layout-coupled position/override on swap. Reasoning:
      // template A might place the experience block at top-left; the user
      // nudges it +50/+30; template B places that same section in a
      // sidebar at totally different coords. Carrying over the +50/+30
      // would land it in nonsense space. Resetting on swap is the
      // expected production CV-builder behaviour (Resume.io / Enhancv).
      // The CONTENT is preserved — only the visual nudges reset.
      const sections = s.data.sections.map((sec) => {
        if (!sec.position && !sec.overrides) return sec;
        const next = { ...sec } as Section;
        delete (next as { position?: unknown }).position;
        delete (next as { overrides?: unknown }).overrides;
        return next;
      });
      // Apply the new template's intended design tokens (accent color,
      // fonts, page background, photo defaults, etc). Without this, the
      // user lands on Aurora's dark sidebar layout but with Berlin's
      // light blue palette — the template doesn't look like the gallery
      // card promised, and per-template intent (Eclipse=warm dark serif,
      // Manhattan=navy/gold) is silently dropped. This matches what
      // the Templates tab gallery card renders, so card → editor parity
      // is kept. Power users who customised colours will need to re-set
      // them after a template swap; the explicit "Reset to defaults"
      // button in the Design tab uses the same factory function so this
      // is the consistent behaviour.
      const newDesign = defaultDesignForTemplate(template);
      return {
        data: {
          ...s.data,
          meta: { ...s.data.meta, template },
          sections,
          design: newDesign,
          // Element-level offsets are even more template-coupled than
          // section-level ones, so they go too.
          elementOverrides: {},
        },
        saveStatus: "dirty",
      };
    });
    scheduleSave();
  },

  setDesign(patch) {
    set((s) => ({
      data: { ...s.data, design: { ...s.data.design, ...patch } },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  setPersonal(patch) {
    set((s) => ({
      data: { ...s.data, personal: { ...s.data.personal, ...patch } },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  setSections(sections) {
    set((s) => ({
      data: { ...s.data, sections },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  addSection(type) {
    const section = defaultSection(type);
    set((s) => ({
      data: { ...s.data, sections: [...s.data.sections, section] },
      saveStatus: "dirty",
    }));
    scheduleSave();
    return section.id;
  },

  removeSection(id) {
    set((s) => ({
      data: {
        ...s.data,
        sections: s.data.sections.filter((sec) => sec.id !== id),
      },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  toggleSectionVisible(id) {
    set((s) => ({
      data: {
        ...s.data,
        sections: s.data.sections.map((sec) =>
          sec.id === id ? ({ ...sec, visible: !sec.visible } as Section) : sec,
        ),
      },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  updateSection(id, patch) {
    set((s) => ({
      data: {
        ...s.data,
        sections: s.data.sections.map((sec) =>
          sec.id === id ? ({ ...sec, ...patch } as Section) : sec,
        ),
      },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  addItemToSection(sectionId) {
    const state = get();
    const section = state.data.sections.find((s) => s.id === sectionId);
    if (!section) return null;
    // Each section type maps to a default-item factory. Sections
    // without a list (summary / custom) return null so the caller can
    // disable the "+ Add" affordance for them. Custom sections DO
    // have items[] but they're typed as `Bullet[]` and editing happens
    // via the form's bullets editor — adding inline isn't a clear UX,
    // so we exclude them here too. References is special: its
    // onRequest=true mode hides the items list entirely; we still
    // append, and the user is expected to flip onRequest=false in the
    // form if they want the new reference visible.
    let newItem: { id: string } | null = null;
    let nextItems: unknown[] | null = null;
    switch (section.type) {
      case "experience": {
        newItem = defaultExperienceItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "education": {
        newItem = defaultEducationItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "skills": {
        // Inherit the previous skill's group so a "+ Add" from the
        // canvas appends to whichever sub-group the user is currently
        // building, not a fresh "Skills" group. Mirrors the same
        // policy the form's "+ Add skill" button uses.
        const last = section.items[section.items.length - 1];
        const fresh = defaultSkillItem();
        if (last) fresh.group = last.group;
        newItem = fresh;
        nextItems = [...section.items, fresh];
        break;
      }
      case "languages": {
        newItem = defaultLanguageItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "projects": {
        newItem = defaultProjectItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "certifications": {
        newItem = defaultCertificationItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "awards": {
        newItem = defaultAwardItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "publications": {
        newItem = defaultPublicationItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "volunteer": {
        newItem = defaultVolunteerItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "talks": {
        newItem = defaultTalkItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "hobbies": {
        newItem = defaultHobbyItem();
        nextItems = [...section.items, newItem];
        break;
      }
      case "references": {
        newItem = defaultReferenceItem();
        nextItems = [...section.items, newItem];
        break;
      }
      // summary / custom — no items list to append to.
      default:
        return null;
    }
    if (!newItem || !nextItems) return null;
    set((s) => ({
      data: {
        ...s.data,
        sections: s.data.sections.map((sec) =>
          sec.id === sectionId
            ? ({ ...sec, items: nextItems } as Section)
            : sec,
        ),
      },
      saveStatus: "dirty",
      // Surface the section in the left rail so the user can fill in
      // the new entry's fields. Same pattern as click-on-preview-jump.
      pendingJumpId: sectionId,
    }));
    scheduleSave();
    return newItem.id;
  },

  setElementPosition(id, pos) {
    set((s) => {
      const next = { ...(s.data.elementOverrides ?? {}) };
      // `undefined` / both-zero → drop the entry so the element falls back
      // to template-default flow position. Empty maps are persisted as
      // `undefined` to keep the JSONB blob lean.
      const isReset =
        pos === undefined ||
        ((pos.dx ?? 0) === 0 && (pos.dy ?? 0) === 0);
      if (isReset) {
        delete next[id];
      } else {
        next[id] = pos;
      }
      const isEmpty = Object.keys(next).length === 0;
      return {
        data: {
          ...s.data,
          elementOverrides: isEmpty ? undefined : next,
        },
        saveStatus: "dirty",
      };
    });
    scheduleSave();
  },

  clearElementOverrides() {
    set((s) => ({
      data: { ...s.data, elementOverrides: undefined },
      saveStatus: "dirty",
    }));
    scheduleSave();
  },

  // ---- Toolshelf actions ----

  addCustomElement(kind, at, init) {
    // Top z is the highest existing z + 1, so the new element lands on
    // top of everything. Defaults are tuned to land at a visible offset
    // from the top-left so the user immediately sees what they added.
    const existing = get().data.customElements ?? [];
    const topZ =
      existing.length === 0 ? 1 : Math.max(...existing.map((e) => e.z)) + 1;
    const base = defaultCustomElement(kind, topZ);
    // Stagger the default click-add position based on how many elements
    // already share the default top-left corner — without this, clicking
    // "Add LinkedIn" then "Add Telegram" lands BOTH at (80, 80), the
    // second perfectly covering the first, and the user reports "the
    // first icon disappeared". Drag-drop already provides a real `at`,
    // so the stagger only kicks in for click-to-add.
    //
    // Shift by 60 px diagonal × index. 60 px is just over the default
    // social-icon size (48 px) so consecutive icon adds visibly clear
    // each other instead of overlapping ~50 % (the symptom Philip
    // reported as "icons replacing each other"). Wraps after 8
    // elements so the chain stays inside the visible top-left quadrant
    // of the A4 page (8 × 60 = 480 px on a 794 px-wide page).
    const stagger = at
      ? null
      : (() => {
          const n = existing.length;
          const cycle = n % 8;
          return { dx: cycle * 60, dy: cycle * 60 };
        })();
    // If a drop position was provided, anchor the element so its CENTER
    // sits under the cursor — that matches user intent ("I dropped it
    // here") better than top-left anchoring, which feels off by half
    // the element's size.
    const positioned = at
      ? ({
          ...base,
          x: Math.round(at.x - base.w / 2),
          y: Math.round(at.y - base.h / 2),
        } as typeof base)
      : stagger
        ? ({ ...base, x: base.x + stagger.dx, y: base.y + stagger.dy } as typeof base)
        : base;
    // Apply caller-supplied init last. Used by the social-icon palette
    // to stamp the network-specific iconName + brand color in the same
    // operation as the create — so the undo stack gets ONE entry for
    // "added a LinkedIn icon", not two ("added a generic icon", "set
    // its iconName"). Cast through unknown because TypeScript can't
    // narrow the discriminated union when init is Partial<CustomElement>
    // — the runtime invariant (init shape matches kind's element type)
    // is enforced by the toolshelf, not the type system.
    const el = (
      init ? ({ ...positioned, ...init } as CustomElement) : positioned
    ) as CustomElement;
    set((s) => ({
      data: {
        ...s.data,
        customElements: [...(s.data.customElements ?? []), el],
      },
      saveStatus: "dirty",
      selectedElementId: el.id,
    }));
    scheduleSave();
    return el.id;
  },

  updateCustomElement(id, patch) {
    set((s) => {
      const list = s.data.customElements ?? [];
      const next = list.map((e) =>
        e.id === id ? ({ ...e, ...patch } as CustomElement) : e,
      );
      return {
        data: { ...s.data, customElements: next },
        saveStatus: "dirty",
      };
    });
    scheduleSave();
  },

  bringForward(id) {
    set((s) => {
      const list = s.data.customElements ?? [];
      const target = list.find((e) => e.id === id);
      if (!target) return {};
      const above = list.filter((e) => e.z > target.z);
      if (above.length === 0) return {}; // already top
      // Swap z with the next element above.
      const swap = above.reduce((a, b) => (a.z < b.z ? a : b));
      const next = list.map((e) => {
        if (e.id === id) return { ...e, z: swap.z };
        if (e.id === swap.id) return { ...e, z: target.z };
        return e;
      });
      return {
        data: { ...s.data, customElements: next },
        saveStatus: "dirty",
      };
    });
    scheduleSave();
  },

  sendBackward(id) {
    set((s) => {
      const list = s.data.customElements ?? [];
      const target = list.find((e) => e.id === id);
      if (!target) return {};
      const below = list.filter((e) => e.z < target.z);
      if (below.length === 0) return {};
      const swap = below.reduce((a, b) => (a.z > b.z ? a : b));
      const next = list.map((e) => {
        if (e.id === id) return { ...e, z: swap.z };
        if (e.id === swap.id) return { ...e, z: target.z };
        return e;
      });
      return {
        data: { ...s.data, customElements: next },
        saveStatus: "dirty",
      };
    });
    scheduleSave();
  },

  removeCustomElement(id) {
    set((s) => ({
      data: {
        ...s.data,
        customElements: (s.data.customElements ?? []).filter(
          (e) => e.id !== id,
        ),
      },
      saveStatus: "dirty",
      selectedElementId:
        s.selectedElementId === id ? null : s.selectedElementId,
    }));
    scheduleSave();
  },

  selectElement(id) {
    set({ selectedElementId: id });
  },

  copySelectedElement() {
    const state = get();
    const id = state.selectedElementId;
    if (!id) return 0;
    const el = (state.data.customElements ?? []).find((c) => c.id === id);
    if (!el) return 0;
    // structuredClone preserves the discriminated union shape better
    // than JSON.parse(JSON.stringify(...)) — Date / Map / circular refs
    // aren't in CustomElement today but if they ever are, this stays safe.
    const snapshot: CustomElement[] = [structuredClone(el)];
    set({ clipboard: snapshot });
    // Also write to the system clipboard so paste works in another tab
    // (or after a reload, since the in-app clipboard doesn't persist).
    // Best-effort — Safari requires user gesture + HTTPS, but Cmd-C IS
    // a user gesture so this should land. Wrap with `void` to silence
    // the "unhandled promise" lint without an explicit `.catch`.
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard
        .writeText(
          JSON.stringify({ type: "slothcv-elements", v: 1, payload: snapshot }),
        )
        .catch(() => {
          // Permission denied / not focused — silently swallow. The
          // in-app clipboard is the primary path; system clipboard is a bonus.
        });
    }
    return snapshot.length;
  },

  cutSelectedElement() {
    const count = get().copySelectedElement();
    if (count > 0) {
      const id = get().selectedElementId;
      if (id) get().removeCustomElement(id);
    }
    return count;
  },

  pasteClipboard(offsetPx = 12) {
    const state = get();
    const buffer = state.clipboard;
    if (!buffer || buffer.length === 0) return [];
    // Compute next available z so pasted elements land on top.
    const existing = state.data.customElements ?? [];
    const baseZ = existing.length === 0
      ? 1
      : Math.max(...existing.map((e) => e.z)) + 1;
    // Each paste re-stamps a fresh id, offsets by +offsetPx, and
    // bumps z so the chain `paste, paste, paste` produces a visible
    // diagonal trail rather than a perfect overlap.
    const newEls: CustomElement[] = buffer.map((src, i) => ({
      ...structuredClone(src),
      id: nanoIdLike(),
      x: src.x + offsetPx,
      y: src.y + offsetPx,
      z: baseZ + i,
    }));
    set((s) => ({
      data: {
        ...s.data,
        customElements: [...(s.data.customElements ?? []), ...newEls],
      },
      saveStatus: "dirty",
      // Select the FIRST pasted element so the inspector lights up
      // with its properties — power users can then refine without
      // hunting on the canvas.
      selectedElementId: newEls[0]?.id ?? s.selectedElementId,
    }));
    scheduleSave();
    return newEls.map((e) => e.id);
  },

  duplicateSelectedElement() {
    const state = get();
    const id = state.selectedElementId;
    if (!id) return null;
    const el = (state.data.customElements ?? []).find((c) => c.id === id);
    if (!el) return null;
    const existing = state.data.customElements ?? [];
    const baseZ = existing.length === 0
      ? 1
      : Math.max(...existing.map((e) => e.z)) + 1;
    const dup: CustomElement = {
      ...structuredClone(el),
      id: nanoIdLike(),
      // 16 px diagonal — Figma uses ~10-20 px so the dupe is visibly
      // distinct from the original yet adjacent enough that it's
      // obviously the same element pattern.
      x: el.x + 16,
      y: el.y + 16,
      z: baseZ,
    };
    set((s) => ({
      data: {
        ...s.data,
        customElements: [...(s.data.customElements ?? []), dup],
      },
      saveStatus: "dirty",
      selectedElementId: dup.id,
    }));
    scheduleSave();
    return dup.id;
  },
}));

/** Local id helper — `nanoid` is already used elsewhere; pull from the
 *  same package via dynamic import to avoid a circular import on
 *  resume-defaults. We just need ~12 chars, URL-safe, collision-resistant
 *  within a single CV. */
function nanoIdLike(): string {
  // Inline the alphabet so this module stays standalone.
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint8Array(12);
    crypto.getRandomValues(buf);
    for (let i = 0; i < 12; i++) {
      s += alphabet[buf[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < 12; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return s;
}

// Subscribe to data changes globally — every mutation that changes the
// `data` reference schedules a debounced history snapshot. We compare
// reference identity (==) which is cheap and accurate because every
// mutator builds a new object via spread. The 250ms debounce coalesces
// rapid changes into a single undo step. Replays from undo/redo set
// `isReplayingHistory` so they don't re-record.
if (typeof window !== "undefined") {
  let lastData = useEditorStore.getState().data;
  useEditorStore.subscribe((state) => {
    if (state.data !== lastData) {
      lastData = state.data;
      scheduleHistorySnapshot();
    }
  });
}

// Avoid an unused-symbol lint warning when this module is loaded just for its
// side effects.
export { useEditorStore as _editorStore };

// Re-export `get` for non-component callers (e.g. unload handler) that need
// the current snapshot without subscribing.
export const editorState = () => useEditorStore.getState();
