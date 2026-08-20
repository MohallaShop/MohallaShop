/**
 * Typed client for the FastAPI backend (v1).
 *
 * Callers pass a verified Supabase access token explicitly. Server responses
 * use the envelope `{ error: { code, message, details } }`, surfaced here as
 * :class:`ApiError`.
 */

export interface ApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message)
    this.name = 'ApiError'
    this.status = status
    this.code = shape.code
    this.details = shape.details ?? {}
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

type QueryValue = string | number | boolean | undefined | null
export type QueryParams = Record<string, QueryValue | QueryValue[]>

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serializable request body. */
  body?: unknown
  /** Bearer access token (Supabase), attached as `Authorization`. */
  token?: string | null
  /** Query string parameters. */
  query?: QueryParams
  /** Abort the request after this many milliseconds (default: 15 seconds). */
  timeoutMs?: number
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!query) return base
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) if (v !== undefined && v !== null) search.append(key, String(v))
    } else {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new ApiError(res.status, {
        code: 'invalid_response',
        message: res.ok
          ? 'The service returned an invalid response. Please try again.'
          : 'The service is temporarily unavailable. Please try again.',
      })
    }
  }
  if (!res.ok) {
    const envelope = (data as { error?: ApiErrorShape } | null)?.error ?? {
      code: 'unknown_error',
      message: res.statusText || 'Request failed',
    }
    throw new ApiError(res.status, envelope as ApiErrorShape)
  }
  return data as T
}

export async function apiFetch<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const { body, token, query, headers, timeoutMs = 15_000, signal, ...rest } = opts
  const url = buildUrl(path, query)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      cache: rest.cache ?? 'no-store',
    })
    return await parseResponse<T>(res)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(0, {
      code: 'network_error',
      message: signal?.aborted
        ? 'The request was cancelled.'
        : 'We could not reach MohallaShop. Check your connection and try again.',
    })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const api = {
  get: <T>(path: string, opts?: ApiRequestOptions) => apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, opts?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST' }),
  patch: <T>(path: string, opts?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH' }),
  put: <T>(path: string, opts?: ApiRequestOptions) => apiFetch<T>(path, { ...opts, method: 'PUT' }),
  delete: <T>(path: string, opts?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
}
