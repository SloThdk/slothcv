/**
 * ConfirmModal — promise-based confirmation dialog that replaces the
 * native browser `confirm()`.
 *
 * Why not native `confirm()`? Two reasons:
 *   1. It's visually a foreign body — different fonts, layout, language,
 *      and accent colors than the rest of the app.
 *   2. Some browsers / platforms render it modal-blocking or styled in
 *      ways we can't control (Safari mobile, Brave shields). The native
 *      dialog also can't show app branding or the destructive variant.
 *
 * Usage:
 *
 *   const confirm = useConfirm();
 *   if (await confirm({
 *     title: "Delete this CV?",
 *     description: "This can't be undone.",
 *     confirmLabel: "Delete",
 *     variant: "danger",
 *   })) {
 *     await actuallyDelete();
 *   }
 *
 * The provider mounts ONE modal at a time at the bottom of the document
 * (highest z-index wins) so it stacks above everything else, including
 * our other floating UIs (color picker, design tab, etc.).
 *
 * Implementation:
 *   - Single React Context exposes `useConfirm()`.
 *   - Internally tracks one Promise resolver at a time. If a second
 *     `confirm()` fires while one is pending, the previous one resolves
 *     to `false` (cancelled) — this prevents Promise leaks.
 *   - Backdrop click + Escape both cancel; Enter confirms when focus is
 *     inside the modal. `aria-labelledby` / `aria-describedby` carry the
 *     title and description for screen readers.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";
import { backdrop, modalPanel } from "@/lib/motion";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" colours the confirm button red and adds a warning glyph. */
  variant?: "default" | "danger";
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // If a previous confirm is still open, cancel it so its caller
      // doesn't hang. The new one takes over.
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
      resolverRef.current = resolve;
      setOpts(next);
    });
  }, []);

  const close = useCallback((value: boolean) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    if (r) r(value);
  }, []);

  // Esc cancels, Enter confirms — only when the modal is open.
  useEffect(() => {
    if (!opts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        close(true);
      }
    }
    window.addEventListener("keydown", onKey);
    // Auto-focus the primary action so Enter works without an extra Tab.
    requestAnimationFrame(() => confirmBtnRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {/* AnimatePresence drives the mount + unmount transitions. Without
          it, switching `opts` to null would yank the modal off screen
          instantly. With it, the backdrop fades and the panel scales
          back down toward the trigger before unmounting. */}
      <AnimatePresence>
        {opts && (
          <motion.div
            // Top-level scrim. z-[100] so it floats above color picker (z-50)
            // and any other in-app overlays.
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby={
              opts.description ? "confirm-modal-desc" : undefined
            }
            {...backdrop}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => {
              // Backdrop click cancels. Inner click is stopped on the panel.
              if (e.target === e.currentTarget) close(false);
            }}
          >
            <motion.div
              {...modalPanel}
              className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-start gap-3">
              {opts.variant === "danger" && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <div className="flex-1">
                <h2
                  id="confirm-modal-title"
                  className="text-base font-semibold text-fg"
                >
                  {opts.title}
                </h2>
                {opts.description && (
                  <p
                    id="confirm-modal-desc"
                    className="mt-1 text-sm text-muted"
                  >
                    {opts.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => close(false)}
              >
                {opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                ref={confirmBtnRef}
                type="button"
                size="sm"
                variant={opts.variant === "danger" ? "destructive" : "default"}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Throw at runtime so dev environments catch a missing provider
    // immediately instead of having `confirm()` silently no-op.
    throw new Error("useConfirm() must be used inside <ConfirmProvider>");
  }
  return ctx.confirm;
}
