// Kill-switch: immediately unregisters any previously installed service worker.
// This runs as an update to the old sw.js, replacing it with a no-op that cleans itself up.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.registration.unregister())
