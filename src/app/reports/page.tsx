import { Suspense } from "react";
import type { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: "Reports -- EH Universe",
  description:
    "53 classified reports from the EH Universe. Personnel files, incident reports, technical specs, and more.",
  openGraph: {
    title: "Reports -- EH Universe",
    description:
      "53 classified reports spanning personnel files, incident reports, and technical specifications.",
  },
};

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsClient />
    </Suspense>
  );
}
