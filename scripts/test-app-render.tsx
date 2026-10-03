import { createRequire } from 'node:module';

const demoRequire = createRequire(new URL('../demo-isolated/package.json', import.meta.url));
const React: typeof import('react') = demoRequire('react');
const { renderToString }: typeof import('react-dom/server') = demoRequire('react-dom/server');

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key)
}, configurable: true });
const { default: App } = await import('../demo-isolated/src/App');
const html = renderToString(React.createElement(App));
if (!html.includes('login-password-input')) throw new Error('Login form did not render');
console.log('PASS: demo App renders the login form without a runtime exception');
