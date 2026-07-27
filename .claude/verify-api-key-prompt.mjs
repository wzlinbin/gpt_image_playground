import assert from 'node:assert/strict'
import { chromium } from 'file:///C:/Users/linb6/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:8791/')

  const prompt = page.locator('[data-api-key-prompt]')
  await prompt.waitFor({ state: 'visible' })
  assert.equal(await prompt.isVisible(), true)
  assert.match(await prompt.textContent() ?? '', /请输入生图专用组的API key/)
  assert.equal(await prompt.getByRole('button', { name: '保存并继续' }).isDisabled(), true)
  await page.screenshot({ path: '.claude/api-key-prompt-first-open.png', fullPage: true })

  await prompt.locator('input[type="password"]').fill('browser-test-key')
  await prompt.getByRole('button', { name: '保存并继续' }).click()
  await prompt.waitFor({ state: 'hidden' })
  await page.reload()
  assert.equal(await prompt.isVisible(), false)

  assert.equal(await page.title(), '生图中心')
  assert.equal((await page.locator('header h1').textContent())?.trim(), '生图中心')
  assert.equal(await page.locator('header h1 a').count(), 0)
  assert.equal(await page.getByRole('button', { name: '画廊', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Agent', exact: true }).count(), 0)
  assert.equal(await page.locator('input[placeholder*="搜索提示词"]').count(), 0)
  const promptInput = page.locator('[contenteditable="true"][aria-label^="描述你想生成的图片"]')
  await promptInput.waitFor({ state: 'visible' })
  const promptInputBox = await promptInput.boundingBox()
  assert.ok(promptInputBox)
  assert.ok(promptInputBox.width >= 1000)
  assert.ok(promptInputBox.height >= 64)
  await page.screenshot({ path: '.claude/input-bar-expanded-desktop.png', fullPage: true })

  await page.getByRole('button', { name: '操作指南' }).click()
  const helpModal = page.locator('[data-help-modal]')
  await helpModal.waitFor({ state: 'visible' })
  assert.equal((await helpModal.textContent())?.includes('@CookSleep'), false)
  assert.equal(await helpModal.locator('a[href*="github.com"], a[href*="ifdian.net"]').count(), 0)
  await page.screenshot({ path: '.claude/ui-simplification-help.png', fullPage: true })
  await helpModal.getByRole('button', { name: '关闭' }).click()
  await helpModal.waitFor({ state: 'hidden' })

  await page.getByRole('button', { name: '设置' }).click()
  await page.getByText('API 配置', { exact: true }).waitFor({ state: 'visible' })
  assert.equal(await page.getByRole('button', { name: '关于', exact: true }).count(), 0)

  const state = await page.evaluate(() => {
    const findText = (text) => [...document.querySelectorAll('span')]
      .find((node) => node.textContent?.trim() === text)
    const fieldRoot = (text) => {
      const label = findText(text)
      return label?.closest('label') ?? label?.parentElement
    }
    const inputFor = (text) => fieldRoot(text)?.querySelector('input')
    const selectDisabled = (text) => [...(fieldRoot(text)?.querySelectorAll('div') ?? [])]
      .some((node) => node.className.includes('cursor-not-allowed'))
    const currentProfileButton = findText('当前配置')?.parentElement?.parentElement?.querySelector('button[title]')

    return {
      currentProfileDisabled: currentProfileButton?.disabled,
      profileNameReadOnly: inputFor('配置名称')?.readOnly,
      providerDisabled: selectDisabled('服务商类型'),
      apiUrlReadOnly: inputFor('API URL')?.readOnly,
      apiKeyReadOnly: inputFor('API Key')?.readOnly,
      modelReadOnly: inputFor('模型 ID')?.readOnly,
      timeoutReadOnly: inputFor('请求超时 (秒)')?.readOnly,
      apiModeDisabled: selectDisabled('API 接口'),
      streamDisabled: document.querySelector('[aria-label="流式传输"]')?.disabled,
      base64Disabled: document.querySelector('[aria-label="返回 Base64 图片数据"]')?.disabled,
      codexDisabled: document.querySelector('[aria-label="Codex CLI 兼容模式"]')?.disabled,
    }
  })

  assert.deepEqual(state, {
    currentProfileDisabled: false,
    profileNameReadOnly: false,
    providerDisabled: false,
    apiUrlReadOnly: false,
    apiKeyReadOnly: false,
    modelReadOnly: false,
    timeoutReadOnly: false,
    apiModeDisabled: false,
    streamDisabled: false,
    base64Disabled: false,
    codexDisabled: false,
  })

  const streamToggle = page.locator('[aria-label="流式传输"]')
  if (await streamToggle.getAttribute('aria-checked') !== 'true') await streamToggle.click()
  assert.equal(await streamToggle.getAttribute('aria-checked'), 'true')
  const partialImagesDisabled = await page.evaluate(() => {
    const label = [...document.querySelectorAll('span')]
      .find((node) => node.textContent?.trim() === '请求中间步骤图像数')
    return [...(label?.parentElement?.parentElement?.querySelectorAll('div') ?? [])]
      .some((node) => node.className.includes('cursor-not-allowed'))
  })
  assert.equal(partialImagesDisabled, false)

  const base64Toggle = page.locator('[aria-label="返回 Base64 图片数据"]')
  if (await base64Toggle.getAttribute('aria-checked') !== 'true') await base64Toggle.click()
  assert.equal(await base64Toggle.getAttribute('aria-checked'), 'true')
  await page.getByText('流式传输', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: '.claude/api-key-prompt-settings.png', fullPage: true })
  await context.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto('http://127.0.0.1:8791/')
  const mobilePrompt = mobilePage.locator('[data-api-key-prompt]')
  await mobilePrompt.waitFor({ state: 'visible' })
  assert.equal(await mobilePrompt.isVisible(), true)
  const box = await mobilePrompt.locator('form').boundingBox()
  assert.ok(box)
  assert.ok(box.x >= 0 && box.y >= 0)
  assert.ok(box.x + box.width <= 390)
  assert.ok(box.y + box.height <= 844)
  await mobilePage.screenshot({ path: '.claude/api-key-prompt-mobile.png', fullPage: true })
  await mobilePrompt.locator('input[type="password"]').fill('mobile-browser-test-key')
  await mobilePrompt.getByRole('button', { name: '保存并继续' }).click()
  await mobilePrompt.waitFor({ state: 'hidden' })
  const mobilePromptInput = mobilePage.locator('[contenteditable="true"][aria-label^="描述你想生成的图片"]')
  await mobilePromptInput.waitFor({ state: 'visible' })
  const mobilePromptInputBox = await mobilePromptInput.boundingBox()
  assert.ok(mobilePromptInputBox)
  assert.ok(mobilePromptInputBox.x >= 0)
  assert.ok(mobilePromptInputBox.x + mobilePromptInputBox.width <= 390)
  assert.ok(mobilePromptInputBox.height >= 64)
  await mobilePage.screenshot({ path: '.claude/input-bar-expanded-mobile.png', fullPage: true })
  await mobileContext.close()

  console.log('浏览器验收通过：输入栏尺寸、搜索栏移除、品牌入口精简、API 配置可编辑与移动端布局共 4 个场景')
} finally {
  await browser.close()
}
