/**
 * Shuttle 集成测试：
 * - 用临时目录作为接收目录，启动真实的局域网监听与同源管理 API；
 * - 覆盖上传、子目录、重名、列目录、mkdir/rename/delete、路径穿越、token 轮换、
 *   手机页（正常 UA / 微信 UA）等行为。
 *
 * 运行：node tests/integration.mjs
 */
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'

const pluginUrl = new URL('../index.js', import.meta.url).href
const mod = await import(pluginUrl + '?t=' + Date.now())
const tmp = await mkdtemp(path.join(os.tmpdir(), 'fr-test-'))

const disposers = []
let adminHandler = null
const child = {
  effect(setup) {
    const dispose = setup()
    if (typeof dispose === 'function') disposers.push(dispose)
  },
  webServer: {
    register(route) {
      adminHandler = route.handler
      return () => {}
    },
  },
}
const ctx = {
  logger: {
    info: (...args) => console.log('  [host info]', ...args),
    warn: (...args) => console.warn('  [host warn]', ...args),
  },
  effect(setup) {
    const dispose = setup()
    if (typeof dispose === 'function') disposers.push(dispose)
  },
  inject(names, callback) {
    if (names.includes('webServer')) callback(child)
  },
}

let passed = 0
let failed = 0
function check(label, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`PASS  ${label}`)
  } else {
    failed += 1
    console.log(`FAIL  ${label} ${detail}`)
  }
}

try {
  await mod.apply(ctx, { saveDir: tmp })

  const adminServer = http.createServer((req, res) => adminHandler(req, res))
  await new Promise((resolve) => adminServer.listen(0, '127.0.0.1', resolve))
  const adminBase = `http://127.0.0.1:${adminServer.address().port}`

  const stateResponse = await fetch(`${adminBase}/shuttle/api/state`)
  const state = await stateResponse.json()
  check('admin state responds', stateResponse.ok && state.ok === true)
  check('LAN port assigned', Number.isInteger(state.port) && state.port > 0, `port=${state.port}`)
  check('token generated', typeof state.token === 'string' && state.token.length >= 20)
  check('URL uses LAN address', /^http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/s\//.test(state.url || ''), state.url)
  check('save dir is config override', state.saveDir === tmp, state.saveDir)

  const qrResponse = await fetch(`${adminBase}/shuttle/api/qr.svg`)
  const qrText = await qrResponse.text()
  check('QR svg served', qrResponse.ok && qrText.startsWith('<svg') && qrText.includes('</svg>'))

  const lanBase = `http://127.0.0.1:${state.port}/s/${state.token}`
  const pageResponse = await fetch(lanBase)
  const pageText = await pageResponse.text()
  check('phone page served', pageResponse.ok && pageText.includes('文件穿梭机'))
  check('phone page carries token', pageText.includes(state.token))

  const wechatPage = await fetch(lanBase, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.47(0x18002f2c) NetType/WIFI Language/zh_CN',
    },
  })
  const wechatText = await wechatPage.text()
  check('wechat page is served', wechatPage.ok)
  const scriptBody = (wechatText.split('<script>')[1] || '').split('</script>')[0]
  check('phone page script is ES5', !/\basync\b|\bawait\b|=>|\bconst\b|\blet\b/.test(scriptBody))

  check(
    'wechat page shows album and file entries',
    wechatText.includes('id="photos"') && wechatText.includes('id="files"') && !wechatText.includes('id="camera"') && !wechatText.includes('id="compat"'),
  )
  check('entries have no subtitle text', !wechatText.includes('picker-desc') && !pageText.includes('picker-desc'))
  check('picker tiles are labels (click forwards to input)', (wechatText.match(/<label class="picker"/g) || []).length === 2)
  check('picker inputs overlay the tiles', wechatText.includes('class="picker-input"') && wechatText.includes('id="files"'))
  check('file input declares document accept', wechatText.includes('application/pdf') && wechatText.includes('.docx'))
  check('browser file entry declares document accept', pageText.includes('application/pdf') && pageText.includes('.docx'))
  check('phone page pinned to light theme', !wechatText.includes('prefers-color-scheme') && wechatText.includes('color-scheme: light'))
  check('save target starts hidden and uses a bottom sheet', wechatText.includes('id="target-card" hidden') && wechatText.includes('id="dir-sheet"') && !wechatText.includes('<select id="dir"'))
  check('save target hides itself for a root-only listing', wechatText.includes('dirs.length <= 1'))
  check('save target renders directory options dynamically', wechatText.includes('renderDirOptions') && wechatText.includes('dir-option'))
  check('save target defaults to the 默认 folder', wechatText.includes('var DEFAULT_DIR_NAME =') && wechatText.includes('var selectedDir = DEFAULT_DIR_NAME'))
  check('save target expresses nesting with indentation', wechatText.includes('data-depth') && wechatText.includes('depth * 22'))
  check('save target nests first-level dirs and collapses deeper ones', wechatText.includes('dir-toggle') && wechatText.includes('childGroup.hidden = true') && wechatText.includes('dir-toggle-slot'))
  check('save target has no root option', !wechatText.includes('value=""') && wechatText.includes('DEFAULT_DIR_NAME'))
  check(
    'normal page shows album and file entries',
    pageText.includes('accept="image/*,video/*"') && pageText.includes('id="files"') && pageText.includes('id="photos"') && !pageText.includes('id="camera"') && !pageText.includes('id="compat"'),
  )
  check('wechat top notice replaced by inline note', !wechatText.includes('你正在微信内置浏览器中打开'))

  const stateAfterVisit = await (await fetch(`${adminBase}/shuttle/api/state`)).json()
  check('last visit recorded with wechat flag', Boolean(stateAfterVisit.lastVisit) && stateAfterVisit.lastVisit.wechat === true)

  check('phone page has picker diagnostics', pageText.includes('id="pick-error"') && pageText.includes('/event'))

  const eventResponse = await fetch(`${lanBase}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'open', detail: { label: '照片' } }),
  })
  const event = await eventResponse.json()
  check('picker event accepted', eventResponse.ok && event.ok === true, JSON.stringify(event))

  const stateAfterEvent = await (await fetch(`${adminBase}/shuttle/api/state`)).json()
  check('page view counted', stateAfterEvent.pageViews >= 1)
  check(
    'diagnostic recorded',
    Array.isArray(stateAfterEvent.diagnostics) && stateAfterEvent.diagnostics.some((item) => item.type === 'client:open'),
  )

  const resumeHtml = await (await fetch(lanBase)).text()
  check('phone page has no retry banner', !resumeHtml.includes('resume-error'))
  check(
    'header puts host beside product name',
    resumeHtml.includes('class="head-meta"') && resumeHtml.includes('class="host-name"'),
  )
  check('header drops save-dir subtitle', !resumeHtml.includes('发送到') && !resumeHtml.includes('FilesRemote'))
  check('header has no brand logo', !resumeHtml.includes('class="logo"'))

  await fetch(`${lanBase}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'open', detail: { label: '照片' } }),
  })
  await new Promise((resolve) => setTimeout(resolve, 1700))
  await fetch(lanBase)
  const stateAfterAbort = await (await fetch(`${adminBase}/shuttle/api/state`)).json()
  check('picker abort detected', Boolean(stateAfterAbort.pickerAborted) && stateAfterAbort.pickerAborted.label === '照片')
  const resume = await (await fetch(`${lanBase}/resume`)).json()
  check('resume reports aborted picker', resume.ok === true && Boolean(resume.pickerAborted))

  const diagUpload = await fetch(`${lanBase}/upload?name=${encodeURIComponent('diag-test.txt')}`, { method: 'POST', body: 'diag' })
  check('diagnostic upload accepted', diagUpload.ok)
  const stateAfterUpload = await (await fetch(`${adminBase}/shuttle/api/state`)).json()
  check(
    'upload diagnostics recorded',
    stateAfterUpload.diagnostics.some((item) => item.type === 'upload-start') &&
      stateAfterUpload.diagnostics.some((item) => item.type === 'upload-ok'),
  )
  await fetch(`${adminBase}/shuttle/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: ['diag-test.txt'] }),
  })

  const badTokenResponse = await fetch(`http://127.0.0.1:${state.port}/s/not-the-token`)
  check('wrong token rejected', badTokenResponse.status === 403, `status=${badTokenResponse.status}`)

  const uploadResponse = await fetch(`${lanBase}/upload?name=${encodeURIComponent('hello world.txt')}`, {
    method: 'POST',
    body: 'hello files-remote',
  })
  const upload = await uploadResponse.json()
  check('upload accepted', uploadResponse.ok && upload.ok === true, JSON.stringify(upload))
  const uploadedFile = path.join(tmp, '默认', 'hello world.txt')
  check('file written to default dir', (await stat(uploadedFile)).size === 18)
  check('upload response path', upload.path === '默认/hello world.txt', upload.path)

  const unicodeDir = '旅行/2026'
  const nestedResponse = await fetch(
    `${lanBase}/upload?name=${encodeURIComponent('猫猫 photo.jpg')}&dir=${encodeURIComponent(unicodeDir)}`,
    { method: 'POST', body: Buffer.alloc(4096, 7) },
  )
  const nested = await nestedResponse.json()
  check('upload into subdirectory', nestedResponse.ok && nested.ok === true, JSON.stringify(nested))
  check('unicode directory created', (await stat(path.join(tmp, unicodeDir))).isDirectory())
  check('nested file size', (await stat(path.join(tmp, unicodeDir, '猫猫 photo.jpg'))).size === 4096)

  const duplicateResponse = await fetch(`${lanBase}/upload?name=${encodeURIComponent('hello world.txt')}`, {
    method: 'POST',
    body: 'second',
  })
  const duplicate = await duplicateResponse.json()
  check('duplicate name gets suffix', duplicateResponse.ok && duplicate.name === 'hello world (1).txt', duplicate.name)

  const dirsResponse = await fetch(`${lanBase}/dirs`)
  const dirs = await dirsResponse.json()
  check('dirs endpoint lists folders', dirsResponse.ok && dirs.dirs.some((item) => item.path === '旅行'))
  check('dirs endpoint includes 默认 and excludes root', dirsResponse.ok && dirs.dirs.some((item) => item.path === '默认') && !dirs.dirs.some((item) => item.path === ''))
  const stateWithReceipts = await (await fetch(`${adminBase}/shuttle/api/state`)).json()
  check('received record tracks default dir', stateWithReceipts.received.some((item) => item.path === '默认/hello world.txt' && item.dir === '默认'))
  const foldersResponse = await fetch(`${adminBase}/shuttle/api/folders`)
  const folders = await foldersResponse.json()
  check('folders endpoint reports 默认 activity', foldersResponse.ok && folders.folders.some((item) => item.name === '默认' && item.lastReceivedAt > 0))

  const listResponse = await fetch(`${adminBase}/shuttle/api/list?path=${encodeURIComponent('默认')}`)
  const listing = await listResponse.json()
  check('admin list shows files', listResponse.ok && listing.files.some((item) => item.name === 'hello world.txt'))
  const rootListingResponse = await fetch(`${adminBase}/shuttle/api/list?path=`)
  const rootListing = await rootListingResponse.json()
  check('admin root contains folders but no default files', rootListingResponse.ok && rootListing.files.length === 0 && rootListing.dirs.some((item) => item.path === '默认'))
  const searchResponse = await fetch(`${adminBase}/shuttle/api/search?path=${encodeURIComponent('默认')}&q=${encodeURIComponent('hello')}`)
  const searchData = await searchResponse.json()
  check('admin search finds files recursively', searchResponse.ok && searchData.ok === true && searchData.files.some((item) => item.path === '默认/hello world.txt'))
  await writeFile(path.join(tmp, 'thumb.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const rawResponse = await fetch(`${adminBase}/shuttle/api/raw?path=thumb.png`)
  check('admin raw returns image content type', rawResponse.ok && rawResponse.headers.get('content-type') === 'image/png')
  const rawTraversal = await fetch(`${adminBase}/shuttle/api/raw?path=${encodeURIComponent('../outside.png')}`)
  check('admin raw refuses traversal', rawTraversal.status === 400)
  const thumbResponse = await fetch(`${adminBase}/shuttle/api/thumb?path=thumb.png`)
  check('admin thumb returns image content type', thumbResponse.ok && thumbResponse.headers.get('content-type') === 'image/png')
  const thumbTraversal = await fetch(`${adminBase}/shuttle/api/thumb?path=${encodeURIComponent('../outside.png')}`)
  check('admin thumb refuses traversal', thumbTraversal.status === 400)
  await fetch(`${adminBase}/shuttle/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: ['thumb.png'] }),
  })

  const mkdirResponse = await fetch(`${adminBase}/shuttle/api/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '', name: '收件箱' }),
  })
  const mkdir = await mkdirResponse.json()
  check('mkdir works', mkdirResponse.ok && mkdir.ok === true, JSON.stringify(mkdir))
  check('new directory exists', (await stat(path.join(tmp, '收件箱'))).isDirectory())

  const renameResponse = await fetch(`${adminBase}/shuttle/api/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '默认/hello world.txt', name: 'renamed.txt' }),
  })
  const renamed = await renameResponse.json()
  check('rename works', renameResponse.ok && renamed.path === '默认/renamed.txt', JSON.stringify(renamed))

  const deleteResponse = await fetch(`${adminBase}/shuttle/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: ['默认/renamed.txt'] }),
  })
  const deleted = await deleteResponse.json()
  check('delete works', deleteResponse.ok && deleted.deleted === 1)
  check('deleted file gone', !(await readdir(path.join(tmp, '默认'))).includes('renamed.txt'))

  const nonEmptyDelete = await fetch(`${adminBase}/shuttle/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: ['旅行'] }),
  })
  check('non-empty directory refused', nonEmptyDelete.status === 400)

  const escapeList = await fetch(`${adminBase}/shuttle/api/list?path=${encodeURIComponent('../')}`)
  check('path traversal refused', escapeList.status === 400)

  const rotateResponse = await fetch(`${adminBase}/shuttle/api/rotate-token`, { method: 'POST' })
  const rotated = await rotateResponse.json()
  check('token rotates', rotateResponse.ok && rotated.token !== state.token)
  const staleResponse = await fetch(`${lanBase}/health`)
  check('old link stops working', staleResponse.status === 403)

  const newLanBase = `http://127.0.0.1:${rotated.port}/s/${rotated.token}`
  const healthResponse = await fetch(`${newLanBase}/health`)
  check('new link works', healthResponse.ok)

  const settingsResponse = await fetch(`${adminBase}/shuttle/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferredIp: '192.0.2.123' }),
  })
  check('unknown preferred IP refused', settingsResponse.status === 400)

  adminServer.close()
} catch (error) {
  failed += 1
  console.error('UNEXPECTED', error)
} finally {
  for (const dispose of disposers.reverse()) {
    try {
      await dispose()
    } catch (error) {
      console.warn('dispose error', error)
    }
  }
  await rm(tmp, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
