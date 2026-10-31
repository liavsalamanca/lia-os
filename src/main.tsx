import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './app/Shell';
import { setStore, Store } from './app/store';
import { UIProvider } from './app/ui';
import { IndexedDbRepository } from './data/idb';
import { migrateLegacy, type MigrationResult } from './data/legacy';
import { allModules } from './modules/registry';
import './index.css';

const CORRUPT_NOTICE = 'No pudimos leer los datos de la versión anterior. Siguen intactos: descárgalos desde Configuración.';
const LEGACY_CACHE = 'lia-os-static-v1';

function App({ notice }: { notice: string | null }) {
  return (
    <HashRouter>
      <UIProvider>
        <Routes>
          <Route element={<Shell notice={notice} />}>
            <Route index element={<Navigate to="/overview" replace />} />
            {allModules.map(({ path, page: Page }) => (
              <Route key={path} path={path} element={<Page />} />
            ))}
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
      </UIProvider>
    </HashRouter>
  );
}

function noticeFor(result: MigrationResult) {
  return result.status === 'corrupt' ? CORRUPT_NOTICE : null;
}

async function start() {
  const root = createRoot(document.getElementById('root')!);
  try {
    const repo = await IndexedDbRepository.open();
    const migration = await migrateLegacy(repo);
    const snapshot = await repo.load();
    document.documentElement.dataset.theme = snapshot.settings.theme;
    setStore(new Store(repo, snapshot));
    root.render(
      <StrictMode>
        <App notice={noticeFor(migration)} />
      </StrictMode>,
    );
  } catch {
    // Sin almacenamiento no se arranca vacío: podría parecer que los datos se perdieron.
    root.render(
      <main style={{ maxWidth: 480, margin: '20vh auto', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>LIA OS no pudo abrir tus datos</h1>
        <p>Tus datos no se han modificado. Revisa que el navegador permita el almacenamiento del sitio y que no estés en modo privado, y vuelve a cargar la página.</p>
      </main>,
    );
  }
}

void start();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Registro directo: el ayudante del plugin recarga la página y podría perder un formulario abierto.
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  // Tras una actualización, los archivos antiguos de una página no visitada ya no existen.
  window.addEventListener('vite:preloadError', () => window.location.reload());
  // Workbox no gestiona la caché de la versión 1, y su worker la recrea mientras siga activo.
  const clearLegacyCache = () => void caches.delete(LEGACY_CACHE);
  clearLegacyCache();
  navigator.serviceWorker.addEventListener('controllerchange', clearLegacyCache);
}
