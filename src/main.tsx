import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import App from './App.tsx'
import './index.css'

// Force light theme: strip any persisted dark class/setting from previous sessions
try {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
  document.documentElement.style.colorScheme = 'light';
  localStorage.setItem('theme', 'light');
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
