import type { ApiMode, BuiltInApiProvider } from '../types'

import { normalizeStreamPartialImages } from './defaultApiUrl'
import { normalizeBaseUrl } from './devProxy'

export interface WorkerApiConfig {
  name?: string
  provider?: BuiltInApiProvider
  baseUrl?: string
  model?: string
  timeout?: number
  apiMode?: ApiMode
  codexCli?: boolean
  apiProxy?: boolean
  responseFormatB64Json?: boolean
  streamImages?: boolean
  streamPartialImages?: number
}

export interface WorkerRuntimeConfig {
  apiConfigReadOnly: boolean | null
  apiConfig: WorkerApiConfig | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return undefined
}

export function normalizeWorkerApiConfig(input: unknown): WorkerApiConfig | null {
  const record = parseJsonObject(input)
  if (!record) return null

  const config: WorkerApiConfig = {}
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const baseUrl = typeof record.baseUrl === 'string' ? normalizeBaseUrl(record.baseUrl) : undefined
  const model = typeof record.model === 'string' ? record.model.trim() : ''
  const timeout = Number(record.timeout)
  const provider = record.provider === 'openai' || record.provider === 'fal' ? record.provider : undefined
  const apiMode = record.apiMode === 'images' || record.apiMode === 'responses' ? record.apiMode : undefined
  const codexCli = normalizeBoolean(record.codexCli)
  const apiProxy = normalizeBoolean(record.apiProxy)
  const responseFormatB64Json = normalizeBoolean(record.responseFormatB64Json)
  const streamImages = normalizeBoolean(record.streamImages)

  if (name) config.name = name
  if (provider) config.provider = provider
  if (baseUrl !== undefined) config.baseUrl = baseUrl
  if (model) config.model = model
  if (Number.isFinite(timeout)) config.timeout = Math.min(600, Math.max(10, Math.trunc(timeout)))
  if (apiMode) config.apiMode = apiMode
  if (codexCli !== undefined) config.codexCli = codexCli
  if (apiProxy !== undefined) config.apiProxy = apiProxy
  if (responseFormatB64Json !== undefined) config.responseFormatB64Json = responseFormatB64Json
  if (streamImages !== undefined) config.streamImages = streamImages
  if (record.streamPartialImages !== undefined) config.streamPartialImages = normalizeStreamPartialImages(record.streamPartialImages)

  return Object.keys(config).length ? config : null
}

export function normalizeWorkerRuntimeConfig(input: unknown): WorkerRuntimeConfig {
  const record = parseJsonObject(input)
  return {
    apiConfigReadOnly: record ? normalizeBoolean(record.apiConfigReadOnly) ?? null : null,
    apiConfig: record ? normalizeWorkerApiConfig(record.apiConfig) : null,
  }
}

export function readWorkerRuntimeConfig(): WorkerRuntimeConfig {
  return normalizeWorkerRuntimeConfig(
    typeof __GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__ === 'undefined'
      ? null
      : __GPT_IMAGE_PLAYGROUND_WORKER_CONFIG__,
  )
}
