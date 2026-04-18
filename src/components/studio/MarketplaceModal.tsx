"use client";

import React, { useEffect } from "react";
import type { AppLanguage } from "@/lib/studio-types";
import { logger } from "@/lib/logger";
import MarketplacePanel from "./MarketplacePanel";

// ============================================================
// PART 1 — Types & Props
// ============================================================

export interface MarketplaceModalProps {
  language: AppLanguage;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=MarketplaceModalProps

// ============================================================
// PART 2 — Modal shell (scroll lock + overlay + MarketplacePanel)
// ============================================================

/**
 * Full-screen modal wrapper around MarketplacePanel.
 * - Locks body scroll while open (restored on unmount).
 * - Clicking the backdrop (outside the panel) calls onClose.
 * - ESC handling is delegated to MarketplacePanel (it already listens).
 */
export default function MarketplaceModal({ language, onClose }: MarketplaceModalProps) {
  // Lock body scroll while the modal is mounted.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    try {
      document.body.style.overflow = "hidden";
    } catch (err) {
      logger.warn("MarketplaceModal", "scroll lock failed", err);
    }
    return () => {
      try {
        document.body.style.overflow = prev;
      } catch (err) {
        logger.warn("MarketplaceModal", "scroll unlock failed", err);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[var(--z-modal)]"
      role="presentation"
      data-testid="marketplace-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          try { onClose(); } catch (err) { logger.warn("MarketplaceModal", "onClose threw", err); }
        }
      }}
    >
      <div className="relative w-full max-w-5xl max-h-[85vh] flex">
        <MarketplacePanel
          language={language}
          onClose={onClose}
          className="w-full h-full overflow-hidden"
        />
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Modal | inputs=MarketplaceModalProps | outputs=MarketplaceModal
