import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import SharedGalleryPage from './pages/SharedGalleryPage.jsx'
import './index.css'

const path = window.location.pathname;
const shareMatch = path.match(/^\/share\/([a-zA-Z0-9_-]+)\/?$/);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareMatch ? (
      <SharedGalleryPage token={shareMatch[1]} />
    ) : (
      <App />
    )}
  </StrictMode>,
)
