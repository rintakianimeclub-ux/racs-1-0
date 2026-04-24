/* Rintaki Anime Club Society — Service Worker
 *
 * Strategy:
 *   - Precache the app shell (HTML + built JS/CSS) so the app launches instantly
 *     and works on first load without a network connection.
 *   - Network-first for `/api/*` calls (so data is always fresh when online),
 *     with a cached fallback when offline.
 *   - Cache-first for static assets (built bundles, icons, fonts, images),
 *     revalidating in the background.
 *   - When a page is requested offline and hasn't been cached, fall back to
 *     the cached index.html so the SPA router can render a friendly
 *     "You're offline" screen.
 */

const VERSION = "rintaki-v1.0.0";
const APP_SHELL_CACHE = `app-shell-${VERSION}`;
const STATIC_CACHE    = `static-${VERSION}`;
const API_CACHE       = `api-${VERSION}`;
const PAGES_CACHE     = `pages-${VERSION}`;

// Files that must be available offline on day one.
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // Clean up old-version caches on a new deploy.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isApi(url) {
  return url.pathname.startsWith("/api/");
}
function isStatic(url) {
  if (url.origin !== self.location.origin) return false;
  return /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|ico)$/i.test(url.pathname)
      || url.pathname.startsWith("/icons/")
      || url.pathname.startsWith("/static/");
}
function isNavigate(req) {
  return req.mode === "navigate";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // --- Navigations (HTML) ---
  // Network-first, fall back to cached index.html so the SPA renders.
  if (isNavigate(req)) {
    event.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(PAGES_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }

  // --- API calls ---
  // Network-first with cached fallback, so offline users still see their last data.
  if (isApi(url)) {
    // Don't cache upload POSTs or large media streams
    if (url.pathname.startsWith("/api/uploads/")) return;
    event.respondWith(
      fetch(req).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(API_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // --- Static assets ---
  // Cache-first with background revalidate (stale-while-revalidate).
  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// Let the page trigger an immediate SW update without waiting for the next page load.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
