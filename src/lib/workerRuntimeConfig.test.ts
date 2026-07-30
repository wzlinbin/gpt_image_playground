import { describe, expect, it } from 'vitest'

import {
  normalizeWorkerApiConfig,
  normalizeWorkerRuntimeConfig,
} from './workerRuntimeConfig'

describe('normalizeWorkerApiConfig', () => {
  it('读取全部非 API Key 配置并忽略 API Key', () => {
    const config = normalizeWorkerApiConfig({
      name: '  Worker 配置  ',
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1/',
      apiKey: '不应读取',
      model: '  gpt-image-test  ',
      timeout: 120,
      apiMode: 'responses',
      reasoningEffort: 'high',
      codexCli: true,
      apiProxy: false,
      responseFormatB64Json: true,
      streamImages: true,
      streamPartialImages: 2,
    })

    expect(config).toEqual({
      name: 'Worker 配置',
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      model: 'gpt-image-test',
      timeout: 120,
      apiMode: 'responses',
      reasoningEffort: 'high',
      codexCli: true,
      apiProxy: false,
      responseFormatB64Json: true,
      streamImages: true,
      streamPartialImages: 2,
    })
    expect(config).not.toHaveProperty('apiKey')
  })

  it('兼容 JSON 字符串并裁剪数值范围', () => {
    expect(normalizeWorkerApiConfig(JSON.stringify({
      provider: 'fal',
      timeout: 999,
      streamPartialImages: -1,
      codexCli: 'false',
    }))).toEqual({
      provider: 'fal',
      timeout: 600,
      streamPartialImages: 0,
      codexCli: false,
    })
  })

  it('忽略无效字段和无效 JSON', () => {
    expect(normalizeWorkerApiConfig({ provider: 'unknown', timeout: 'invalid', apiMode: 'chat', reasoningEffort: 'extreme' })).toBeNull()
    expect(normalizeWorkerApiConfig('{invalid')).toBeNull()
  })
})

describe('normalizeWorkerRuntimeConfig', () => {
  it('读取字符串形式的只读状态和配置对象', () => {
    expect(normalizeWorkerRuntimeConfig(JSON.stringify({
      apiConfigReadOnly: 'true',
      apiConfig: JSON.stringify({ provider: 'openai', model: 'worker-model' }),
    }))).toEqual({
      apiConfigReadOnly: true,
      apiConfig: { provider: 'openai', model: 'worker-model' },
    })
  })

  it('缺失或无效值时返回未配置状态', () => {
    expect(normalizeWorkerRuntimeConfig(null)).toEqual({
      apiConfigReadOnly: null,
      apiConfig: null,
    })
  })
})
