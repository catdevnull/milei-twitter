import { sequence } from "@sveltejs/kit/hooks";
import * as Sentry from "@sentry/sveltekit";

export const handleError = Sentry.handleErrorWithSentry();
export const handle = sequence(Sentry.sentryHandle());
