import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ShopProvider } from './store.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode><ShopProvider><App /></ShopProvider></StrictMode>,
)
