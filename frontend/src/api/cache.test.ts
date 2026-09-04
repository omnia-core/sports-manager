import { describe, it, expect, beforeEach, vi } from 'vitest'
import { claimCaches, releaseCaches } from './cache'

// The service worker caches GET /api reads keyed by URL alone. These guard the
// session boundary that keeps one person's cached data from being served to
// the next person on a shared device. They were written against SM-14 and run
// out-of-tree at the time, because no test runner existed yet.

const PRECACHE = 'workbox-precache-v2-http://localhost:3000/'
const API_CACHES = ['api-teams', 'api-playbooks', 'api-plays']

let names: string[]
let store: Record<string, string>

function installFakes(initial: string[], owner?: string) {
  names = [...initial]
  store = owner === undefined ? {} : { 'sm.cache-owner': owner }

  vi.stubGlobal('caches', {
    keys: () => Promise.resolve([...names]),
    delete: (n: string) => {
      const i = names.indexOf(n)
      if (i < 0) return Promise.resolve(false)
      names.splice(i, 1)
      return Promise.resolve(true)
    },
  })
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
  })
}

describe('API cache session boundaries', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('purges the API caches when a different user signs in, keeping the precache', async () => {
    installFakes([PRECACHE, ...API_CACHES], 'coach-a')
    await claimCaches('coach-b')
    expect(names).toEqual([PRECACHE])
  })

  it('records the new owner on sign-in', async () => {
    installFakes([PRECACHE, ...API_CACHES], 'coach-a')
    await claimCaches('coach-b')
    expect(store['sm.cache-owner']).toBe('coach-b')
  })

  it('keeps the cache when the same user returns, so offline reads still work', async () => {
    installFakes([PRECACHE, ...API_CACHES], 'coach-a')
    await claimCaches('coach-a')
    expect(names).toEqual([PRECACHE, ...API_CACHES])
  })

  it('purges when the device has no recorded owner, failing safe', async () => {
    installFakes([PRECACHE, ...API_CACHES])
    await claimCaches('coach-a')
    expect(names).toEqual([PRECACHE])
  })

  it('purges and clears the owner on logout', async () => {
    installFakes([PRECACHE, ...API_CACHES], 'coach-a')
    await releaseCaches()
    expect(names).toEqual([PRECACHE])
    expect(store['sm.cache-owner']).toBeUndefined()
  })

  it('purges a runtime cache added later without needing to know its name', async () => {
    installFakes([PRECACHE, ...API_CACHES, 'api-games'], 'coach-a')
    await releaseCaches()
    expect(names).toEqual([PRECACHE])
  })

  it('does not throw when storage is unavailable', async () => {
    vi.stubGlobal('caches', {
      keys: () => Promise.reject(new Error('denied')),
      delete: () => Promise.resolve(false),
    })
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
      removeItem: () => { throw new Error('denied') },
    })
    await expect(claimCaches('coach-a')).resolves.toBeUndefined()
    await expect(releaseCaches()).resolves.toBeUndefined()
  })
})
