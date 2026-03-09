const BASE_URL = 'http://localhost:8080'

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

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, buildRequest('GET'))
  return handleResponse<T>(res)
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, buildRequest('POST', body))
  return handleResponse<T>(res)
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, buildRequest('PUT', body))
  return handleResponse<T>(res)
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, buildRequest('DELETE'))
  return handleResponse<T>(res)
}
