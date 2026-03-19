import { Suspense } from "react";
import ArchiveClient from "./ArchiveClient";

export default function ArchivePage() {
  return (
    <Suspense>
      <ArchiveClient />
    </Suspense>
  );
}
