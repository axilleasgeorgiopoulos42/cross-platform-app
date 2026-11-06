// Registers the offline service worker (/sw.js, written by scripts/pwa-postbuild.js).
// Production builds only; failures are logged, never thrown (the app works without it).
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((e) => console.warn('Service worker registration failed:', e));
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
