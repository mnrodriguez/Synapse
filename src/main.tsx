import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { loadCatalog } from './i18n';
import { LOCAL_STORAGE_KEY } from './persistence/saveState';

// Load the saved language before the first render so the game never flashes in the wrong language.
function savedLanguage(): 'es' | 'en' {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    return saved.language === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

loadCatalog(savedLanguage())
  .catch(err => console.warn('Text catalog failed to load; showing English', err))
  .finally(() => createRoot(document.getElementById('root')!).render(<App />));
