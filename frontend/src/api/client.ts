const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Callback registered by the auth store to handle session expiry.
// Keeps client.ts free of store dependencies.
let onUnauthorized: (() => void) | null = null

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

// Endpoints that must never trigger a token refresh. /refresh itself would
// recurse; the other three return 401 to mean "these credentials are wrong",
// not "this session aged out", so refreshing them is meaningless.
const NO_REFRESH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/refresh',
]

function isRefreshable(path: string): boolean {
  return !NO_REFRESH_PATHS.includes(path.split('?')[0])
}

// The in-flight refresh, shared by every request that 401s while it runs.
// Single-flight is a correctness requirement, not an optimisation: the backend
// rotates and single-uses refresh tokens, so a second concurrent refresh would
// fail, clear the cookies, and log the user out — the bug this exists to fix.
let refreshInFlight: Promise<boolean> | null = null

// Bumped on every completed refresh. A request issued before the current
// generation was 401'd by a token that has since been replaced, so it can be
// replayed directly instead of triggering another rotation.
let refreshGeneration = 0

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => {
        // Only a successful rotation advances the generation.
        if (res.ok) {
          refreshGeneration += 1
        }
        return res.ok
      })
      .catch(() => false) // offline or DNS failure — treat as a failed refresh
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = await res.json()
      if (typeof body.error === 'string') {
        message = body.error
      }
    } catch {
      // ignore parse errors — use the default message
    }
    throw new ApiError(res.status, message)
  }

  // 204 No Content — return undefined cast as T
  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

function buildRequest(method: string, body?: unknown): RequestInit {
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return init
}

// request sends the call and, on a 401, tries once to refresh the session and
// replay it. A game runs longer than the access token lives, so a mid-session
// 401 is expected rather than exceptional. If the refresh fails, behaviour is
// unchanged from before: onUnauthorized() then ApiError(401).
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const generation = refreshGeneration
  const res = await fetch(`${BASE_URL}${path}`, buildRequest(method, body))

  if (res.status !== 401 || !isRefreshable(path)) {
    return handleResponse<T>(res)
  }

  const recovered = refreshGeneration !== generation || (await refreshSession())
  if (!recovered) {
    return handleResponse<T>(res)
  }

  // One replay only. A 401 on the retry falls through to handleResponse.
  const retry = await fetch(`${BASE_URL}${path}`, buildRequest(method, body))
  return handleResponse<T>(retry)
}

export async function get<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export async function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

export async function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}
