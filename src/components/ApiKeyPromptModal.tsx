import { useState } from 'react'
import { createPortal } from 'react-dom'
import { isApiKeyPromptRequired } from '../lib/apiProfiles'
import { usePreventBackgroundScroll } from '../hooks/usePreventBackgroundScroll'
import { useStore } from '../store'

interface ApiKeyPromptModalProps {
  ready: boolean
}

export default function ApiKeyPromptModal({ ready }: ApiKeyPromptModalProps) {
  const apiKey = useStore((s) => s.settings.apiKey)
  const setSettings = useStore((s) => s.setSettings)
  const [value, setValue] = useState('')
  const visible = ready && isApiKeyPromptRequired() && !apiKey.trim()

  usePreventBackgroundScroll(visible)

  if (!visible) return null

  const trimmedValue = value.trim()

  return createPortal(
    <div data-api-key-prompt data-no-drag-select className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-overlay-in" />
      <form
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/50 bg-white/95 p-6 shadow-2xl ring-1 ring-black/5 animate-confirm-in dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-prompt-title"
        onSubmit={(event) => {
          event.preventDefault()
          if (!trimmedValue) return
          setSettings({ apiKey: trimmedValue })
        }}
      >
        <h2 id="api-key-prompt-title" className="mb-2 text-lg font-bold text-gray-800 dark:text-gray-100">
          请输入生图专用组的API key
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          API Key 将保存在当前浏览器中，用于提交图片生成请求。
        </p>
        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300">API Key</span>
          <input
            autoFocus
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            className="w-full rounded-xl border border-gray-200/70 bg-white/60 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:focus:border-blue-500/50"
          />
        </label>
        <button
          type="submit"
          disabled={!trimmedValue}
          className="w-full rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          保存并继续
        </button>
      </form>
    </div>,
    document.body,
  )
}
