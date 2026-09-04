import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const BODYLESS_METHODS = new Set(['GET', 'HEAD'])
const FORWARDED_REQUEST_HEADERS = ['accept', 'authorization', 'content-type', 'x-request-id']
const FORWARDED_RESPONSE_HEADERS = ['content-type']

type RouteContext = {
  params: Promise<{ path: string[] }>
}

function joinUrl(base: string, parts: string[]): string {
  const trimmed = base.replace(/\/+$/, '')
  const path = parts.map((part) => encodeURIComponent(part)).join('/')
  return path ? `${trimmed}/${path}` : trimmed
}

function requestHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

function responseHeaders(response: Response): Headers {
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  const url = new URL(joinUrl(BACKEND_BASE_URL, path ?? []))
  url.search = request.nextUrl.search

  const upstream = await fetch(url, {
    method: request.method,
    headers: requestHeaders(request),
    body: BODYLESS_METHODS.has(request.method) ? undefined : await request.text(),
    cache: 'no-store',
  })

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders(upstream),
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
