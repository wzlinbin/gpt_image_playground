import assert from 'node:assert/strict'
import { chromium } from 'file:///C:/Users/linb6/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'

process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
const appUrl = process.env.WORKER_CONFIG_APP_URL ?? 'http://127.0.0.1:8792/'
const expectReadOnly = process.env.WORKER_CONFIG_EXPECT_READ_ONLY !== 'false'
const screenshotMode = expectReadOnly ? 'read-only' : 'editable'
const expectedConfig = {
  name: process.env.WORKER_CONFIG_EXPECT_NAME ?? '默认',
  baseUrl: process.env.WORKER_CONFIG_EXPECT_BASE_URL ?? 'https://api.api2cn.com',
  model: process.env.WORKER_CONFIG_EXPECT_MODEL ?? 'gpt-image-2',
  timeout: process.env.WORKER_CONFIG_EXPECT_TIMEOUT ?? '600',
  streamImages: process.env.WORKER_CONFIG_EXPECT_STREAM_IMAGES === 'true',
  responseFormatB64Json: process.env.WORKER_CONFIG_EXPECT_B64_JSON === 'true',
  codexCli: process.env.WORKER_CONFIG_EXPECT_CODEX_CLI === 'true',
}

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
})

const readApiSettingsState = async (page) => page.evaluate(() => {
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
    profileName: inputFor('配置名称')?.value,
    profileNameReadOnly: inputFor('配置名称')?.readOnly,
    providerDisabled: selectDisabled('服务商类型'),
    apiUrl: inputFor('API URL')?.value,
    apiUrlDisabled: inputFor('API URL')?.disabled,
    apiKey: inputFor('API Key')?.value,
    apiKeyDisabled: inputFor('API Key')?.disabled,
    apiKeyReadOnly: inputFor('API Key')?.readOnly,
    model: inputFor('模型 ID')?.value,
    modelReadOnly: inputFor('模型 ID')?.readOnly,
    timeout: inputFor('请求超时 (秒)')?.value,
    timeoutDisabled: inputFor('请求超时 (秒)')?.disabled,
    apiModeDisabled: selectDisabled('API 接口'),
    streamDisabled: document.querySelector('[aria-label="流式传输"]')?.disabled,
    streamChecked: document.querySelector('[aria-label="流式传输"]')?.getAttribute('aria-checked'),
    partialImagesDisabled: selectDisabled('请求中间步骤图像数'),
    base64Disabled: document.querySelector('[aria-label="返回 Base64 图片数据"]')?.disabled,
    base64Checked: document.querySelector('[aria-label="返回 Base64 图片数据"]')?.getAttribute('aria-checked'),
    codexDisabled: document.querySelector('[aria-label="Codex CLI 兼容模式"]')?.disabled,
    codexChecked: document.querySelector('[aria-label="Codex CLI 兼容模式"]')?.getAttribute('aria-checked'),
  }
})

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await page.goto(appUrl)

  const prompt = page.locator('[data-api-key-prompt]')
  await prompt.waitFor({ state: 'visible' })
  await prompt.locator('input[type="password"]').fill('worker-browser-key')
  await prompt.getByRole('button', { name: '保存并继续' }).click()
  await prompt.waitFor({ state: 'hidden' })

  await page.getByRole('button', { name: '设置' }).click()
  await page.getByText('API 配置', { exact: true }).waitFor({ state: 'visible' })

  assert.deepEqual(await readApiSettingsState(page), {
    currentProfileDisabled: expectReadOnly,
    profileName: expectedConfig.name,
    profileNameReadOnly: expectReadOnly,
    providerDisabled: expectReadOnly,
    apiUrl: expectedConfig.baseUrl,
    apiUrlDisabled: expectReadOnly,
    apiKey: 'worker-browser-key',
    apiKeyDisabled: false,
    apiKeyReadOnly: false,
    model: expectedConfig.model,
    modelReadOnly: expectReadOnly,
    timeout: expectedConfig.timeout,
    timeoutDisabled: expectReadOnly,
    apiModeDisabled: expectReadOnly,
    streamDisabled: expectReadOnly,
    streamChecked: String(expectedConfig.streamImages),
    partialImagesDisabled: expectReadOnly || !expectedConfig.streamImages,
    base64Disabled: expectReadOnly,
    base64Checked: String(expectedConfig.responseFormatB64Json),
    codexDisabled: expectReadOnly,
    codexChecked: String(expectedConfig.codexCli),
  })

  const apiKeyInput = page.getByText('API Key', { exact: true }).locator('..').locator('input')
  await apiKeyInput.fill('worker-browser-key-updated')
  await apiKeyInput.press('Tab')
  await page.screenshot({ path: `.claude/worker-api-config-${screenshotMode}-desktop.png`, fullPage: true })
  await page.reload()
  await page.getByRole('button', { name: '设置' }).click()
  await page.getByText('API 配置', { exact: true }).waitFor({ state: 'visible' })
  assert.equal((await readApiSettingsState(page)).apiKey, 'worker-browser-key-updated')
  await context.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(appUrl)
  const mobilePrompt = mobilePage.locator('[data-api-key-prompt]')
  await mobilePrompt.waitFor({ state: 'visible' })
  await mobilePrompt.locator('input[type="password"]').fill('mobile-worker-key')
  await mobilePrompt.getByRole('button', { name: '保存并继续' }).click()
  await mobilePrompt.waitFor({ state: 'hidden' })
  await mobilePage.getByRole('button', { name: '设置' }).click()
  await mobilePage.getByText('API 配置', { exact: true }).waitFor({ state: 'visible' })
  const settingsBox = await mobilePage.getByText('API 配置', { exact: true }).locator('..').boundingBox()
  assert.ok(settingsBox)
  assert.ok(settingsBox.x >= 0 && settingsBox.x + settingsBox.width <= 390)
  assert.equal((await readApiSettingsState(mobilePage)).apiKeyReadOnly, false)
  await mobilePage.screenshot({ path: `.claude/worker-api-config-${screenshotMode}-mobile.png`, fullPage: true })
  await mobileContext.close()

  console.log(`浏览器验收通过：Worker 配置值、${expectReadOnly ? '全局只读' : '可编辑状态'}、API Key 持久化及移动端布局共 4 个场景`)
} finally {
  await browser.close()
}
