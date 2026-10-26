import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useTheme } from './app/useTheme'
import { LoginGate } from './auth/LoginGate'
import './styles/tokens.css'
import './styles/content.css'
import './styles/app.css'
import './styles/paged.css'

function Root() {
  // Owned here so the sign-in screen and the app share one light/dark choice.
  const theme = useTheme()
  return (
    <LoginGate>{session => <App session={session} theme={theme} />}</LoginGate>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
