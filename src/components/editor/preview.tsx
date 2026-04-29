/**
 * Preview — right-pane scrollable, zoomable A4 sheet with click-to-edit
 * AND free-drag of both whole sections AND individual elements (Canva-class).
 *
 * Drag-target priority on mousedown (most-specific wins):
 *   1. `data-element-id` ancestor → drag THAT element, store it in
 *      `data.elementOverrides[id]` as `{ dx, dy }`.
 *   2. `data-section-id` ancestor (and not "personal") → drag the whole
 *      section, store it in `section.position` as `{ x, y }`.
 *   3. Background → open Design tab on click.
 *
 * Smoothness strategy (proven in production CV editors and Atlassian's
 * Pragmatic-DnD writeups — see scout's research notes):
 *   - During drag we ONLY mutate `el.style.transform` directly. No React
 *     state, no Zustand commits → React tree stays frozen at 60fps GPU
 *     compositing.
 *   - Cursor math `delta / scale` accounts for the parent's transform:
 *     scale() so the dragged element stays glued to the cursor regardless
 *     of zoom level. Requires `transform-origin: top left` on the scaled
 *     parent, which we set explicitly below.
 *   - On mouseup we issue ONE store write — the drag becomes a single
 *     React rerender, a single autosave debounce, a single undo entry.
 *
 * Click vs drag: 4px movement threshold. Below threshold = click → jump
 * to that element/section's form. Above = drag.
 *
 * The X/Y sliders in the section's design-override panel read/write the
 * SAME `section.position` field. Per-element drags don't have a slider
 * companion (yet) — clearing element offsets is via "Reset all overrides"
 * on the section panel.
 */

"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Maximize2, Move, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/store/editor";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TemplateRenderer } from "@/templates/renderer";
import { PAGE_DIMENSIONS_MM, mmToPx } from "@/templates/shared";
import { elementTextLens } from "@/lib/element-text-lens";
import { uploadResumePhoto } from "@/lib/profile";
import {
  SOCIAL_ICONS_BY_NAME,
  isSocialIconName,
} from "@/lib/social-icons";
import { Button } from "@/components/ui/button";
import {
  InlineTextEditor,
  inlineEditorClickPoint,
} from "@/components/editor/inline-text-editor";
import { SnapGuidesOverlay } from "@/components/editor/snap-guides-overlay";
import {
  buildSnapCandidates,
  snap as runSnap,
  type SnapRect,
} from "@/lib/editor-snap";

type ZoomMode = "50" | "75" | "100" | "fit";

const JUMP_EVENT = "slothcv:jump-to-section";
const DRAG_THRESHOLD = 4; // pixels of movement before a press becomes a drag
const POSITION_BOUND = 400; // matches the Zod max in the schema

/** Walk up from a clicked element to the nearest ancestor carrying a
 *  given data-attribute. Returns the attribute's value or null. */
function findAncestorAttr(
  target: EventTarget | null,
  attr: string,
): { id: string; el: HTMLElement } | null {
  if (!(target instanceof HTMLElement) && !(target instanceof SVGElement))
    return null;
  const el = (target as HTMLElement).closest(`[${attr}]`);
  if (!el) return null;
  const id = el.getAttribute(attr);
  if (!id) return null;
  return { id, el: el as HTMLElement };
}

/** Drag mode discriminator.
 *   - `custom`  — toolshelf element body. Writes `customElements[idx].x/y`
 *                 (absolute page coords).
 *   - `element` — content element with offset model. Writes
 *                 `elementOverrides[id]` as `{dx, dy}` (relative).
 *   - `section` — whole-section drag. Writes `section.position` as `{x, y}`.
 *   - `background` — empty page. No drag, just click-to-Design-tab.
 *
 * Resize is intentionally NOT a drag kind here — corner/edge handles own
 * their own pointer-capture gesture lifecycle inside `<ResizeHandle>` in
 * `custom-elements-layer.tsx`. Pulling resize OUT of this window-level
 * handler eliminated the "click and hold but nothing scales" bug class
 * by removing every code path where a stale closure or React rerender
 * could fight the gesture.
 *
 * Order matters: the drag-handler walks up looking for the MOST SPECIFIC
 * data-attribute first (custom > element > section).
 */
type DragKind = "custom" | "element" | "section" | "background";

interface DragState {
  kind: DragKind;
  id: string;
  startX: number;
  startY: number;
  /** Snapshot of the dragged thing's position when the press started.
   *  For sections this is `section.position ?? {0,0}`; for elements
   *  it's `data.elementOverrides[id] ?? {0,0}`. */
  startPos: { x: number; y: number };
  hasMoved: boolean;
}

export function Preview() {
  const data = useEditorStore((s) => s.data);
  const updateSection = useEditorStore((s) => s.updateSection);
  const setElementPosition = useEditorStore((s) => s.setElementPosition);
  const updateCustomElement = useEditorStore((s) => s.updateCustomElement);
  const addCustomElement = useEditorStore((s) => s.addCustomElement);
  const selectElement = useEditorStore((s) => s.selectElement);
  const setPersonal = useEditorStore((s) => s.setPersonal);
  const setEditingElementId = useEditorStore((s) => s.setEditingElementId);
  const { t } = useLanguage();
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to the actual A4 page sheet (the bg-white element). We need it
  // for the toolshelf's drop-onto-canvas math: cursor coords minus sheet
  // origin, divided by scale, gives us page-relative coordinates.
  const pageSheetRef = useRef<HTMLDivElement>(null);
  // Hidden file input that double-click on `personal.photo` triggers.
  // Replaces the avatar from inside the visual designer instead of
  // requiring a trip to the Personal form.
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [fitScale, setFitScale] = useState(0.6);

  const dims = PAGE_DIMENSIONS_MM[data.design.pageSize];
  const pageWidthPx = mmToPx(dims.w);
  const pageHeightPx = mmToPx(dims.h);
  // Mirror page dims into refs so the window-level drag handler can read
  // them at click-time without re-subscribing whenever the page-size
  // setting changes. Snap candidates use these to add the page itself
  // as a virtual snap target (page edges + page center).
  const pageWidthRef = useRef(pageWidthPx);
  const pageHeightRef = useRef(pageHeightPx);
  useEffect(() => {
    pageWidthRef.current = pageWidthPx;
    pageHeightRef.current = pageHeightPx;
  }, [pageWidthPx, pageHeightPx]);

  // Recompute fit scale on container resize. Strategy: fit by WIDTH only.
  // The user wants the working scale of the visual designer to stay big
  // enough to actually edit on — fitting by both axes makes the page tiny
  // when the canvas is short. Width-fit lets the page overflow vertically
  // (canvas scrolls) which is fine, and the explicit page-sheet height
  // (computed from the SCALED visual size, not the intrinsic px height)
  // means there's no dead space below the document.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recompute = () => {
      const w = el.clientWidth - 32; // padding
      setFitScale(Math.max(0.25, Math.min(1.5, w / pageWidthPx)));
    };
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    recompute();
    return () => ro.disconnect();
  }, [pageWidthPx]);

  const scale =
    zoom === "fit"
      ? fitScale
      : zoom === "50"
        ? 0.5
        : zoom === "75"
          ? 0.75
          : 1.0;

  // Drag state lives in a ref so the global mousemove/mouseup handlers
  // don't re-bind on every state change. The `el` reference is the dragged
  // DOM node — during a drag we mutate its `style.transform` directly for
  // 60-fps smoothness (no React re-render per frame). The store update is
  // committed once on mouseup.
  const dragRef = useRef<
    | (DragState & {
        el: HTMLElement | null;
        pendingX: number;
        pendingY: number;
        rafId: number | null;
        /** Pre-built snap candidate list. For custom-element drags we
         *  populate this on mousedown so each move only does the snap
         *  pass, not the rebuild. Empty for non-custom drags. */
        snapCandidates: SnapRect[];
        /** Dragged element's w/h in page coords — needed for snap math. */
        snapW: number;
        snapH: number;
      })
    | null
  >(null);
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Mirror sections by id for fast lookup of the current `position`.
  const sectionsById = useRef(new Map<string, { x: number; y: number }>());
  useEffect(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const s of data.sections) {
      m.set(s.id, s.position ?? { x: 0, y: 0 });
    }
    sectionsById.current = m;
  }, [data.sections]);

  // Mirror element overrides for fast lookup. Same pattern as
  // sectionsById — the live ref means our window-level mousemove handler
  // doesn't have to re-subscribe whenever overrides change.
  const elementOverridesRef = useRef<Record<string, { dx?: number; dy?: number }>>({});
  useEffect(() => {
    elementOverridesRef.current = data.elementOverrides ?? {};
  }, [data.elementOverrides]);

  // Mirror custom-element positions by id. Used at mousedown to seed
  // the drag's startPos with the element's current absolute (x, y).
  const customElementsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  useEffect(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const el of data.customElements ?? []) {
      m.set(el.id, { x: el.x, y: el.y });
    }
    customElementsRef.current = m;
  }, [data.customElements]);

  // Live snap-rect mirror: id → {x, y, w, h} of every visible custom
  // element. Read at mousedown to seed the snap-candidate list. Lives in
  // a ref because onMouseDown is a useCallback with `[]` deps — accessing
  // `data.customElements` directly inside it would close over the FIRST
  // render's value and never update.
  const customRectsRef = useRef<SnapRect[]>([]);
  useEffect(() => {
    customRectsRef.current = (data.customElements ?? [])
      .filter((c) => c.visible !== false)
      .map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h }));
  }, [data.customElements]);

  // Keyboard shortcuts on the preview. Photoshop-style.
  //
  //   - Cmd/Ctrl + Z    → undo (any data change)
  //   - Cmd/Ctrl + Shift + Z (or Ctrl+Y) → redo
  //   - R / Shift+R     → rotate selected element ±15° in place
  //   - Delete / Backspace → remove the selected element
  //   - Arrow keys      → nudge selected element by 1 px (10 with Shift)
  //
  // All shortcuts bail when the user is typing in a form field or
  // contentEditable region — otherwise they'd fire mid-text-edit.
  const selectedElementId = useEditorStore((s) => s.selectedElementId);
  const removeCustomElement = useEditorStore((s) => s.removeCustomElement);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const copySelectedElement = useEditorStore((s) => s.copySelectedElement);
  const cutSelectedElement = useEditorStore((s) => s.cutSelectedElement);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const duplicateSelectedElement = useEditorStore(
    (s) => s.duplicateSelectedElement,
  );
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore key presses inside form fields / contenteditable so the
      // shortcut doesn't fire while the user is typing.
      const tgt = e.target as HTMLElement | null;
      const inField =
        !!tgt &&
        (tgt.isContentEditable ||
          tgt.tagName === "INPUT" ||
          tgt.tagName === "TEXTAREA" ||
          tgt.tagName === "SELECT");

      // Cmd/Ctrl + Z = undo, Cmd/Ctrl + Shift + Z (or Ctrl+Y) = redo.
      // These ALSO fire in form fields — users expect undo to work
      // while typing. Browsers have native textarea undo too, but our
      // store-level undo is what reverts the saved data, so we
      // override here. (If the user wanted in-field char-level undo,
      // they're out of luck — our undo is data-level.)
      const isUndoChord =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "z" || e.key === "Z");
      const isRedoChord =
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
        ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y"));
      if (isUndoChord) {
        e.preventDefault();
        undo();
        return;
      }
      if (isRedoChord) {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl + C / X / V / D — copy / cut / paste / duplicate of
      // the selected custom element. Skipped when typing in a form
      // field so native text-clipboard behaviour stays intact (Cmd-C
      // copies selected text in an input, NOT the canvas element).
      // The store's clipboard slot AND the system clipboard are both
      // populated on copy; paste reads either depending on which has
      // content. Each shortcut is only meaningful when at least ONE
      // custom element is selected (or, for paste, when the clipboard
      // has content) — bail out otherwise so the keystroke falls
      // through to the browser default.
      const isCmd = e.metaKey || e.ctrlKey;
      if (!inField && isCmd && !e.shiftKey && !e.altKey) {
        if ((e.key === "c" || e.key === "C") && selectedElementId) {
          e.preventDefault();
          copySelectedElement();
          return;
        }
        if ((e.key === "x" || e.key === "X") && selectedElementId) {
          e.preventDefault();
          cutSelectedElement();
          return;
        }
        if (e.key === "v" || e.key === "V") {
          // Try in-app clipboard first (fast). If empty, fall through
          // to the system clipboard read — best-effort, requires user
          // gesture which Cmd-V already qualifies as.
          const ids = pasteClipboard();
          if (ids.length > 0) {
            e.preventDefault();
            return;
          }
          // System-clipboard fallback. Async, so we let the keystroke
          // proceed normally — if the read succeeds and the payload
          // looks like ours, we instantiate elements via the store's
          // addCustomElement-equivalent path.
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            void navigator.clipboard
              .readText()
              .then((txt) => {
                try {
                  const parsed = JSON.parse(txt);
                  if (parsed?.type === "slothcv-elements" && Array.isArray(parsed.payload)) {
                    // Seed the in-app clipboard then paste — re-uses the
                    // same offset / id / z logic as the synchronous path.
                    useEditorStore.setState({ clipboard: parsed.payload });
                    pasteClipboard();
                  }
                } catch {
                  // Not our payload — silently ignore. User pasted
                  // plain text from elsewhere; canvas paste isn't
                  // applicable.
                }
              })
              .catch(() => {
                // Permission denied — clipboard read requires user gesture
                // + secure context. Cmd-V satisfies the gesture but
                // localhost may flake; swallow.
              });
          }
          return;
        }
        if ((e.key === "d" || e.key === "D") && selectedElementId) {
          e.preventDefault();
          duplicateSelectedElement();
          return;
        }
      }

      // Other shortcuts only fire OUTSIDE form fields.
      if (inField) return;

      // Cmd/Ctrl + Alt + H = show ALL hidden custom elements. This
      // works WITHOUT a selection — it's a global "unhide everything"
      // gesture, similar to Photoshop. Toggles every hidden element
      // back to visible in one shot.
      if (
        (e.metaKey || e.ctrlKey) &&
        e.altKey &&
        (e.key === "h" || e.key === "H")
      ) {
        e.preventDefault();
        const list = data.customElements ?? [];
        for (const el of list) {
          if (!el.visible) {
            updateCustomElement(el.id, { visible: true });
          }
        }
        return;
      }

      if (!selectedElementId) return;
      const els = data.customElements ?? [];
      const cur = els.find((c) => c.id === selectedElementId);
      if (!cur) return;

      // Rotate ±15°.
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const step = e.shiftKey ? -15 : 15;
        const next = ((cur.rotate ?? 0) + step) % 360;
        updateCustomElement(selectedElementId, { rotate: next });
        return;
      }

      // Delete / Backspace removes the element. No confirm — ⌫ is a
      // strong intentional gesture. Cmd+Z brings it back if needed.
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeCustomElement(selectedElementId);
        return;
      }

      // Cmd/Ctrl + H = toggle visibility of selected element. Photoshop
      // uses Ctrl+, but Cmd/Ctrl+H is a stronger muscle-memory across
      // creative tools. Hidden elements still appear in the Layers
      // panel with an eye-off icon — you can click them back on, OR
      // hit Cmd/Ctrl+Alt+H to bulk-show every hidden element.
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        (e.key === "h" || e.key === "H")
      ) {
        e.preventDefault();
        updateCustomElement(selectedElementId, { visible: !cur.visible });
        return;
      }

      // Arrow nudge — 1 px, 10 px with Shift. Reads from current position
      // each call so multiple presses accumulate cleanly.
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const arrow = arrows[e.key];
      if (arrow) {
        e.preventDefault();
        const mult = e.shiftKey ? 10 : 1;
        updateCustomElement(selectedElementId, {
          x: cur.x + arrow[0] * mult,
          y: cur.y + arrow[1] * mult,
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedElementId,
    data.customElements,
    updateCustomElement,
    removeCustomElement,
    undo,
    redo,
    copySelectedElement,
    cutSelectedElement,
    pasteClipboard,
    duplicateSelectedElement,
  ]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;

    // Bail out entirely if the user clicked into a contentEditable region
    // (inline-edit mode for custom Text). Native text-cursor placement
    // and selection drags must work without our drag handler eating
    // mousedown.
    if (target?.isContentEditable) return;

    // Bail out entirely if the user clicked a resize handle. The handle
    // owns the gesture itself via pointer capture — if we don't return
    // here, the click would ALSO start a custom-element body drag, and
    // the two would fight each other. (The handle's onMouseDown calls
    // stopPropagation but this React onMouseDown is on the SAME stage
    // ancestor, so the event reaches us in the bubble phase before any
    // child handler runs unless we check up-tree.)
    if (target?.closest("[data-resize-handle]")) return;

    // Priority 1: most-specific element with `data-element-id`.
    //
    // Custom (toolshelf) elements live at `custom.<id>` and store ABSOLUTE
    // page coords in their data, so the drag's startPos is the element's
    // current x/y. Other element-ids use the OFFSET model and store deltas.
    const elementHit = findAncestorAttr(target, "data-element-id");
    if (elementHit) {
      const isCustom = elementHit.id.startsWith("custom.");
      if (isCustom) {
        const customId = elementHit.id.slice("custom.".length);
        const cur = customElementsRef.current.get(customId) ?? { x: 0, y: 0 };
        // Build the snap-candidate list ONCE on press — the candidates
        // don't move during a single drag (we're moving THIS element,
        // not them). On every move we just run the snap pass against
        // this list. Skipped for non-custom drags since their position
        // model uses transforms not absolute x/y.
        const allRects = customRectsRef.current;
        const dragged = allRects.find((c) => c.id === customId);
        const snapCandidates = buildSnapCandidates(
          allRects,
          customId,
          pageWidthRef.current,
          pageHeightRef.current,
        );
        // Selecting the element on press is what makes the inspector panel
        // light up — Canva-grade "click to select" behaviour. Setting it
        // here (before drag commits) means a no-movement click also selects.
        selectElement(customId);
        dragRef.current = {
          kind: "custom",
          // Carry the FULL data-element-id (so onUp can derive customId
          // again without re-parsing) — avoids any drift between mousedown
          // and mouseup if the element gets renamed mid-drag (it can't,
          // but defensive).
          id: customId,
          startX: e.clientX,
          startY: e.clientY,
          startPos: cur,
          hasMoved: false,
          el: elementHit.el,
          pendingX: cur.x,
          pendingY: cur.y,
          rafId: null,
          snapCandidates,
          snapW: dragged?.w ?? 0,
          snapH: dragged?.h ?? 0,
        };
        return;
      }

      const ov = elementOverridesRef.current[elementHit.id];
      dragRef.current = {
        kind: "element",
        id: elementHit.id,
        startX: e.clientX,
        startY: e.clientY,
        startPos: { x: ov?.dx ?? 0, y: ov?.dy ?? 0 },
        hasMoved: false,
        el: elementHit.el,
        pendingX: 0,
        pendingY: 0,
        rafId: null,
        snapCandidates: [],
        snapW: 0,
        snapH: 0,
      };
      return;
    }

    // Priority 2: nearest section wrapper. `personal` is intentionally not
    // draggable as a whole — it's a group of separately-draggable elements.
    const sectionHit = findAncestorAttr(target, "data-section-id");
    if (sectionHit && sectionHit.id !== "personal" && sectionsById.current.has(sectionHit.id)) {
      const start = sectionsById.current.get(sectionHit.id) ?? { x: 0, y: 0 };
      dragRef.current = {
        kind: "section",
        id: sectionHit.id,
        startX: e.clientX,
        startY: e.clientY,
        startPos: start,
        hasMoved: false,
        el: sectionHit.el,
        pendingX: 0,
        pendingY: 0,
        rafId: null,
        snapCandidates: [],
        snapW: 0,
        snapH: 0,
      };
      return;
    }

    // Priority 3: background — track press so a still-mouseup opens Design tab.
    dragRef.current = {
      kind: "background",
      id: "",
      startX: e.clientX,
      startY: e.clientY,
      startPos: { x: 0, y: 0 },
      hasMoved: false,
      el: null,
      pendingX: 0,
      pendingY: 0,
      rafId: null,
      snapCandidates: [],
      snapW: 0,
      snapH: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Window-level move + up so dragging out of the preview pane still works.
  //
  // Smoothness strategy:
  //   - During a drag we ONLY mutate `el.style.transform` directly. No
  //     React state updates, no Zustand store writes — the React tree
  //     stays frozen so we get true 60fps GPU-composited drag.
  //   - We also dispatch a lightweight `slothcv:section-drag-tick` event
  //     so the X/Y sliders (in the section design-overrides panel) can
  //     update via direct DOM mutation too. Element drags don't dispatch
  //     this event since they have no slider companion.
  //   - On mouseup, we write the final position to the store ONCE. That's
  //     the single React rerender per drag — slider snaps to the saved
  //     value, autosave fires, undo history gets one clean entry.
  //   - `body.cursor = "grabbing"` for the duration of any drag so the
  //     OS cursor matches the gesture (Photoshop / Figma feel).
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      let dx = e.clientX - drag.startX;
      let dy = e.clientY - drag.startY;
      if (!drag.hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      // Shift = constrain to 8 directions (axis + 45° diagonals).
      // Photoshop / Affinity / Figma all do this — snap the cursor delta
      // to the nearest 45° direction, preserving magnitude. Live-evaluated
      // each frame so the user can press/release Shift mid-drag.
      if (e.shiftKey) {
        const mag = Math.hypot(dx, dy);
        if (mag > 0) {
          const angle = Math.atan2(dy, dx);
          const snappedAngle =
            Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          dx = mag * Math.cos(snappedAngle);
          dy = mag * Math.sin(snappedAngle);
        }
      }
      if (!drag.hasMoved) {
        // Cross threshold → commit to drag mode. We swap to the
        // Photoshop / Affinity / Figma drag-isolation model:
        //   - `body.slothcv-dragging` class triggers the CSS in
        //     globals.css that sets `pointer-events: none` on every
        //     preview-stage child EXCEPT the dragged one. With pointer
        //     events disabled, `:hover` no longer fires on siblings
        //     the cursor passes over — no more "every overlapping
        //     element lights up" noise during a drag.
        //   - `data-being-dragged="true"` on the dragged el keeps it
        //     responsive for any same-element pointer logic and lets
        //     the CSS exempt it from the global pointer-events: none.
        //   - cursor + user-select are now driven by CSS too so we
        //     don't have to fight inline-style precedence.
        drag.hasMoved = true;
        document.body.classList.add("slothcv-dragging");
        if (drag.el) drag.el.setAttribute("data-being-dragged", "true");
      }
      if (drag.kind === "background" || !drag.el) return;

      // Cursor math: translate the screen-space delta into element-space
      // by dividing by the parent's transform: scale(). This relies on
      // the scaled wrapper having `transform-origin: top left` (set
      // explicitly on the page wrapper below). With those two together,
      // the cursor stays glued to the pixel of the element it grabbed,
      // at every zoom level — no drift.
      const sc = scaleRef.current || 1;

      if (drag.kind === "custom") {
        // Custom (toolshelf) elements use absolute page coordinates that
        // get written to `el.style.left/top`. We can't use `transform`
        // here because the underlying CustomElementsLayer already sets
        // `left`/`top` from the data, so transform would compose with
        // those. Easiest mental model: drive `left/top` directly during
        // drag, commit to the store on mouseup.
        //
        // No POSITION_BOUND clamp here because custom elements legitimately
        // span the whole A4 page — but we DO clamp to the wider Zod
        // bounds (-200..2000 / -200..3000) so a runaway drag can't push
        // the element into "save fails" territory.
        let nx = drag.startPos.x + dx / sc;
        let ny = drag.startPos.y + dy / sc;

        // Smart-guide snap. Disabled while Ctrl/Cmd is held — Photoshop
        // / Affinity / Figma all use Ctrl as the universal "ignore snap
        // this drag" override. The snap engine returns a corrected
        // position + the active guides; we apply both. Empty guides
        // means no snap fired and we draw nothing.
        const snapping = !(e.ctrlKey || e.metaKey);
        if (snapping && drag.snapW > 0 && drag.snapH > 0) {
          const result = runSnap(
            { id: drag.id, x: nx, y: ny, w: drag.snapW, h: drag.snapH },
            drag.snapCandidates,
          );
          nx = result.x;
          ny = result.y;
          window.dispatchEvent(
            new CustomEvent("slothcv:snap-guides", {
              detail: { guides: result.guides },
            }),
          );
        } else {
          // Hold-Ctrl bypass — explicitly clear guides so the overlay
          // doesn't strand the last set on screen.
          window.dispatchEvent(new CustomEvent("slothcv:snap-guides-end"));
        }

        const cx = Math.max(-200, Math.min(2000, nx));
        const cy = Math.max(-200, Math.min(3000, ny));
        const rx = Math.round(cx);
        const ry = Math.round(cy);
        drag.el.style.left = `${rx}px`;
        drag.el.style.top = `${ry}px`;
        drag.el.style.willChange = "left, top";
        drag.pendingX = rx;
        drag.pendingY = ry;

        // Tell the inspector panel's live x/y sliders so they mirror in
        // real time without going through Zustand. The inspector listens
        // and writes its own input.value via refs.
        window.dispatchEvent(
          new CustomEvent("slothcv:custom-drag-tick", {
            detail: { id: drag.id, x: rx, y: ry },
          }),
        );
        return;
      }

      const newX = drag.startPos.x + dx / sc;
      const newY = drag.startPos.y + dy / sc;
      const clampedX = Math.max(-POSITION_BOUND, Math.min(POSITION_BOUND, newX));
      const clampedY = Math.max(-POSITION_BOUND, Math.min(POSITION_BOUND, newY));
      const rx = Math.round(clampedX);
      const ry = Math.round(clampedY);

      // (1) Direct style write — no React, no reconciliation, native FPS.
      drag.el.style.transform = `translate(${rx}px, ${ry}px)`;
      drag.el.style.willChange = "transform";
      drag.pendingX = rx;
      drag.pendingY = ry;

      // (2) Section drags: tell the live X/Y sliders so they mirror in
      //     real time via direct DOM writes (no React rerender during drag).
      if (drag.kind === "section") {
        window.dispatchEvent(
          new CustomEvent("slothcv:section-drag-tick", {
            detail: { id: drag.id, x: rx, y: ry },
          }),
        );
      }
    }

    function onUp() {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      // Always restore body state — `slothcv-dragging` class drives
      // pointer-events / cursor / user-select via globals.css. Removing
      // the class restores all three at once. We also clean up any
      // legacy inline cursor / userSelect we used to set so old code
      // paths don't leave stuck state behind.
      document.body.classList.remove("slothcv-dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (drag.el) drag.el.removeAttribute("data-being-dragged");
      // Clear any active snap guides — drag is over.
      window.dispatchEvent(new CustomEvent("slothcv:snap-guides-end"));

      if (drag.hasMoved && drag.el) {
        // Single store write at the end of the drag — one React rerender
        // for the whole interaction. Autosave + undo history land cleanly.
        if (drag.kind === "section") {
          updateSection(drag.id, {
            position: { x: drag.pendingX, y: drag.pendingY },
          });
          window.dispatchEvent(
            new CustomEvent("slothcv:section-drag-end", {
              detail: { id: drag.id, x: drag.pendingX, y: drag.pendingY },
            }),
          );
        } else if (drag.kind === "element") {
          setElementPosition(drag.id, {
            dx: drag.pendingX,
            dy: drag.pendingY,
          });
        } else if (drag.kind === "custom") {
          // Commit absolute coords back to the data so subsequent renders
          // place the element at its new home — and so a refresh keeps
          // the change. Inspector x/y sliders read from the same field.
          updateCustomElement(drag.id, {
            x: drag.pendingX,
            y: drag.pendingY,
          });
          window.dispatchEvent(
            new CustomEvent("slothcv:custom-drag-end", {
              detail: { id: drag.id, x: drag.pendingX, y: drag.pendingY },
            }),
          );
        }
        // Clean up willChange so the GPU layer doesn't stay promoted —
        // the next React render will set the same transform via inline
        // style and the visual outcome is identical.
        drag.el.style.willChange = "";
      } else if (!drag.hasMoved) {
        // No movement — treat as click. Background → Design tab; element
        // or section → jump to its form. Element-id wins over section-id
        // for the jump because it's more specific.
        if (drag.kind === "background") {
          // Click on empty paper deselects custom elements only.
          // The editor page listens for selection changes and restores
          // whatever tab the user was on BEFORE they selected — no
          // surprise jump to Design tab. (Earlier behavior auto-opened
          // Design here, which kicked users out of their current
          // workflow every time they clicked off a shape.)
          selectElement(null);
        } else if (drag.kind === "custom") {
          // Selection already set on mousedown; nothing else to do —
          // the inspector panel renders from `selectedElementId`.
        } else if (drag.kind === "element") {
          // An element click jumps to its parent SECTION's form (since
          // we don't have per-element forms yet). Walk up from the
          // element to find its section — the renderer puts every
          // element-tagged node inside a section-tagged ancestor.
          // Also clear custom-element selection so the inspector closes.
          selectElement(null);
          const sectionEl = drag.el?.closest("[data-section-id]");
          const sid = sectionEl?.getAttribute("data-section-id");
          if (sid) {
            window.dispatchEvent(
              new CustomEvent(JUMP_EVENT, { detail: { id: sid } }),
            );
          }
        } else if (drag.kind === "section") {
          selectElement(null);
          window.dispatchEvent(
            new CustomEvent(JUMP_EVENT, { detail: { id: drag.id } }),
          );
        }
      }
      dragRef.current = null;
    }

    // Escape during a drag = abort, don't commit. Restores body state
    // and clears dragRef so onUp's eventual fire is a no-op. Mirrors
    // Photoshop / Figma — Esc bails out of any active gesture.
    function onKey(e: KeyboardEvent) {
      const drag = dragRef.current;
      if (!drag || e.key !== "Escape") return;
      // Roll the dragged element back to its original position via
      // direct DOM mutation — the next React render will produce the
      // same outcome from store data, so no flicker.
      if (drag.el) {
        if (drag.kind === "custom") {
          drag.el.style.left = `${drag.startPos.x}px`;
          drag.el.style.top = `${drag.startPos.y}px`;
        } else {
          drag.el.style.transform =
            drag.startPos.x === 0 && drag.startPos.y === 0
              ? ""
              : `translate(${drag.startPos.x}px, ${drag.startPos.y}px)`;
        }
        drag.el.style.willChange = "";
        drag.el.removeAttribute("data-being-dragged");
      }
      document.body.classList.remove("slothcv-dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.dispatchEvent(new CustomEvent("slothcv:snap-guides-end"));
      dragRef.current = null;
    }

    // Window blur (alt-tab, Cmd-Tab) during a drag = abort. Same as
    // Escape — without this, the user comes back to a half-stuck UI
    // with the drag-isolation class still on the body.
    function onBlur() {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.el) {
        drag.el.style.willChange = "";
        drag.el.removeAttribute("data-being-dragged");
      }
      document.body.classList.remove("slothcv-dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.dispatchEvent(new CustomEvent("slothcv:snap-guides-end"));
      dragRef.current = null;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [updateSection, setElementPosition, updateCustomElement, selectElement]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 transition-colors">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-muted)]">
          <span>{t("preview.label")}</span>
          <span className="hidden items-center gap-1 rounded bg-[color:var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[color:var(--color-text-muted)] sm:inline-flex">
            <MousePointerClick className="h-3 w-3" />
            {t("preview.hintClick")}
          </span>
          <span className="hidden items-center gap-1 rounded bg-[color:var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[color:var(--color-text-muted)] sm:inline-flex">
            <Move className="h-3 w-3" />
            {t("preview.hintDrag")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZoom("50")}
            className={zoom === "50" ? "bg-surface-hover" : ""}
          >
            50%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZoom("75")}
            className={zoom === "75" ? "bg-surface-hover" : ""}
          >
            75%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZoom("100")}
            className={zoom === "100" ? "bg-surface-hover" : ""}
          >
            100%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZoom("fit")}
            className={zoom === "fit" ? "bg-surface-hover" : ""}
            aria-label={t("preview.fitToWidth")}
            title={t("preview.fitToWidth")}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable scaled page. mousedown is the entry point for the drag /
          click distinguisher; the actual move/up listeners live on window
          (above) so dragging out of the preview pane still works.
          ondragover/ondrop pick up shapes dragged from the toolshelf. */}
      <div
        ref={containerRef}
        className="preview-stage flex-1 select-none overflow-auto bg-[color:var(--color-canvas)] p-4 transition-colors"
        onMouseDown={onMouseDown}
        onDoubleClick={(e) => {
          // Find the most-specific element-id ancestor of the click.
          // If a lens is registered for it, enter inline-edit mode by
          // setting `editingElementId` in the store — the
          // `<InlineTextEditor>` overlay (mounted at end of this tree)
          // picks it up and renders a textarea over the source element.
          const target = e.target as HTMLElement | null;
          const hit = target?.closest("[data-element-id]") as
            | HTMLElement
            | null;
          if (!hit) return;
          const id = hit.getAttribute("data-element-id");
          if (!id) return;
          // Skip custom-element ids — those have their own inline-edit
          // path handled by `<EditableText>` inside CustomElementsLayer
          // (which knows how to write to `customElements[id].text`).
          if (id.startsWith("custom.")) return;
          // Special case: double-clicking the personal photo on the
          // canvas opens the file picker so users can replace the
          // image from the visual designer (no trip to the form needed).
          if (id === "personal.photo") {
            e.stopPropagation();
            e.preventDefault();
            photoFileRef.current?.click();
            return;
          }
          const lens = elementTextLens(id, data, {
            setPersonal,
            updateSection,
          });
          if (!lens) return; // Not editable inline — falls back to form jump on click.
          e.stopPropagation();
          e.preventDefault();
          // Stash the dblclick coordinates so the inline editor's
          // focus useLayoutEffect can place the caret AT THE CLICK
          // POINT and expand to a word selection — Photoshop's Type
          // Tool semantics. Without this, every edit-start would
          // select-all, which wipes the user's text on the first
          // keystroke and breaks the "double-click a typo to fix it"
          // expectation. Coordinates are viewport-space (clientX/Y);
          // `caretPositionFromPoint` consumes the same space.
          inlineEditorClickPoint.current = {
            x: e.clientX,
            y: e.clientY,
          };
          setEditingElementId(id);
        }}
        onDragOver={(e) => {
          // Must call preventDefault on dragover for drop to fire.
          if (
            e.dataTransfer.types.includes("application/x-slothcv-element")
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
          const kind = e.dataTransfer.getData(
            "application/x-slothcv-element",
          ) as Parameters<typeof addCustomElement>[0] | "";
          if (!kind) return;
          e.preventDefault();
          // Translate the screen-space drop point into A4-page coords.
          // We get the page sheet's top-left bounding rect, subtract it
          // from the cursor, then divide by scale to undo the
          // transform: scale() the parent applies. Result lands the
          // element exactly where the cursor was released, regardless
          // of zoom level or scroll position.
          const sheet = pageSheetRef.current;
          if (!sheet) return;
          const rect = sheet.getBoundingClientRect();
          const sc = scaleRef.current || 1;
          const x = (e.clientX - rect.left) / sc;
          const y = (e.clientY - rect.top) / sc;
          // Social-icon palette stamps a secondary payload with the
          // brand identifier so a single drop creates an
          // already-coloured LinkedIn / Telegram / etc., not a generic
          // icon that the user has to recolour from the inspector.
          // The icon registry is imported lazily here so the rest of
          // preview.tsx (which doesn't know about social icons) stays
          // import-clean.
          if (kind === "icon") {
            const iconName = e.dataTransfer.getData(
              "application/x-slothcv-icon",
            );
            if (iconName && isSocialIconName(iconName)) {
              const def = SOCIAL_ICONS_BY_NAME[iconName];
              addCustomElement("icon", { x, y }, {
                iconName,
                color: def.defaultColor,
              });
              return;
            }
            // Fall through to default-icon if no name was carried —
            // shouldn't happen in normal flow but keeps drag-from-
            // outside-source safe.
          }
          addCustomElement(kind, { x, y });
        }}
      >
        {/* Page sheet — sized at scaled visual dimensions so the layout
            footprint matches what's drawn. Without an explicit height,
            CSS `transform: scale()` would leave the layout box at the
            intrinsic A4 height, producing dead space below the document
            equal to (1 - scale) × pageHeight.

            data-pdf-page-outer marks the OUTER (scaled-display) wrapper
            so the PDF exporter can find it by selector. The exporter
            temporarily strips the inner transform during capture so
            html2canvas reads the document at its intrinsic CSS-px size
            and the resulting PNG is rendered into a 1:1 A4 PDF. */}
        <div
          ref={pageSheetRef}
          data-pdf-page-outer="true"
          className="group/sheet mx-auto bg-white shadow-lg ring-1 ring-transparent transition-shadow hover:ring-2 hover:ring-neutral-900/10 hover:shadow-xl"
          style={{
            width: pageWidthPx * scale,
            height: mmToPx(dims.h) * scale,
          }}
        >
          <div
            // Position relative so the SnapGuidesOverlay (absolute, full-
            // sheet) lays itself out over the same coordinate space as
            // the rendered template + custom elements.
            // data-pdf-page-content marks this unscaled inner content
            // node — what the exporter actually rasterises. Width/height
            // here are the intrinsic A4 size in CSS pixels.
            className="relative"
            data-pdf-page-content="true"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: pageWidthPx,
              height: mmToPx(dims.h),
            }}
          >
            {/* `key` forced to the template id so React fully unmounts
                the previous template's tree on swap. Without this, when
                the user switches templates from the modal, the new
                Component reference is selected but the lazy-loaded chunk
                machinery + section position state from the previous
                template can leave stale DOM mounted. The remount-on-swap
                is cheap (the new chunk loads in <100ms; existing chunks
                are cached) and eliminates the "checkmark moved but
                preview still shows old template" bug. */}
            <TemplateRenderer
              key={data.meta.template}
              data={data}
              fixedSize={true}
            />
            {/* Magenta smart-guide lines drawn over the page during
                snap-active drags. Renders nothing when there are no
                active guides — zero cost when not in use. */}
            <SnapGuidesOverlay
              pageWidth={pageWidthPx}
              pageHeight={mmToPx(dims.h)}
            />
          </div>
        </div>
      </div>
      {/* Inline-edit overlay — single global instance. Reads
          `editingElementId` from the store and renders a textarea over
          the source element only when one is set. Sits at the very end
          of the preview tree so its z-index lands on top. */}
      <InlineTextEditor />
      {/* Hidden file input for replace-photo-from-canvas. Triggered by
          double-clicking `personal.photo` on the live preview. Same
          upload helper as the personal-form photo picker — instant
          local-blob preview, then swap to the persistent Supabase URL
          after upload completes. */}
      <input
        ref={photoFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          // Instant local preview while the upload runs.
          const localUrl = URL.createObjectURL(file);
          setPersonal({ photoUrl: localUrl });
          try {
            const url = await uploadResumePhoto(file);
            setPersonal({ photoUrl: url });
            URL.revokeObjectURL(localUrl);
            toast.success("Photo replaced.");
          } catch (err) {
            URL.revokeObjectURL(localUrl);
            setPersonal({ photoUrl: undefined });
            toast.error(err instanceof Error ? err.message : "Photo upload failed.");
          } finally {
            if (photoFileRef.current) photoFileRef.current.value = "";
          }
        }}
      />
    </div>
  );
}
