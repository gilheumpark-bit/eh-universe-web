"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type KeySlot,
  type MultiKeyConfig,
  loadMultiKeyConfigAsync,
  saveMultiKeyConfigAsync,
} from "@/lib/multi-key-manager";
import { PROVIDERS, type ProviderId } from "@/lib/ai-providers";

function updateSlot(slots: KeySlot[], index: number, patch: Partial<KeySlot>): KeySlot[] {
  return slots.map((s, j) => (j === index ? { ...s, ...patch } : s));
}

export function APIKeySlotManager() {
  const [cfg, setCfg] = useState<MultiKeyConfig | null>(null);

  const load = useCallback(async () => {
    setCfg(await loadMultiKeyConfigAsync());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (!cfg) {
    return (
      <div className="p-4 font-mono text-sm text-text-tertiary" aria-live="polite">
        Loading key slots…
      </div>
    );
  }

  const onSave = async () => {
    await saveMultiKeyConfigAsync(cfg);
    await load();
  };

  const providerIds = Object.keys(PROVIDERS) as ProviderId[];

  return (
    <div className="flex max-w-2xl flex-col gap-3 p-4 text-text-primary">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        API key slots (BYOK)
      </h2>
      <p className="text-xs text-text-tertiary">
        Keys are encrypted in local storage. Up to seven slots for multi-agent routing.
      </p>
      {cfg.slots.map((slot, i) => (
        <div
          key={slot.id}
          className="space-y-2 rounded border border-border bg-bg-secondary p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-text-tertiary" htmlFor={`slot-prov-${slot.id}`}>
              Provider
            </label>
            <select
              id={`slot-prov-${slot.id}`}
              className="rounded border border-border bg-bg-primary px-2 py-1 text-sm"
              value={slot.provider}
              onChange={(e) => {
                const p = e.target.value as ProviderId;
                setCfg((c) =>
                  c
                    ? {
                        ...c,
                        slots: updateSlot(c.slots, i, {
                          provider: p,
                          model: PROVIDERS[p].defaultModel,
                        }),
                      }
                    : c,
                );
              }}
            >
              {providerIds.map((p) => (
                <option key={p} value={p}>
                  {PROVIDERS[p].name}
                </option>
              ))}
            </select>
            <label className="ml-2 flex items-center gap-1 text-xs text-text-tertiary">
              <input
                type="checkbox"
                checked={slot.enabled}
                onChange={(e) =>
                  setCfg((c) =>
                    c ? { ...c, slots: updateSlot(c.slots, i, { enabled: e.target.checked }) } : c,
                  )
                }
              />
              Enabled
            </label>
          </div>
          <input
            className="w-full rounded border border-border bg-bg-primary px-2 py-1 font-mono text-sm"
            type="password"
            autoComplete="off"
            placeholder="API key"
            value={slot.apiKey}
            onChange={(e) =>
              setCfg((c) =>
                c ? { ...c, slots: updateSlot(c.slots, i, { apiKey: e.target.value }) } : c,
              )
            }
          />
          <input
            className="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm"
            placeholder="Label"
            value={slot.label}
            onChange={(e) =>
              setCfg((c) =>
                c ? { ...c, slots: updateSlot(c.slots, i, { label: e.target.value }) } : c,
              )
            }
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => void onSave()}
        className="min-h-[44px] rounded bg-accent-blue px-4 py-2 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:outline-none"
      >
        Save keys
      </button>
    </div>
  );
}
