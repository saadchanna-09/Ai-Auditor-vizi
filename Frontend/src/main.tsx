import './index.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.js'; // Agar NodeNext set hai toh TypeScript compiled source (.js) ka path mangta hai

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
