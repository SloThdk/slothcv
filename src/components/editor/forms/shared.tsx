/**
 * Shared form atoms — bullet editor, item-list wrapper, "current job"
 * checkbox, etc. Used by every section form to keep them small.
 */

"use client";

import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { Bullet } from "@/types/resume";
import { defaultBullet } from "@/lib/resume-defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * BulletsEditor — vertical list of bullets with add/remove/visibility.
 * Used by Experience, Education, Projects, Volunteer, Custom.
 */
export function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: Bullet[];
  onChange: (next: Bullet[]) => void;
}) {
  function update(idx: number, patch: Partial<Bullet>) {
    const next = [...bullets];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      {bullets.map((b, idx) => (
        <div key={b.id} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="text-subtle select-none"
            title="bullet"
          >
            •
          </span>
          <Input
            value={b.text}
            onChange={(e) => update(idx, { text: e.target.value })}
            placeholder="Achievement, responsibility, or impact statement"
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={b.visible ? "Hide bullet" : "Show bullet"}
            className="h-8 w-8"
            onClick={() => update(idx, { visible: !b.visible })}
          >
            {b.visible ? (
              <Eye className="h-3.5 w-3.5 text-subtle" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-subtle" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove bullet"
            className="h-8 w-8"
            onClick={() => onChange(bullets.filter((_, i) => i !== idx))}
          >
            <Trash2 className="h-3.5 w-3.5 text-subtle" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange([...bullets, defaultBullet()])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add bullet
      </Button>
    </div>
  );
}

/**
 * ItemRow — wraps each entry in an item-array section with a header bar
 * (move-up / move-down / hide / delete) and a collapsible body.
 */
export function ItemRow({
  title,
  subtitle,
  visible,
  onToggleVisible,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
  children,
}: {
  title: string;
  subtitle?: string;
  visible: boolean;
  onToggleVisible: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-1 border-b border-border bg-surface-hover px-2 py-1.5">
        <div className="flex-1 truncate text-xs font-medium text-fg">
          {title || "(untitled)"}
          {subtitle && (
            <span className="ml-1 text-subtle">{subtitle}</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Move up"
          className="h-7 w-7"
          disabled={!canMoveUp}
          onClick={onMoveUp}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Move down"
          className="h-7 w-7"
          disabled={!canMoveDown}
          onClick={onMoveDown}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={visible ? "Hide entry" : "Show entry"}
          className="h-7 w-7"
          onClick={onToggleVisible}
        >
          {visible ? (
            <Eye className="h-3.5 w-3.5 text-subtle" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-subtle" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete entry"
          className="h-7 w-7"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5 text-subtle hover:text-red-600" />
        </Button>
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

/**
 * Move an item within an array — returns a new array. Helper for the up/down
 * arrows in ItemRow callbacks.
 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

/** "Add entry" button at the bottom of every item-array section. */
export function AddEntryButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={onClick}
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
