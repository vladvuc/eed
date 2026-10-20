import posthog from 'posthog-js'

/**
 * PostHog (EU Cloud) for page views, actions and exceptions. Events go to /rly on this site,
 * which server/posthogProxy.ts forwards to PostHog, so ad blockers that block posthog.com
 * don't drop them. Without VITE_POSTHOG_PROJECT_TOKEN nothing is sent.
 */
const TOKEN: string | undefined = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN

/**
 * Opting out, e.g. for the site's own visits: open any page with ?notrack once and this browser sends
 * nothing to PostHog from then on (remembered in localStorage); ?notrack=0 turns analytics back on.
 */
const OPT_OUT_KEY = 'gdp-statistika:notrack'

/** ?notrack / ?notrack=1 → true (opt out), ?notrack=0 / ?notrack=false → false (opt in), absent → null. */
export function notrackParam(search: string): boolean | null {
  const value = new URLSearchParams(search).get('notrack')
  if (value === null) return null
  return value !== '0' && value !== 'false'
}

/** Applies ?notrack (and removes it from the address bar); true if this browser has opted out. */
function hasOptedOut(): boolean {
  try {
    const choice = notrackParam(window.location.search)
    if (choice !== null) {
      if (choice) window.localStorage.setItem(OPT_OUT_KEY, '1')
      else window.localStorage.removeItem(OPT_OUT_KEY)
      const url = new URL(window.location.href)
      url.searchParams.delete('notrack')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
      console.info(choice ? '[analytics] off in this browser (?notrack=0 turns it back on)' : '[analytics] on again')
    }
    return window.localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false // localStorage unavailable (e.g. blocked): nothing to remember the choice in
  }
}

export function initAnalytics(): void {
  if (hasOptedOut()) return
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
