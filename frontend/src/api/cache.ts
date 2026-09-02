// Session boundaries for the service worker's response cache.
//
// The SW caches GET /api reads with NetworkFirst (see vite.config.ts) so the
// app still renders on gym wifi. Those entries are keyed by URL alone, so they
// outlive the session that fetched them: on a device more than one person signs
// into, the next session can be served the previous one's data whenever the
// network is slow enough for NetworkFirst to fall back to the cache.
//
// Only the Workbox precache holds session-independent data (JS, CSS, icons).
// Every other cache is treated as session data and dropped at the boundary, so
// a runtime cache added later is covered without touching this file.

const OWNER_KEY = 'sm.cache-owner'
const PRECACHE_PREFIX = 'workbox-precache'

function readOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — treat as unknown
    return null
  }
}

function writeOwner(userID: string | null) {
  try {
    if (userID === null) {
      localStorage.removeItem(OWNER_KEY)
    } else {
      localStorage.setItem(OWNER_KEY, userID)
    }
  } catch {
    // Nothing recorded means the next sign-in purges — fail safe, not silent-stale
  }
}

async function purgeSessionCaches(): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const names = await caches.keys()
    await Promise.all(
      names.filter((name) => !name.startsWith(PRECACHE_PREFIX)).map((name) => caches.delete(name)),
    )
  } catch {
    // CacheStorage is unavailable (insecure context, storage disabled) — nothing cached to clear
  }
}

// Called when a user signs in. Purges when this device last cached for someone
// else, which also covers sessions that ended without a clean logout (tab
// closed, token expired, browser crash). Await before rendering authenticated
// views so no fetch can race the purge.
export async function claimCaches(userID: string): Promise<void> {
  if (readOwner() !== userID) {
    await purgeSessionCaches()
  }
  writeOwner(userID)
}

// Called when a session ends — explicit logout, or a 401 that could not be
// recovered. Leaves the device with nothing of that session's data.
export async function releaseCaches(): Promise<void> {
  await purgeSessionCaches()
  writeOwner(null)
}
