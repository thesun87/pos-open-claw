import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SyncTriggerRegistrar } from './sync-trigger-registrar'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SyncTriggerRegistrar />
    <App />
  </StrictMode>,
)
