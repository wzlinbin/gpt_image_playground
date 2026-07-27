import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDefaultFalProfile,
  createDefaultOpenAIProfile,
  DEFAULT_IMAGES_MODEL,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from './apiProfiles'
import { buildSettingsFromUrlParams, clearUrlSettingParams, hasUrlSettingParams } from './urlSettings'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

async function importDefaultConfigOnlyUrlSettings(defaultApiUrl = 'https://default.example.com/v1') {
  vi.resetModules()
  vi.stubEnv('VITE_SHOW_DEFAULT_CONFIG_ONLY', 'true')
  vi.stubEnv('VITE_DEFAULT_API_URL', defaultApiUrl)
  return import('./urlSettings')
}

async function importApiKeyPromptUrlSettings() {
  vi.resetModules()
  vi.stubEnv('VITE_SHOW_DEFAULT_CONFIG_ONLY', 'true')
  vi.stubEnv('VITE_REQUIRE_API_KEY_PROMPT', 'true')
  vi.stubEnv('VITE_DEFAULT_API_URL', 'https://api.api2cn.com')
  return import('./urlSettings')
}

describe('URL settings params', () => {
  it('creates and activates a new OpenAI profile for legacy URL params', () => {
    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1&apiKey=test-key')),
    })

    expect(next.profiles).toHaveLength(2)
    expect(next.activeProfileId).not.toBe(current.activeProfileId)
    expect(next.profiles.find((profile) => profile.id === next.activeProfileId)).toMatchObject({
      name: 'URL 参数配置',
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: DEFAULT_IMAGES_MODEL,
    })
  })

  it('uses model from URL params for OpenAI profiles', () => {
    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1&apiKey=test-key&model=custom-image-model')),
    })

    expect(next.profiles.find((profile) => profile.id === next.activeProfileId)).toMatchObject({
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      model: 'custom-image-model',
      apiMode: 'images',
    })
  })

  it('uses profile name from URL params for OpenAI profiles', () => {
    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1&apiKey=test-key&profileName=测试配置')),
    })

    expect(next.profiles.find((profile) => profile.id === next.activeProfileId)).toMatchObject({
      name: '测试配置',
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
    })
  })

  it('does not create a duplicate profile for matching legacy URL params', () => {
    const existingProfile = createDefaultOpenAIProfile({
      id: 'existing-openai',
      name: 'Existing OpenAI',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
    })
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [createDefaultOpenAIProfile(), existingProfile],
      activeProfileId: DEFAULT_SETTINGS.activeProfileId,
    })
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1/&apiKey=test-key')),
    })

    expect(next.profiles).toHaveLength(2)
    expect(next.activeProfileId).toBe(existingProfile.id)
  })

  it('creates a separate profile when URL profile name differs', () => {
    const existingProfile = createDefaultOpenAIProfile({
      id: 'existing-openai',
      name: 'Existing OpenAI',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
    })
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [createDefaultOpenAIProfile(), existingProfile],
      activeProfileId: DEFAULT_SETTINGS.activeProfileId,
    })
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1/&apiKey=test-key&profileName=URL Profile')),
    })
    const activeProfile = next.profiles.find((profile) => profile.id === next.activeProfileId)

    expect(next.profiles).toHaveLength(3)
    expect(next.activeProfileId).not.toBe(existingProfile.id)
    expect(activeProfile).toMatchObject({
      name: 'URL Profile',
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
    })
  })

  it('creates a separate profile when URL codex CLI option differs', () => {
    const existingProfile = createDefaultOpenAIProfile({
      id: 'existing-openai',
      name: 'Existing OpenAI',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      codexCli: false,
    })
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [createDefaultOpenAIProfile(), existingProfile],
      activeProfileId: DEFAULT_SETTINGS.activeProfileId,
    })
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1/&apiKey=test-key&codexCli=true')),
    })
    const activeProfile = next.profiles.find((profile) => profile.id === next.activeProfileId)

    expect(next.profiles).toHaveLength(3)
    expect(next.activeProfileId).not.toBe(existingProfile.id)
    expect(activeProfile).toMatchObject({
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      codexCli: true,
    })
  })

  it('creates a separate profile when URL streaming options differ', () => {
    const existingProfile = createDefaultOpenAIProfile({
      id: 'existing-openai',
      name: 'Existing OpenAI',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      streamImages: true,
      streamPartialImages: 0,
    })
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [createDefaultOpenAIProfile(), existingProfile],
      activeProfileId: DEFAULT_SETTINGS.activeProfileId,
    })
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1/&apiKey=test-key&streamImages=true&streamPartialImages=3')),
    })
    const activeProfile = next.profiles.find((profile) => profile.id === next.activeProfileId)

    expect(next.profiles).toHaveLength(3)
    expect(next.activeProfileId).not.toBe(existingProfile.id)
    expect(activeProfile).toMatchObject({
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'test-key',
      streamImages: true,
      streamPartialImages: 3,
    })
  })

  it('creates an OpenAI profile from legacy params even when fal is active', () => {
    const falProfile = createDefaultFalProfile({ id: 'fal-active', apiKey: 'fal-key' })
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [falProfile],
      activeProfileId: falProfile.id,
    })
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1&apiKey=openai-key')),
    })

    expect(next.profiles).toHaveLength(2)
    expect(next.profiles.find((profile) => profile.id === next.activeProfileId)).toMatchObject({
      provider: 'openai',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'openai-key',
    })
  })

  it('clears known URL setting params without touching unrelated params', () => {
    const params = new URLSearchParams('apiUrl=https://api.example.com/v1&apiKey=test-key&model=test-model&profileName=test-profile&streamImages=false&streamPartialImages=3&foo=bar')

    expect(hasUrlSettingParams(params)).toBe(true)
    clearUrlSettingParams(params)

    expect(params.toString()).toBe('foo=bar')
  })

  it('imports settings with custom providers from URL params', () => {
    const importedSettings = {
      customProviders: [{
        id: 'custom-json',
        name: 'Custom JSON',
        submit: {
          path: 'images/generations',
          method: 'POST',
          contentType: 'json',
          body: { model: '$profile.model', prompt: '$prompt' },
          result: { imageUrlPaths: ['data.*.url'], b64JsonPaths: [] },
        },
      }],
      profiles: [{
        id: 'custom-profile',
        name: 'Custom Profile',
        provider: 'custom-json',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'custom-key',
        model: 'custom-model',
        timeout: 300,
        apiMode: 'images',
        codexCli: false,
        apiProxy: false,
      }],
    }
    const params = new URLSearchParams()
    params.set('settings', JSON.stringify(importedSettings))

    const next = normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...buildSettingsFromUrlParams(DEFAULT_SETTINGS, params),
    })

    expect(next.customProviders).toHaveLength(1)
    expect(next.customProviders[0]).toMatchObject({ id: 'custom-json', name: 'Custom JSON' })
    expect(next.activeProfileId).toBe('custom-profile')
    expect(next.profiles[0]).toMatchObject({
      id: 'custom-profile',
      provider: 'custom-json',
      apiKey: 'custom-key',
      model: 'custom-model',
    })
  })

  it('activates the first profile imported from URL settings when current settings are customized', () => {
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [createDefaultOpenAIProfile({
        id: 'current-openai',
        name: 'Current OpenAI',
        baseUrl: 'https://current.example.com/v1',
        apiKey: 'current-key',
        model: 'current-model',
      })],
      activeProfileId: 'current-openai',
    })
    const importedSettings = {
      customProviders: [{
        id: 'custom-json',
        name: 'Custom JSON',
        submit: {
          path: 'images/generations',
          method: 'POST',
          contentType: 'json',
          body: { model: '$profile.model', prompt: '$prompt' },
          result: { imageUrlPaths: ['data.*.url'], b64JsonPaths: [] },
        },
      }],
      profiles: [{
        id: 'custom-profile',
        name: 'Custom Profile',
        provider: 'custom-json',
        baseUrl: 'https://api.example.com/v1',
        apiKey: 'custom-key',
        model: 'custom-model',
        timeout: 300,
        apiMode: 'images',
        codexCli: false,
        apiProxy: false,
      }],
    }
    const params = new URLSearchParams()
    params.set('settings', JSON.stringify(importedSettings))

    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, params),
    })
    const activeProfile = next.profiles.find((profile) => profile.id === next.activeProfileId)

    expect(next.activeProfileId).not.toBe('current-openai')
    expect(activeProfile).toMatchObject({
      provider: 'custom-json',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'custom-key',
      model: 'custom-model',
    })
  })

  it('imports custom provider settings wrapper from URL params', () => {
    const params = new URLSearchParams()
    params.set('settings', JSON.stringify({
      version: 1,
      settings: {
        customProviders: [{
          id: 'wrapped-custom',
          name: 'Wrapped Custom',
          submit: {
            path: 'images/generations',
            method: 'POST',
            contentType: 'json',
            body: { model: '$profile.model', prompt: '$prompt' },
            result: { imageUrlPaths: ['data.*.url'], b64JsonPaths: [] },
          },
        }],
        profiles: [{
          id: 'wrapped-profile',
          name: 'Wrapped Profile',
          provider: 'wrapped-custom',
          baseUrl: 'https://wrapped.example.com/v1',
          apiKey: 'wrapped-key',
          model: 'wrapped-model',
          timeout: 300,
          apiMode: 'images',
          codexCli: false,
          apiProxy: false,
        }],
      },
    }))

    const next = normalizeSettings({
      ...DEFAULT_SETTINGS,
      ...buildSettingsFromUrlParams(DEFAULT_SETTINGS, params),
    })

    expect(next.customProviders).toHaveLength(1)
    expect(next.customProviders[0]).toMatchObject({ id: 'wrapped-custom', name: 'Wrapped Custom' })
    expect(next.profiles).toHaveLength(1)
    expect(next.profiles[0]).toMatchObject({
      id: 'wrapped-profile',
      provider: 'wrapped-custom',
      baseUrl: 'https://wrapped.example.com/v1',
      apiKey: 'wrapped-key',
      model: 'wrapped-model',
    })
  })

  it('只读模式只允许查询参数覆盖 API Key', async () => {
    const { buildSettingsFromUrlParams } = await importDefaultConfigOnlyUrlSettings()
    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams('apiUrl=https://api.example.com/v1&apiKey=test-key&model=custom-model&profileName=导入配置&apiMode=responses')),
    })

    expect(next.profiles).toHaveLength(1)
    expect(next.customProviders).toHaveLength(0)
    expect(next.activeProfileId).toBe(current.activeProfileId)
    expect(next.profiles[0]).toMatchObject({
      id: current.activeProfileId,
      provider: 'openai',
      name: '默认',
      baseUrl: 'https://default.example.com/v1',
      apiKey: 'test-key',
      model: DEFAULT_IMAGES_MODEL,
      apiMode: 'images',
    })
  })

  it('ignores imported custom providers and non-default provider profiles when only default config is shown', async () => {
    const { buildSettingsFromUrlParams } = await importDefaultConfigOnlyUrlSettings()
    const importedSettings = {
      customProviders: [{
        id: 'custom-json',
        name: 'Custom JSON',
        submit: {
          path: 'images/generations',
          method: 'POST',
          contentType: 'json',
          body: { model: '$profile.model', prompt: '$prompt' },
          result: { imageUrlPaths: ['data.*.url'], b64JsonPaths: [] },
        },
      }],
      profiles: [{
        id: 'custom-profile',
        name: 'Custom Profile',
        provider: 'custom-json',
        baseUrl: 'https://custom.example.com/v1',
        apiKey: 'custom-key',
        model: 'custom-model',
        timeout: 300,
        apiMode: 'images',
        codexCli: false,
        apiProxy: false,
      }],
    }
    const params = new URLSearchParams()
    params.set('settings', JSON.stringify(importedSettings))

    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, params),
    })

    expect(next.profiles).toHaveLength(1)
    expect(next.customProviders).toHaveLength(0)
    expect(next.activeProfileId).toBe(current.activeProfileId)
    expect(next.profiles[0]).toMatchObject({
      provider: 'openai',
      baseUrl: current.profiles[0].baseUrl,
      apiKey: current.profiles[0].apiKey,
      model: current.profiles[0].model,
    })
  })

  it('只读模式忽略除 API Key 外的全部查询参数', async () => {
    const { buildSettingsFromUrlParams } = await importDefaultConfigOnlyUrlSettings()
    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, new URLSearchParams(
        'apiUrl=https%3A%2F%2Fchanged.example.com&profileName=用户修改&apiKey=url-key&model=url-model',
      )),
    })

    expect(next.profiles).toHaveLength(1)
    expect(next.profiles[0]).toMatchObject({
      name: '默认',
      provider: 'openai',
      baseUrl: 'https://default.example.com/v1',
      apiKey: 'url-key',
      model: DEFAULT_IMAGES_MODEL,
    })
  })

  it('只读模式仅从匹配的导入配置读取 API Key', async () => {
    const { buildSettingsFromUrlParams } = await importDefaultConfigOnlyUrlSettings()
    const importedSettings = {
      customProviders: [{
        id: 'custom-json',
        name: 'Custom JSON',
        submit: {
          path: 'images/generations',
          method: 'POST',
          contentType: 'json',
          body: { model: '$profile.model', prompt: '$prompt' },
          result: { imageUrlPaths: ['data.*.url'], b64JsonPaths: [] },
        },
      }],
      profiles: [{
        id: 'custom-profile',
        name: 'Custom Profile',
        provider: 'custom-json',
        baseUrl: 'https://custom.example.com/v1',
        apiKey: 'custom-key',
        model: 'custom-model',
        timeout: 300,
        apiMode: 'images',
        codexCli: false,
        apiProxy: false,
      }, {
        id: 'openai-profile',
        name: 'OpenAI Profile',
        provider: 'openai',
        baseUrl: 'https://openai.example.com/v1',
        apiKey: 'openai-key',
        model: 'openai-model',
        timeout: 120,
        apiMode: 'responses',
        codexCli: true,
        apiProxy: true,
      }],
    }
    const params = new URLSearchParams()
    params.set('settings', JSON.stringify(importedSettings))

    const current = normalizeSettings(DEFAULT_SETTINGS)
    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, params),
    })

    expect(next.profiles).toHaveLength(1)
    expect(next.customProviders).toHaveLength(0)
    expect(next.activeProfileId).toBe(current.activeProfileId)
    expect(next.profiles[0]).toMatchObject({
      id: current.activeProfileId,
      provider: 'openai',
      name: '默认',
      baseUrl: 'https://default.example.com/v1',
      apiKey: 'openai-key',
      model: DEFAULT_IMAGES_MODEL,
      timeout: 600,
      apiMode: 'images',
      codexCli: false,
      apiProxy: false,
    })
  })

  it('只读模式不切换自定义服务商且仅更新 API Key', async () => {
    const { buildSettingsFromUrlParams } = await importDefaultConfigOnlyUrlSettings('https://default.example.com/provider.json')
    const customProvider = {
      id: 'custom-default',
      name: 'Custom Default',
      submit: {
        path: 'images/generations',
        method: 'POST' as const,
        contentType: 'json' as const,
        body: { model: '$profile.model', prompt: '$prompt' },
        result: { imageUrlPaths: ['data.*.url'], b64JsonPaths: [] },
      },
    }
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      customProviders: [customProvider],
      profiles: [{
        ...createDefaultOpenAIProfile({ id: 'custom-default-profile' }),
        name: 'Custom Default Profile',
        provider: customProvider.id,
        baseUrl: 'https://custom-default.example.com/v1',
        apiKey: 'custom-default-key',
        model: 'custom-default-model',
      }],
      activeProfileId: 'custom-default-profile',
    })
    const params = new URLSearchParams()
    params.set('settings', JSON.stringify({
      customProviders: [{
        id: 'another-custom',
        name: 'Another Custom',
        submit: customProvider.submit,
      }],
      profiles: [{
        id: 'openai-profile',
        name: 'Ignored OpenAI',
        provider: 'openai',
        baseUrl: 'https://openai.example.com/v1',
        apiKey: 'openai-key',
        model: 'openai-model',
        timeout: 120,
        apiMode: 'responses',
        codexCli: true,
        apiProxy: true,
      }, {
        id: 'matching-custom-profile',
        name: 'Patched Custom Default',
        provider: customProvider.id,
        baseUrl: 'https://patched-custom.example.com/v1',
        apiKey: 'patched-custom-key',
        model: 'patched-custom-model',
        timeout: 240,
        apiMode: 'images',
        codexCli: false,
        apiProxy: false,
      }],
    }))

    const next = normalizeSettings({
      ...current,
      ...buildSettingsFromUrlParams(current, params),
    })

    expect(next.customProviders).toHaveLength(1)
    expect(next.customProviders[0].id).toBe(customProvider.id)
    expect(next.profiles).toHaveLength(1)
    expect(next.activeProfileId).toBe(current.activeProfileId)
    expect(next.profiles[0]).toMatchObject({
      id: current.activeProfileId,
      provider: customProvider.id,
      name: 'Custom Default Profile',
      baseUrl: 'https://custom-default.example.com/v1',
      apiKey: 'patched-custom-key',
      model: 'custom-default-model',
      timeout: 600,
      apiMode: 'images',
    })
  })

  it('ignores every URL API setting when the API key prompt is required', async () => {
    const { buildSettingsFromUrlParams } = await importApiKeyPromptUrlSettings()
    const current = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [createDefaultOpenAIProfile({ apiKey: 'saved-key' })],
    })
    const params = new URLSearchParams(
      'apiUrl=https%3A%2F%2Fchanged.example.com&apiKey=url-key&model=url-model&apiMode=responses&codexCli=true&streamImages=true&streamPartialImages=3',
    )
    params.set('settings', JSON.stringify({
      profiles: [createDefaultOpenAIProfile({
        apiKey: 'json-key',
        model: 'json-model',
        timeout: 10,
        responseFormatB64Json: true,
      })],
    }))

    expect(buildSettingsFromUrlParams(current, params)).toEqual({})
  })
})
