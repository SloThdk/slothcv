/**
 * PromptModal — promise-based text-input dialog.
 *
 * Same pattern as `useConfirm()` but with an editable input field.
 * Returns the entered string on submit, or null on cancel.
 *
 * Used primarily by the editor's Save button: when a CV hasn't been
 * explicitly saved by the user yet, hitting Save asks for a title via
 * this modal before flushing to Supabase. Cancel = don't save.
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
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";
import { Input } from "./input";
import { backdrop, modalPanel } from "@/lib/motion";

export interface PromptOptions {
  title: string;
  description?: string;
  /** Pre-filled value. Selected on focus so the user can overwrite. */
  defaultValue?: string;
  /** Visible label above the input. */
  inputLabel?: string;
  /** Placeholder when the field is empty. */
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Reject empty submissions — default true. */
  required?: boolean;
  /** Optional maxLength on the input (default 120). */
  maxLength?: number;
}

type Resolver = (value: string | null) => void;

interface PromptContextValue {
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const PromptContext = createContext<PromptContextValue | null>(null);

export function PromptProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<PromptOptions | null>(null);
  const [value, setValue] = useState("");
  const resolverRef = useRef<Resolver | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const prompt = useCallback((next: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      // Cancel any in-flight prompt so the new one takes over cleanly.
      if (resolverRef.current) {
        resolverRef.current(null);
        resolverRef.current = null;
      }
      resolverRef.current = resolve;
      setValue(next.defaultValue ?? "");
      setOpts(next);
    });
  }, []);

  const close = useCallback((result: string | null) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    setValue("");
    if (r) r(result);
  }, []);

  // Auto-focus + select-all when the modal opens so the user can
  // immediately overwrite the default value or accept it with Enter.
  useEffect(() => {
    if (!opts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(null);
      }
    }
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, close]);

  function submit() {
    if (!opts) return;
    const v = value.trim();
    const required = opts.required !== false;
    if (required && !v) {
      // Bounce: shake the input by re-focusing — user knows they need
      // to type something.
      inputRef.current?.focus();
      return;
    }
    close(v);
  }

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      {/* AnimatePresence: same transition contract as ConfirmModal —
          backdrop fades, panel scales back as it unmounts. */}
      <AnimatePresence>
        {opts && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-modal-title"
            {...backdrop}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) close(null);
            }}
          >
            <motion.div
              {...modalPanel}
              className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
            <h2
              id="prompt-modal-title"
              className="text-base font-semibold text-fg"
            >
              {opts.title}
            </h2>
            {opts.description && (
              <p className="mt-1 text-sm text-muted">{opts.description}</p>
            )}
            <div className="mt-4">
              {opts.inputLabel && (
                <label
                  htmlFor="prompt-input"
                  className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted"
                >
                  {opts.inputLabel}
                </label>
              )}
              <Input
                ref={inputRef}
                id="prompt-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={opts.placeholder}
                maxLength={opts.maxLength ?? 120}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => close(null)}
              >
                {opts.cancelLabel ?? "Cancel"}
              </Button>
              <Button type="button" size="sm" onClick={submit}>
                {opts.confirmLabel ?? "OK"}
              </Button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    throw new Error("usePrompt() must be used inside <PromptProvider>");
  }
  return ctx.prompt;
}
