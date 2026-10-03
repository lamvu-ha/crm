// Block external HTTP requests in the isolated demo before rendering.
const originalFetch = window.fetch.bind(window);
const originalOpen = window.open.bind(window);
window.open = ((url, ...args) => {
  if (url && new URL(String(url), location.href).origin !== location.origin) {
    alert('Liên kết ngoài đã tắt trong bản demo.');
    return null;
  }
  return originalOpen(url, ...args);
}) as typeof window.open;
document.addEventListener('click', event => {
  const anchor = (event.target as Element)?.closest?.('a');
  if (anchor && !anchor.href.startsWith('blob:') && new URL(anchor.href, location.href).origin !== location.origin) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
window.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (url.origin !== location.origin) return Promise.reject(new Error('Kết nối ngoài đã tắt trong bản demo.'));
  return originalFetch(input, init);
};
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
