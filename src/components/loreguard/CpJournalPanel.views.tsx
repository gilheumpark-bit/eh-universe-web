"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { Sync } from "@/components/loreguard/icons";

export const CreativeContributionInspector = dynamic(
  () => import("@/components/studio/CreativeContributionInspector").then((m) => m.default),
  { ssr: false, loading: () => <LoadingSkeleton height={420} /> },
);

export const ProvenanceReport = dynamic(
  () => import("@/components/studio/ProvenanceReport").then((m) => m.default),
  { ssr: false, loading: () => <LoadingSkeleton height={420} /> },
);

export const SubmissionPackageBuilder = dynamic(
  () => import("@/components/studio/SubmissionPackageBuilder").then((m) => m.default),
  { ssr: false, loading: () => <LoadingSkeleton height={420} /> },
);

export class SubViewBoundary extends Component<
  { failMessage: string; retryLabel: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="wr-srow cpjournal-alert-row" role="alert">
          <span className="rdot amber" />
          {this.props.failMessage}
          <button
            type="button"
            className="mini-btn cpjournal-push"
            onClick={() => this.setState({ failed: false })}
          >
            <Sync size={13} />
            {this.props.retryLabel}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
