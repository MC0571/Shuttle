/**
 * 文件穿梭机 · Shuttle — Host 半。
 *
 * 提供两套 HTTP 接口：
 *   1. 局域网接收服务（独立监听 0.0.0.0:<随机端口>）：
 *        GET  /s/<token>              手机上传页
 *        GET  /s/<token>/dirs         可选保存子目录
 *        POST /s/<token>/upload       原始文件流上传（?name=&dir=）
 *        GET  /s/<token>/health       健康检查
 *   2. 同源管理 API（注册在 DSH Web 服务器的 /shuttle 前缀上）：
 *        GET  /shuttle/api/state         运行状态、二维码 URL、网络接口
 *        GET  /shuttle/api/qr.svg        二维码（离线生成）
 *        GET  /shuttle/api/list?path=    列目录
 *        GET  /shuttle/api/raw?path=     读取保存目录内的文件（图片缩略图）
 *        POST /shuttle/api/mkdir         新建文件夹
 *        POST /shuttle/api/rename        重命名
 *        POST /shuttle/api/delete        删除（文件夹仅限空目录）
 *        POST /shuttle/api/open          在系统文件管理器中打开
 *        POST /shuttle/api/pick-dir      调用系统文件夹选择器
 *        POST /shuttle/api/settings      修改保存目录 / 网络接口
 *        POST /shuttle/api/rotate-token  重置二维码链接
 *
 * 数据只在局域网内传输：手机 → 本机监听端口 → 保存目录，不经过任何中转。
 */
import http from 'node:http'
import { createReadStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { mkdir, stat } from 'node:fs/promises'

import { renderPhonePage } from './lib/phone-page.js'
import {
  createDirectory,
  deleteEntry,
  listDirectories,
  listDirectory,
  openInFileManager,
  renameEntry,
  resolveInside,
  saveUpload,
} from './lib/files.js'
import {
  createToken,
  defaultSaveDir,
  displayPath,
  expandHome,
  listIPv4Addresses,
  loadSettings,
  persistSettings,
  pickAddress,
  qrSvg,
  readJsonBody,
  resolveInitialSaveDir,
  sendHtml,
  sendJson,
  sendSvg,
  sendText,
  tokenMatches,
} from './lib/util.js'

export const name = 'shuttle'

const ADMIN_PREFIX = '/shuttle'
const ADMIN_API = '/shuttle/api'

function methodNotAllowed(res) {
  return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
}

function badRequest(res, message) {
  return sendJson(res, 400, { ok: false, error: message })
}

function landingPage() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>文件穿梭机</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",system-ui,sans-serif;
background:#0b1220;color:#e6edf7;display:grid;place-items:center;min-height:100vh;margin:0}
main{text-align:center;padding:24px}h1{font-size:20px;font-weight:600}p{color:#8b9ab1;font-size:14px}</style>
</head><body><main><h1>文件穿梭机</h1>
<p>请在电脑上打开二维码页面，用手机相机扫描二维码。</p></main></body></html>`
}

export async function apply(ctx, config = {}) {
  const saved = loadSettings()
  const configured = typeof config?.saveDir === 'string' ? config.saveDir.trim() : ''
  let saveDir = path.resolve(expandHome(resolveInitialSaveDir(configured, saved.saveDir)))
  try {
    await mkdir(saveDir, { recursive: true })
  } catch (error) {
    ctx.logger?.warn?.('shuttle: 无法使用保存目录 %s（%s），回退到默认目录', saveDir, error?.message ?? error)
    saveDir = path.resolve(defaultSaveDir())
    await mkdir(saveDir, { recursive: true }).catch(() => {})
  }

  const state = {
    token: createToken(),
    saveDir,
    preferredIp: saved.preferredIp,
    port: 0,
    startedAt: Date.now(),
    lastUpload: null,
    lastVisit: null,
    pageViews: 0,
    lastPageAt: null,
    diagnostics: [],
    pickerSession: null,
    lastPickerAborted: null,
    lanError: null,
  }

  /** 记录手机端诊断事件（页面打开、选择器、选择结果、上传开始/结束）。 */
  const recordDiagnostic = (type, detail, req) => {
    const userAgent = String(req?.headers?.['user-agent'] ?? '')
    state.diagnostics.push({
      at: Date.now(),
      type: String(type),
      detail: detail && typeof detail === 'object' ? detail : {},
      ip: req?.socket?.remoteAddress ?? '',
      wechat: /MicroMessenger/i.test(userAgent),
    })
    if (state.diagnostics.length > 40) state.diagnostics.splice(0, state.diagnostics.length - 40)
  }

  const snapshot = () => {
    const addresses = listIPv4Addresses()
    const preferred = pickAddress(addresses, state.preferredIp)
    const url = state.port ? `http://${preferred}:${state.port}/s/${state.token}` : ''
    return {
      hostName: os.hostname(),
      platform: process.platform,
      saveDir: state.saveDir,
      saveDirLabel: displayPath(state.saveDir),
      saveDirName: path.basename(state.saveDir) || state.saveDir,
      token: state.token,
      port: state.port,
      startedAt: state.startedAt,
      lastUpload: state.lastUpload,
      lastVisit: state.lastVisit,
      pageViews: state.pageViews,
      lastPageAt: state.lastPageAt,
      diagnostics: state.diagnostics.slice(-20),
      pickerAborted: state.lastPickerAborted,
      lanError: state.lanError,
      preferredIp: preferred,
      addresses,
      url,
      qrSvgUrl: `/shuttle/api/qr.svg?v=${encodeURIComponent(`${preferred}:${state.port}:${state.token}`)}`,
    }
  }

  /** 局域网监听器：只服务扫码页面与上传。 */
  async function routeLan(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const segments = url.pathname.split('/').filter(Boolean)
    if (segments.length === 0) return sendHtml(res, landingPage())
    if (segments.length < 2 || segments[0] !== 's') return sendText(res, 404, 'Not found')
    if (!tokenMatches(segments[1], state.token)) {
      return sendText(res, 403, '链接已失效，请重新扫描电脑上的二维码。')
    }
    const action = segments[2] ?? ''
    if (!action) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method not allowed')
      const userAgent = String(req.headers['user-agent'] ?? '')
      state.pageViews += 1
      state.lastPageAt = Date.now()
      recordDiagnostic('page', { view: state.pageViews }, req)
      if (state.pickerSession) {
        const waitedMs = Date.now() - state.pickerSession.at
        if (waitedMs >= 1500) {
          state.lastPickerAborted = {
            at: state.pickerSession.at,
            label: state.pickerSession.label,
            waitedMs,
            abortedAt: Date.now(),
          }
          state.pickerSession = null
        }
      }
      state.lastVisit = {
        at: Date.now(),
        ip: req.socket.remoteAddress ?? '',
        userAgent,
        wechat: /MicroMessenger/i.test(userAgent),
        mobile: /Mobile|Android|iPhone|iPad/i.test(userAgent),
      }
      return sendHtml(
        res,
        renderPhonePage({
          token: state.token,
          hostName: os.hostname(),
          saveDirName: path.basename(state.saveDir) || state.saveDir,
          saveDir: state.saveDir,
          wechat: state.lastVisit.wechat,
        }),
      )
    }
    if (action === 'resume') {
      if (req.method !== 'GET') return sendText(res, 405, 'Method not allowed')
      const aborted = state.lastPickerAborted
      const recent = aborted && Date.now() - aborted.abortedAt < 10 * 60 * 1000
      return sendJson(res, 200, {
        ok: true,
        pageViews: state.pageViews,
        pickerAborted: recent ? aborted : null,
      })
    }
    if (action === 'dirs') {
      if (req.method !== 'GET') return sendText(res, 405, 'Method not allowed')
      const dirs = await listDirectories(state.saveDir, 2)
      return sendJson(res, 200, { ok: true, dirs })
    }
    if (action === 'health') {
      return sendJson(res, 200, { ok: true })
    }
    if (action === 'event') {
      if (req.method !== 'POST') return sendText(res, 405, 'Method not allowed')
      try {
        const body = await readJsonBody(req, 64 * 1024)
        const type = typeof body.type === 'string' ? body.type.slice(0, 40) : 'unknown'
        const detail = body.detail && typeof body.detail === 'object' ? body.detail : {}
        recordDiagnostic(`client:${type}`, detail, req)
        if (type === 'open') {
          state.pickerSession = { at: Date.now(), label: typeof detail.label === 'string' ? detail.label : '' }
        } else if (type === 'pick' || type === 'empty') {
          state.pickerSession = null
          if (type === 'pick') state.lastPickerAborted = null
        }
        return sendJson(res, 200, { ok: true })
      } catch (error) {
        return sendJson(res, 400, { ok: false, error: error?.message || String(error) })
      }
    }
    if (action === 'upload') {
      if (req.method !== 'POST') return sendText(res, 405, 'Method not allowed')
      try {
        const targetDir = url.searchParams.get('dir') ?? ''
        const rawName = url.searchParams.get('name') ?? 'file'
        recordDiagnostic('upload-start', { name: rawName, dir: targetDir, bytes: Number(req.headers['content-length'] ?? 0) || 0 }, req)
        const result = await saveUpload(state.saveDir, targetDir, rawName, req)
        state.lastUpload = { ...result, at: Date.now(), from: req.socket.remoteAddress ?? '' }
        recordDiagnostic('upload-ok', { name: result.name, size: result.size }, req)
        return sendJson(res, 200, { ok: true, ...result })
      } catch (error) {
        recordDiagnostic('upload-error', { message: error?.message || String(error) }, req)
        return sendJson(res, 400, { ok: false, error: error?.message || String(error) })
      }
    }
    return sendText(res, 404, 'Not found')
  }

  /** 同源管理 API：只看本机 Web UI 调用。 */
  async function routeAdmin(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const route = url.pathname
    const method = req.method ?? 'GET'
    try {
      if (route === `${ADMIN_API}/state`) {
        if (method !== 'GET') return methodNotAllowed(res)
        return sendJson(res, 200, { ok: true, ...snapshot() })
      }
      if (route === `${ADMIN_API}/qr.svg`) {
        if (method !== 'GET') return methodNotAllowed(res)
        const view = snapshot()
        if (!view.url) return sendJson(res, 503, { ok: false, error: '没有可用的局域网地址' })
        return sendSvg(res, qrSvg(view.url))
      }
      if (route === `${ADMIN_API}/list`) {
        if (method !== 'GET') return methodNotAllowed(res)
        const relative = url.searchParams.get('path') ?? ''
        const listing = await listDirectory(state.saveDir, relative)
        return sendJson(res, 200, { ok: true, ...listing })
      }
      if (route === `${ADMIN_API}/mkdir`) {
        if (method !== 'POST') return methodNotAllowed(res)
        const body = await readJsonBody(req)
        const created = await createDirectory(state.saveDir, typeof body.path === 'string' ? body.path : '', body.name)
        return sendJson(res, 200, { ok: true, path: created })
      }
      if (route === `${ADMIN_API}/rename`) {
        if (method !== 'POST') return methodNotAllowed(res)
        const body = await readJsonBody(req)
        if (typeof body.path !== 'string' || !body.path) return badRequest(res, '缺少 path')
        const renamed = await renameEntry(state.saveDir, body.path, body.name)
        return sendJson(res, 200, { ok: true, path: renamed })
      }
      if (route === `${ADMIN_API}/delete`) {
        if (method !== 'POST') return methodNotAllowed(res)
        const body = await readJsonBody(req)
        const targets = Array.isArray(body.paths) ? body.paths : typeof body.path === 'string' ? [body.path] : []
        if (targets.length === 0) return badRequest(res, '缺少要删除的路径')
        let deleted = 0
        for (const target of targets) {
          if (typeof target !== 'string' || !target) continue
          await deleteEntry(state.saveDir, target)
          deleted += 1
        }
        return sendJson(res, 200, { ok: true, deleted })
      }
      if (route === `${ADMIN_API}/open`) {
        if (method !== 'POST') return methodNotAllowed(res)
        const body = await readJsonBody(req)
        const target = resolveInside(state.saveDir, typeof body.path === 'string' ? body.path : '')
        const opened = openInFileManager(target)
        return sendJson(res, 200, { ok: true, opened })
      }
      if (route === `${ADMIN_API}/raw`) {
        if (method !== 'GET') return methodNotAllowed(res)
        const relative = url.searchParams.get('path') || ''
        const target = resolveInside(state.saveDir, relative)
        const info = await stat(target)
        if (!info.isFile()) return badRequest(res, '不是文件')
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.bmp': 'image/bmp',
          '.avif': 'image/avif',
          '.heic': 'image/heic',
        }
        const mime = mimeTypes[path.extname(target).toLowerCase()] || 'application/octet-stream'
        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': info.size,
          'Cache-Control': 'private, max-age=60',
        })
        const stream = createReadStream(target)
        stream.on('error', () => res.destroy())
        stream.pipe(res)
        return
      }

      if (route === `${ADMIN_API}/pick-dir`) {
        if (method !== 'POST') return methodNotAllowed(res)
        let available = false
        let picked = null
        try {
          const picker = ctx.get('directoryPickerController')
          if (picker && typeof picker.pick === 'function') {
            available = true
            picked = await picker.pick(new AbortController().signal)
          }
        } catch (error) {
          return sendJson(res, 200, { ok: false, available: true, error: error?.message || String(error) })
        }
        return sendJson(res, 200, { ok: true, available, path: picked ?? null })
      }
      if (route === `${ADMIN_API}/settings`) {
        if (method !== 'POST') return methodNotAllowed(res)
        const body = await readJsonBody(req)
        if (typeof body.saveDir === 'string') {
          const candidate = path.resolve(expandHome(body.saveDir))
          if (!candidate) return badRequest(res, '保存目录不能为空')
          await mkdir(candidate, { recursive: true })
          state.saveDir = candidate
          persistSettings({ saveDir: candidate })
        }
        if (typeof body.preferredIp === 'string') {
          const wanted = body.preferredIp.trim()
          if (wanted) {
            const known = listIPv4Addresses().some((item) => item.address === wanted)
            if (!known) return badRequest(res, '选择的网络地址已不可用')
          }
          state.preferredIp = wanted
          persistSettings({ preferredIp: wanted })
        }
        return sendJson(res, 200, { ok: true, ...snapshot() })
      }
      if (route === `${ADMIN_API}/rotate-token`) {
        if (method !== 'POST') return methodNotAllowed(res)
        state.token = createToken()
        return sendJson(res, 200, { ok: true, ...snapshot() })
      }
      return sendJson(res, 404, { ok: false, error: 'Not found' })
    } catch (error) {
      return badRequest(res, error?.message || String(error))
    }
  }

  /** 统一的异常兜底：一旦响应头已发出就断开连接。 */
  const guard = (handler) => (req, res) => {
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((error) => {
        ctx.logger?.warn?.('shuttle: 请求处理失败：%s', error?.message ?? error)
        if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'internal-error' })
        else res.destroy()
      })
  }

  // 1) 局域网接收服务。
  let server = null
  try {
    server = http.createServer(guard(routeLan))
    server.on('clientError', (_error, socket) => {
      try {
        socket.destroy()
      } catch {
        // 忽略：连接已断开。
      }
    })
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server?.off('listening', onListening)
        reject(error)
      }
      const onListening = () => {
        server?.off('error', onError)
        resolve()
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(0, '0.0.0.0')
    })
    const address = server.address()
    if (address && typeof address === 'object') state.port = address.port
  } catch (error) {
    state.lanError = error?.message || String(error)
    ctx.logger?.warn?.('shuttle: 局域网监听启动失败：%s', state.lanError)
    server = null
  }

  // 2) 同源管理 API（跟着 DSH Web 服务器的生命周期）。
  ctx.inject(['webServer'], (child) => {
    child.effect(() =>
      child.webServer.register({
        kind: 'prefix',
        path: ADMIN_PREFIX,
        handler: guard(routeAdmin),
      }),
    )
  })

  ctx.effect(() => () => {
    if (!server) return
    const closing = server
    server = null
    try {
      closing.closeAllConnections?.()
    } catch {
      // 忽略：旧连接可能已经断开。
    }
    try {
      closing.close()
    } catch {
      // 忽略：服务可能已经关闭。
    }
  })

  const info = snapshot()
  if (info.url) {
    ctx.logger?.info?.('shuttle: 手机上传地址 %s → %s', info.url, state.saveDir)
  } else {
    ctx.logger?.warn?.('shuttle: 没有找到可用的局域网 IPv4 地址，二维码暂不可用')
  }
}
