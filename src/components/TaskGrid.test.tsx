// @vitest-environment jsdom

import { act, type MouseEvent, type TouchEvent } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskRecord } from '../types'
import { useStore } from '../store'
import TaskGrid from './TaskGrid'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../store', async () => {
  const { create } = await import('zustand')
  const useStore = create<{
    tasks: TaskRecord[]
    searchQuery: string
    filterStatus: string
    filterFavorite: boolean
    activeFavoriteCollectionId: string | null
    defaultFavoriteCollectionId: string
    detailTaskId: string | null
    lightboxImageId: string | null
    lightboxImageList: string[]
    selectedTaskIds: string[]
    setDetailTaskId: (id: string | null) => void
    setLightboxImageId: (id: string | null, list?: string[]) => void
    setConfirmDialog: () => void
    setSelectedTaskIds: (ids: string[]) => void
    clearSelection: () => void
    toggleTaskSelection: (id: string) => void
    showToast: () => void
  }>((set) => ({
    tasks: [],
    searchQuery: '',
    filterStatus: 'all',
    filterFavorite: false,
    activeFavoriteCollectionId: null,
    defaultFavoriteCollectionId: 'default',
    detailTaskId: null,
    lightboxImageId: null,
    lightboxImageList: [],
    selectedTaskIds: [],
    setDetailTaskId: (detailTaskId) => set({ detailTaskId }),
    setLightboxImageId: (lightboxImageId, list) => set({
      lightboxImageId,
      lightboxImageList: list ?? [],
    }),
    setConfirmDialog: vi.fn(),
    setSelectedTaskIds: (selectedTaskIds) => set({ selectedTaskIds }),
    clearSelection: () => set({ selectedTaskIds: [] }),
    toggleTaskSelection: vi.fn(),
    showToast: vi.fn(),
  }))

  return {
    useStore,
    reuseConfig: vi.fn(),
    editOutputs: vi.fn(),
    removeTask: vi.fn(),
    taskMatchesFilterStatus: () => true,
    taskMatchesSearchQuery: () => true,
  }
})

vi.mock('./TaskCard', () => ({
  default: ({
    task,
    onClick,
  }: {
    task: TaskRecord
    onClick: (e: MouseEvent | TouchEvent) => void
  }) => (
    <div data-task-card onClick={onClick}>
      <div data-task-image-preview>
        <img src="data:image/png;base64,thumbnail" alt="" />
        <span data-image-badge>图片信息</span>
      </div>
      <span data-task-details>任务详情</span>
    </div>
  ),
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

const createTask = (outputImages: string[]) => ({
  id: 'task-1',
  createdAt: 1,
  outputImages,
  status: 'done',
}) as TaskRecord

async function renderGrid(task: TaskRecord) {
  useStore.setState({
    tasks: [task],
    detailTaskId: null,
    lightboxImageId: null,
    lightboxImageList: [],
    selectedTaskIds: [],
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root?.render(<TaskGrid />))
}

beforeEach(() => {
  Object.defineProperty(window.navigator, 'platform', { configurable: true, value: 'Win32' })
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('TaskGrid 图片点击路由', () => {
  it('点击图片预览区域时打开完整输出图列表的 Lightbox', async () => {
    await renderGrid(createTask(['image-1', 'image-2']))

    await act(async () => {
      document.querySelector<HTMLElement>('[data-image-badge]')?.click()
    })

    expect(useStore.getState().lightboxImageId).toBe('image-1')
    expect(useStore.getState().lightboxImageList).toEqual(['image-1', 'image-2'])
    expect(useStore.getState().detailTaskId).toBeNull()
  })

  it('点击非图片区域时仍打开任务详情', async () => {
    await renderGrid(createTask(['image-1']))

    await act(async () => {
      document.querySelector<HTMLElement>('[data-task-details]')?.click()
    })

    expect(useStore.getState().detailTaskId).toBe('task-1')
    expect(useStore.getState().lightboxImageId).toBeNull()
  })

  it('没有输出图片时点击预览区域回退到任务详情', async () => {
    await renderGrid(createTask([]))

    await act(async () => {
      document.querySelector<HTMLElement>('[data-task-image-preview]')?.click()
    })

    expect(useStore.getState().detailTaskId).toBe('task-1')
    expect(useStore.getState().lightboxImageId).toBeNull()
  })
})
