import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// shadcn themes on the `dark` class; follow the OS setting.
const scheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyScheme = () => document.documentElement.classList.toggle('dark', scheme.matches)
applyScheme()
scheme.addEventListener('change', applyScheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
