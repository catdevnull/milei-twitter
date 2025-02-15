import { sequence } from "@sveltejs/kit/hooks";
import * as Sentry from "@sentry/sveltekit";

Sentry.init({
  dsn: "https://79b56150c5092cdad5c56c62223a1a5d@o4507188153548800.ingest.de.sentry.io/4507188155646032",
  tracesSampleRate: 1,
  profilesSampleRate: 0.1,
  enabled: import.meta.env.PROD,
});

export const handleError = Sentry.handleErrorWithSentry();
export const handle = sequence(Sentry.sentryHandle());
