import { describe, expect, it, vi } from 'vitest'

import worker, { proxyHttpRequest, readDashboardApiConfig, serializeRuntimeConfig } from './worker'

describe('serializeRuntimeConfig', () => {
  it('生成可同步执行的运行时配置脚本且不包含 API Key', () => {
    const script = serializeRuntimeConfig('true', {
      provider: 'openai',
      model: 'worker-model',
    })

    expect(script).toBe('globalThis.__GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__={"apiConfigReadOnly":"true","apiConfig":{"provider":"openai","model":"worker-model"},"httpProxyAvailable":true}\n')
    expect(script).not.toContain('apiKey')
  })

  it('从 CF 后台独立变量组装全部非 API Key 配置', () => {
    const config = readDashboardApiConfig({
      API_CONFIG_NAME: '后台配置',
      API_CONFIG_PROVIDER: 'openai',
      API_CONFIG_BASE_URL: 'https://dashboard.example.com/v1',
      API_CONFIG_MODEL: 'dashboard-model',
      API_CONFIG_TIMEOUT: '180',
      API_CONFIG_MODE: 'responses',
      API_CONFIG_REASONING_EFFORT: 'high',
      API_CONFIG_CODEX_CLI: 'true',
      API_CONFIG_API_PROXY: 'false',
      API_CONFIG_RESPONSE_FORMAT_B64_JSON: 'true',
      API_CONFIG_STREAM_IMAGES: 'true',
      API_CONFIG_STREAM_PARTIAL_IMAGES: '3',
    } as unknown as Env)

    expect(config).toEqual({
      name: '后台配置',
      provider: 'openai',
      baseUrl: 'https://dashboard.example.com/v1',
      model: 'dashboard-model',
      timeout: '180',
      apiMode: 'responses',
      reasoningEffort: 'high',
      codexCli: 'true',
      apiProxy: 'false',
      responseFormatB64Json: 'true',
      streamImages: 'true',
      streamPartialImages: '3',
    })
    expect(config).not.toHaveProperty('apiKey')
  })

  it('为运行时配置返回不缓存的 JavaScript 响应', async () => {
    const assetsFetch = vi.fn()
    const response = await worker.fetch(
      new Request('https://example.com/runtime-config.js'),
      {
        API_CONFIG_READ_ONLY: 'false',
        API_CONFIG_PROVIDER: 'openai',
        API_CONFIG_MODEL: 'worker-model',
        ASSETS: { fetch: assetsFetch },
      } as unknown as Env,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0')
    expect(response.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8')
    expect(await response.text()).toContain('"model":"worker-model"')
    expect(assetsFetch).not.toHaveBeenCalled()
  })

  it('拒绝运行时配置的写请求并转发其他静态资源请求', async () => {
    const assetsFetch = vi.fn().mockResolvedValue(new Response('静态资源'))
    const env = {
      API_CONFIG_READ_ONLY: 'false',
      ASSETS: { fetch: assetsFetch },
    } as unknown as Env

    const rejected = await worker.fetch(new Request('https://example.com/runtime-config.js', { method: 'POST' }), env)
    const asset = await worker.fetch(new Request('https://example.com/index.html'), env)

    expect(rejected.status).toBe(405)
    expect(rejected.headers.get('Allow')).toBe('GET, HEAD')
    expect(await rejected.text()).toBe('仅支持 GET 和 HEAD 请求')
    expect(await asset.text()).toBe('静态资源')
    expect(assetsFetch).toHaveBeenCalledOnce()
  })
})

describe('proxyHttpRequest', () => {
  it('转发同源页面发起的 HTTP POST 请求并保留上游响应', async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'secret=value',
      },
    }))
    vi.stubGlobal('fetch', upstreamFetch)

    const response = await proxyHttpRequest(new Request(
      'https://playground.example.com/http-proxy?url=http%3A%2F%2Fimage.example.com%3A8180%2Fv1%2Fimages%2Fgenerations',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
          Origin: 'https://playground.example.com',
          'Sec-Fetch-Site': 'same-origin',
        },
        body: '{"prompt":"test"}',
      },
    ))

    expect(response.status).toBe(201)
    expect(await response.text()).toBe('{"ok":true}')
    expect(response.headers.has('Set-Cookie')).toBe(false)
    expect(upstreamFetch).toHaveBeenCalledOnce()
    const [target, init] = upstreamFetch.mock.calls[0]
    expect(String(target)).toBe('http://image.example.com:8180/v1/images/generations')
    expect(init.method).toBe('POST')
    expect(init.headers.get('Authorization')).toBe('Bearer test-key')
    expect(init.headers.has('Origin')).toBe(false)
  })

  it('拒绝非 HTTP、跨站和回环目标', async () => {
    const httpsTarget = await proxyHttpRequest(new Request('https://playground.example.com/http-proxy?url=https%3A%2F%2Fapi.example.com'))
    const crossSite = await proxyHttpRequest(new Request('https://playground.example.com/http-proxy?url=http%3A%2F%2Fapi.example.com', {
      headers: { Origin: 'https://other.example.com' },
    }))
    const loop = await proxyHttpRequest(new Request('https://playground.example.com/http-proxy?url=http%3A%2F%2Fplayground.example.com%2Fhttp-proxy'))

    expect(httpsTarget.status).toBe(400)
    expect(crossSite.status).toBe(403)
    expect(loop.status).toBe(400)
  })
})
