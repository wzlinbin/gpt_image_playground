// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../store'
import Lightbox from './Lightbox'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const downloadImages = vi.hoisted(() => ({
  downloadImageIds: vi.fn(),
}))

vi.mock('../store', async () => {
  const { create } = await import('zustand')
  const useStore = create((set) => ({
    lightboxImageId: 'image-1' as string | null,
    lightboxImageList: ['image-1'],
    maskDraft: null,
    tasks: [],
    inputImages: [],
    replaceInputImage: vi.fn(),
    setMaskEditorImageId: vi.fn(),
    showToast: vi.fn(),
    setLightboxImageId: (lightboxImageId: string | null, list?: string[]) => set({
      lightboxImageId,
      lightboxImageList: list ?? [],
    }),
  }))

  return {
    useStore,
    createInputImageFromFile: vi.fn(),
    deleteImageIfUnreferenced: vi.fn(),
  }
})

vi.mock('../lib/imageCache', () => ({
  getCachedImage: () => 'data:image/png;base64,original',
  ensureImageCached: vi.fn(),
}))

vi.mock('../lib/downloadImages', () => downloadImages)

let root: Root | null = null
let container: HTMLDivElement | null = null

async function renderLightbox() {
  useStore.setState({
    lightboxImageId: 'image-1',
    lightboxImageList: ['image-1'],
    maskDraft: null,
    tasks: [],
    inputImages: [],
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root?.render(<Lightbox />))

  const lightbox = document.querySelector<HTMLElement>('[data-lightbox-root]')
  const image = document.querySelector<HTMLImageElement>('[data-image-id="image-1"]')
  if (!lightbox || !image) throw new Error('Lightbox 未正确渲染')
  Object.defineProperty(lightbox, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    }),
  })
  return { lightbox, image }
}

beforeEach(() => {
  vi.clearAllMocks()
  downloadImages.downloadImageIds.mockResolvedValue({ successCount: 1, failCount: 0 })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('Lightbox 原图屏幕适配', () => {
  it('使用原图资源并将初始显示限制在动态视口内', async () => {
    const { lightbox, image } = await renderLightbox()

    expect(image.src).toBe('data:image/png;base64,original')
    expect(image.className).toContain('max-w-[calc(100vw-2rem)]')
    expect(image.className).toContain('max-h-[calc(100dvh-2rem)]')
    expect(image.className).toContain('object-contain')
    expect(image.className).not.toContain('max-w-none')
    expect(lightbox.className).toContain('overflow-hidden')
    expect(lightbox.style.cursor).toBe('pointer')
  })

  it('初始状态不平移，主动放大后仍可拖拽查看', async () => {
    const { lightbox, image } = await renderLightbox()

    await act(async () => {
      image.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 100,
      }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 140, clientY: 130 }))
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(image.parentElement?.style.transform).toContain('translate(0px, 0px) scale(1)')

    await act(async () => {
      lightbox.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 400,
        clientY: 300,
        deltaY: -100,
      }))
      image.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        button: 0,
        clientX: 100,
        clientY: 100,
      }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 140, clientY: 130 }))
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(image.parentElement?.style.transform).toContain('translate(40px, 30px) scale(1.15)')
  })

  it('点击图片右上角按钮下载当前原图且不关闭 Lightbox', async () => {
    await renderLightbox()
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="下载原图"]')
    if (!button) throw new Error('下载按钮未正确渲染')

    expect(button.closest('[style*="transform"]')).toBeNull()

    await act(async () => button.click())

    expect(downloadImages.downloadImageIds).toHaveBeenCalledWith(['image-1'], 'image-image-1')
    expect(useStore.getState().showToast).toHaveBeenCalledWith('下载成功', 'success')
    expect(useStore.getState().lightboxImageId).toBe('image-1')
  })

  it('原图下载失败时保留 Lightbox 并显示错误提示', async () => {
    downloadImages.downloadImageIds.mockResolvedValueOnce({ successCount: 0, failCount: 1 })
    await renderLightbox()
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="下载原图"]')

    await act(async () => button?.click())

    expect(useStore.getState().showToast).toHaveBeenCalledWith('下载失败', 'error')
    expect(useStore.getState().lightboxImageId).toBe('image-1')
  })
})
