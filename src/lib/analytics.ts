import posthog from 'posthog-js'

/**
 * PostHog (EU Cloud) for page views, actions and exceptions. Events go to /rly on this site,
 * which server/posthogProxy.ts forwards to PostHog, so ad blockers that block posthog.com
 * don't drop them. Without VITE_POSTHOG_PROJECT_TOKEN nothing is sent.
 */
const TOKEN: string | undefined = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN

export function initAnalytics(): void {
  if (!TOKEN) {
    if (import.meta.env.DEV) {
      console.error(
        'VITE_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_PROJECT_TOKEN is configured',
      )
    }
    return
  }
  posthog.init(TOKEN, {
    api_host: '/rly',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-08-30',
    capture_exceptions: true,
    // Sends the visitor's distinct and session id with /api requests, so server errors link to them.
    tracing_headers: [window.location.hostname],
  })
}

/** Captures a user action; a no-op when PostHog isn't configured. */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (posthog.__loaded) posthog.capture(event, properties)
}

export { posthog }
