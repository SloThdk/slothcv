/** Certifications section editor. */

"use client";

import { useEditorStore } from "@/lib/store/editor";
import type { CertificationsSection } from "@/types/resume";
import { defaultCertificationItem } from "@/lib/resume-defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddEntryButton, ItemRow, moveItem } from "./shared";

export function CertificationsForm({ section }: { section: CertificationsSection }) {
  const update = useEditorStore((s) => s.updateSection);
  const setItems = (items: CertificationsSection["items"]) =>
    update<CertificationsSection>(section.id, { items });
  const patchItem = (idx: number, patch: Partial<CertificationsSection["items"][number]>) => {
    const next = [...section.items];
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };

  return (
    <div className="space-y-2.5">
      {section.items.map((it, idx) => (
        <ItemRow
          key={it.id}
          title={it.name || "(certification)"}
          subtitle={it.issuer ? `· ${it.issuer}` : undefined}
          visible={it.visible}
          onToggleVisible={() => patchItem(idx, { visible: !it.visible })}
          onMoveUp={() => setItems(moveItem(section.items, idx, idx - 1))}
          onMoveDown={() => setItems(moveItem(section.items, idx, idx + 1))}
          canMoveUp={idx > 0}
          canMoveDown={idx < section.items.length - 1}
          onDelete={() => setItems(section.items.filter((_, i) => i !== idx))}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={it.name}
                  onChange={(e) => patchItem(idx, { name: e.target.value })}
                  placeholder="AWS Certified Solutions Architect"
                />
              </div>
              <div>
                <Label>Issuer</Label>
                <Input
                  value={it.issuer}
                  onChange={(e) => patchItem(idx, { issuer: e.target.value })}
                  placeholder="Amazon Web Services"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date</Label>
                <Input
                  value={it.date}
                  onChange={(e) => patchItem(idx, { date: e.target.value })}
                  placeholder="2024-03"
                />
              </div>
              <div>
                <Label>Expiry (optional)</Label>
                <Input
                  value={it.expiry ?? ""}
                  onChange={(e) =>
                    patchItem(idx, { expiry: e.target.value || undefined })
                  }
                  placeholder="2027-03"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Credential ID</Label>
                <Input
                  value={it.credentialId ?? ""}
                  onChange={(e) =>
                    patchItem(idx, { credentialId: e.target.value || undefined })
                  }
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={it.url ?? ""}
                  onChange={(e) =>
                    patchItem(idx, { url: e.target.value || undefined })
                  }
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>
        </ItemRow>
      ))}
      <AddEntryButton
        label="Add certification"
        onClick={() => setItems([...section.items, defaultCertificationItem()])}
      />
    </div>
  );
}
