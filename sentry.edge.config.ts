import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6b8351f49a77ad3ea62ebf749f0193a9@o4511125585068032.ingest.us.sentry.io/4511125587099648",
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});
