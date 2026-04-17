import * as Sentry from "@sentry/nextjs";

const DEFAULT_DSN = "https://6b8351f49a77ad3ea62ebf749f0193a9@o4511125585068032.ingest.us.sentry.io/4511125587099648";
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || DEFAULT_DSN;
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

Sentry.init({
  dsn,
  tracesSampleRate,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});
