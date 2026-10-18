import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/caladea/latin-400.css';
import '@fontsource/caladea/latin-700.css';
import '@fontsource/carlito/latin-400.css';
import '@fontsource/carlito/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/componentes.css';
import App from './App';
import { solicitarPersistencia } from './db/db';

registerSW({ immediate: true });
solicitarPersistencia();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
