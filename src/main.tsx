import { PostHogErrorBoundary, PostHogProvider } from '@posthog/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initAnalytics, posthog } from './lib/analytics'
import './styles.css'

initAnalytics()

// shadcn themes on the `dark` class; follow the OS setting.
const scheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyScheme = () => document.documentElement.classList.toggle('dark', scheme.matches)
applyScheme()
scheme.addEventListener('change', applyScheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>
        <App />
      </PostHogErrorBoundary>
    </PostHogProvider>
  </StrictMode>,
)
