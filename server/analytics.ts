import { PostHog } from 'posthog-node'

/** PostHog EU Cloud ingestion host (also the upstream of the browser proxy in posthogProxy.ts). */
export const POSTHOG_API_HOST = 'eu.i.posthog.com'
export const POSTHOG_ASSET_HOST = 'eu-assets.i.posthog.com'

/** Distinct id for events that belong to no visitor (e.g. a failed upstream download). */
export const SERVER_DISTINCT_ID = 'gdp-statistika-server'

const token = process.env.POSTHOG_PROJECT_TOKEN

if (!token && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  console.error(
    'POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_TOKEN is configured',
  )
}

/** Server-side PostHog client (exceptions, upstream failures); null when no token is set. */
export const posthog = token
  ? new PostHog(token, { host: `https://${POSTHOG_API_HOST}`, enableExceptionAutocapture: true })
  : null

/** Reports an error to PostHog error tracking; without a visitor id it isn't tied to a person. */
export function captureServerException(err: unknown, distinctId: string | undefined, properties: Record<string, unknown>) {
  posthog?.captureException(err, distinctId ?? SERVER_DISTINCT_ID, {
    ...properties,
    ...(distinctId ? {} : { $process_person_profile: false }),
  })
}
