/// <reference path="../worker-configuration.d.ts" />

const RUNTIME_CONFIG_PATH = '/runtime-config.js'
const HTTP_PROXY_PATH = '/http-proxy'
const RUNTIME_CONFIG_GLOBAL = '__GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__'

interface DashboardEnv extends Env {
  API_CONFIG_READ_ONLY?: unknown
  API_CONFIG_NAME?: unknown
  API_CONFIG_PROVIDER?: unknown
  API_CONFIG_BASE_URL?: unknown
  API_CONFIG_MODEL?: unknown
  API_CONFIG_TIMEOUT?: unknown
  API_CONFIG_MODE?: unknown
  API_CONFIG_REASONING_EFFORT?: unknown
  API_CONFIG_CODEX_CLI?: unknown
  API_CONFIG_API_PROXY?: unknown
  API_CONFIG_RESPONSE_FORMAT_B64_JSON?: unknown
  API_CONFIG_STREAM_IMAGES?: unknown
  API_CONFIG_STREAM_PARTIAL_IMAGES?: unknown
}

export function readDashboardApiConfig(env: DashboardEnv) {
  const config = {
    name: env.API_CONFIG_NAME,
    provider: env.API_CONFIG_PROVIDER,
    baseUrl: env.API_CONFIG_BASE_URL,
    model: env.API_CONFIG_MODEL,
    timeout: env.API_CONFIG_TIMEOUT,
    apiMode: env.API_CONFIG_MODE,
    reasoningEffort: env.API_CONFIG_REASONING_EFFORT,
    codexCli: env.API_CONFIG_CODEX_CLI,
    apiProxy: env.API_CONFIG_API_PROXY,
    responseFormatB64Json: env.API_CONFIG_RESPONSE_FORMAT_B64_JSON,
    streamImages: env.API_CONFIG_STREAM_IMAGES,
    streamPartialImages: env.API_CONFIG_STREAM_PARTIAL_IMAGES,
  }
  const entries = Object.entries(config).filter((entry) => entry[1] !== undefined)
  return entries.length ? Object.fromEntries(entries) : null
}

export function serializeRuntimeConfig(apiConfigReadOnly: unknown, apiConfig: unknown) {
  return `globalThis.${RUNTIME_CONFIG_GLOBAL}=${JSON.stringify({ apiConfigReadOnly, apiConfig, httpProxyAvailable: true })}\n`
}

export async function proxyHttpRequest(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'POST') {
    return new Response('仅支持 GET、HEAD 和 POST 请求', {
      status: 405,
      headers: { Allow: 'GET, HEAD, POST' },
    })
  }

  const requestUrl = new URL(request.url)
  const rawTarget = requestUrl.searchParams.get('url')
  if (!rawTarget) return new Response('缺少 HTTP 目标地址', { status: 400 })

  let target: URL
  try {
    target = new URL(rawTarget)
  } catch {
    return new Response('HTTP 目标地址无效', { status: 400 })
  }

  if (target.protocol !== 'http:') return new Response('仅支持 HTTP 目标地址', { status: 400 })
  if (target.username || target.password) return new Response('HTTP 目标地址不能包含凭据', { status: 400 })
  if (target.hostname === requestUrl.hostname) return new Response('HTTP 目标地址不能指向当前站点', { status: 400 })

  const origin = request.headers.get('Origin')
  if (origin && origin !== requestUrl.origin) return new Response('禁止跨站使用 HTTP 代理', { status: 403 })
  const fetchSite = request.headers.get('Sec-Fetch-Site')
  if (fetchSite && fetchSite !== 'same-origin') return new Response('禁止跨站使用 HTTP 代理', { status: 403 })

  const headers = new Headers(request.headers)
  for (const name of [
    'Connection',
    'Content-Length',
    'Host',
    'Origin',
    'Referer',
    'Sec-Fetch-Dest',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Site',
    'Sec-Fetch-User',
  ]) {
    headers.delete(name)
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'follow',
    })
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('Set-Cookie')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    console.error('HTTP 代理请求失败', err)
    return new Response('HTTP 上游服务不可达', { status: 502 })
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === HTTP_PROXY_PATH) return proxyHttpRequest(request)
    if (url.pathname !== RUNTIME_CONFIG_PATH) return env.ASSETS.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('仅支持 GET 和 HEAD 请求', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      })
    }

    const body = request.method === 'HEAD'
      ? null
      : serializeRuntimeConfig(env.API_CONFIG_READ_ONLY, readDashboardApiConfig(env))
    return new Response(body, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'text/javascript; charset=utf-8',
      },
    })
  },
} satisfies ExportedHandler<DashboardEnv>
