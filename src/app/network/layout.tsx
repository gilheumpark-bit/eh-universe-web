import { notFound } from "next/navigation";
import { isFeatureEnabledServer } from "@/lib/feature-flags";
import NetworkClientLayout from "./NetworkClientLayout";

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  if (!isFeatureEnabledServer("NETWORK_COMMUNITY")) {
    notFound();
  }
  return <NetworkClientLayout>{children}</NetworkClientLayout>;
}
