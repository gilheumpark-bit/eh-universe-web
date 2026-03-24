"use client";

import type { Lang } from "@/lib/LangContext";
import type { PlanetStatus } from "@/lib/network-types";
import { PLANET_STATUS_LABELS, pickNetworkLabel } from "@/lib/network-labels";

const STATUS_CLASS_MAP: Record<PlanetStatus, string> = {
  maintain: "badge-blue",
  develop: "badge-allow",
  collapse: "badge-deny",
  experiment: "badge-amber",
  freeze: "badge-redacted",
  discard: "badge-classified",
};

interface SettlementBadgeProps {
  status: PlanetStatus;
  lang: Lang;
  className?: string;
}

export function SettlementBadge({ status, lang, className }: SettlementBadgeProps) {
  return (
    <span className={`badge ${STATUS_CLASS_MAP[status]} ${className ?? ""}`.trim()}>
      {pickNetworkLabel(PLANET_STATUS_LABELS[status], lang)}
    </span>
  );
}
