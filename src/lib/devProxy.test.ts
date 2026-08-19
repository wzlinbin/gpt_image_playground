import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildApiUrl, buildBrowserFetchUrl } from './devProxy'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildApiUrl', () => {
  it('uses the same-origin proxy prefix when API proxy is enabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'images/edits', null, true)).toBe(
      '/api-proxy/images/edits',
    )
  })

  it('leaves API versioning to the proxy target when proxying', () => {
    expect(buildApiUrl('http://api.example.com', 'images/generations', null, true)).toBe(
      '/api-proxy/images/generations',
    )
  })

  it('uses a configured proxy prefix when one is available', () => {
    expect(
      buildApiUrl(
        'http://api.example.com/v1',
        'responses',
        {
          enabled: true,
          prefix: '/openai-proxy',
          target: 'http://api.example.com/v1',
          changeOrigin: true,
          secure: false,
        },
        true,
      ),
    ).toBe('/openai-proxy/responses')
  })

  it('uses the configured API URL directly when API proxy is disabled', () => {
    expect(buildApiUrl('http://api.example.com/v1', 'responses', null, false)).toBe(
      'http://api.example.com/v1/responses',
    )
  })

  it('uses the Worker proxy for HTTP URLs', () => {
    vi.stubGlobal('__GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__', { httpProxyAvailable: true })

    expect(buildApiUrl('http://api.example.com:8180', 'images/generations', null, false)).toBe(
      '/http-proxy?url=http%3A%2F%2Fapi.example.com%3A8180%2Fv1%2Fimages%2Fgenerations',
    )
    expect(buildBrowserFetchUrl('http://cdn.example.com/image.png?token=abc')).toBe(
      '/http-proxy?url=http%3A%2F%2Fcdn.example.com%2Fimage.png%3Ftoken%3Dabc',
    )
  })

  it('does not rewrite HTTP URLs when the Worker proxy is unavailable', () => {
    vi.stubGlobal('__GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__', {})

    expect(buildBrowserFetchUrl('http://api.example.com/v1')).toBe('http://api.example.com/v1')
  })
})
