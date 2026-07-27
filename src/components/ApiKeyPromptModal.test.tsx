// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../lib/apiProfiles'
import { useStore } from '../store'
import ApiKeyPromptModal from './ApiKeyPromptModal'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../lib/apiProfiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/apiProfiles')>()
  return { ...actual, isApiKeyPromptRequired: () => true }
})

vi.mock('../store', async () => {
  const { create } = await import('zustand')
  const useStore = create<{
    settings: { apiKey: string }
    setSettings: (settings: { apiKey?: string }) => void
  }>((set) => ({
    settings: { apiKey: '' },
    setSettings: (settings) => set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
  }))
  return { useStore }
})

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderModal(ready = true) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root?.render(<ApiKeyPromptModal ready={ready} />))
}

beforeEach(() => {
  useStore.getState().setSettings({ ...DEFAULT_SETTINGS, apiKey: '' })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('ApiKeyPromptModal', () => {
  it('waits for initialization and stays hidden when a key already exists', async () => {
    await renderModal(false)
    expect(document.querySelector('[data-api-key-prompt]')).toBeNull()

    await act(async () => root?.render(<ApiKeyPromptModal ready />))
    expect(document.querySelector('[data-api-key-prompt]')).not.toBeNull()

    await act(async () => useStore.getState().setSettings({ apiKey: 'saved-key' }))
    expect(document.querySelector('[data-api-key-prompt]')).toBeNull()
  })

  it('blocks blank input and saves a trimmed key', async () => {
    await renderModal()
    const input = document.querySelector<HTMLInputElement>('[data-api-key-prompt] input')
    const button = document.querySelector<HTMLButtonElement>('[data-api-key-prompt] button[type="submit"]')
    const form = document.querySelector<HTMLFormElement>('[data-api-key-prompt] form')

    expect(document.body.textContent).toContain('请输入生图专用组的API key')
    expect(button?.disabled).toBe(true)

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(document.querySelector('[data-api-key-prompt]')).not.toBeNull()

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setValue?.call(input, '  user-key  ')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(button?.disabled).toBe(false)

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(useStore.getState().settings.apiKey).toBe('user-key')
    expect(document.querySelector('[data-api-key-prompt]')).toBeNull()
  })
})
