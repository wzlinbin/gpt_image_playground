/// <reference path="../worker-configuration.d.ts" />

const RUNTIME_CONFIG_PATH = '/runtime-config.js'
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
  return `globalThis.${RUNTIME_CONFIG_GLOBAL}=${JSON.stringify({ apiConfigReadOnly, apiConfig })}\n`
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
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
