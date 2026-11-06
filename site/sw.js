const CACHE = 'apegramma-v4';
const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'solver.js',
  'storage.js',
  'input.js',
  'words.txt',
  'manifest.webmanifest',
  'icon.svg',
];

const freshRequests = () => FILES.map((file) => new Request(file, { cache: 'reload' }));

async function reopenPages() {
  const pages = await self.clients.matchAll({ type: 'window' });
  await Promise.all(pages.map((page) => page.navigate(page.url)));
}

async function activate() {
  const keys = await caches.keys();
  const outdated = keys.filter((key) => key !== CACHE);
  await Promise.all(outdated.map((key) => caches.delete(key)));
  await self.clients.claim();
  // Not awaited: a navigation's fetch waits for activation to finish, so awaiting it would deadlock.
  if (outdated.length > 0) reopenPages();
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(freshRequests())).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(activate());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
});
