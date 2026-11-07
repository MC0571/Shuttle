/**
 * 文件穿梭机 · Shuttle — Host 侧工具函数。
 *
 * 这里只依赖 Node 内建模块：插件是 DSH 的 Host 代码，在宿主进程里运行，
 * 不引入额外 npm 依赖，安装后无需构建。
 */
import os from 'node:os'
import path from 'node:path'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import qrcode from '../vendor/qrcode.mjs'

/** DSH 主目录：优先 DSH_HOME，其次由 DSH_PROFILE_DIR 推出，最后 ~/.dsh。 */
export function resolveDshHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim()) return path.resolve(fromEnv.trim())
  const profileDir = process.env.DSH_PROFILE_DIR
  if (typeof profileDir === 'string' && profileDir.trim()) {
    return path.dirname(path.dirname(path.resolve(profileDir.trim())))
  }
  return path.join(os.homedir(), '.dsh')
}

/** 展开路径里的 ~。 */
export function expandHome(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''
  if (raw === '~') return os.homedir()
  if (raw.startsWith('~/') || raw.startsWith('~\\')) return path.join(os.homedir(), raw.slice(2))
  return raw
}

/** 系统下载目录：优先环境变量，其次用户主目录下的 Downloads。 */
export function downloadsDir() {
  const fromEnv = process.env.XDG_DOWNLOAD_DIR
  if (typeof fromEnv === 'string' && fromEnv.trim()) return path.resolve(fromEnv.trim())
  return path.join(os.homedir(), 'Downloads')
}

/** 默认接收目录：<系统下载目录>/FileShuttle。 */
export function defaultSaveDir() {
  return path.join(downloadsDir(), 'FileShuttle')
}

/** 默认接收子目录：所有未指定目标的文件都进入这个目录。 */
export const DEFAULT_FOLDER = '默认'

/**
 * 首次启动时决定接收目录：
 * 命令行 config > 已保存设置 > 默认目录。
 * 只有历史上两个默认目录会被迁移到新的 FileShuttle；用户自定义目录保留。
 */
export function resolveInitialSaveDir(configured, saved) {
  const fromConfig = String(configured ?? '').trim()
  if (fromConfig) return fromConfig
  const fromSettings = String(saved ?? '').trim()
  if (fromSettings) {
    const resolved = path.resolve(expandHome(fromSettings))
    const legacyDefaults = [
      path.join(os.homedir(), 'Downloads', 'FilesRemote'),
      path.join(os.homedir(), 'Downloads', 'Shuttle'),
    ]
    if (!legacyDefaults.includes(resolved)) return fromSettings
  }
  return defaultSaveDir()
}

/** 展示用路径：家目录缩成 ~。 */
export function displayPath(target) {
  const home = os.homedir()
  if (target === home) return '~'
  if (target.startsWith(home + path.sep)) return '~' + target.slice(home.length)
  return target
}

/** 设置文件位置。 */
export function settingsFile() {
  return path.join(resolveDshHome(), 'shuttle', 'settings.json')
}

const EMPTY_SETTINGS = { saveDir: '', preferredIp: '' }

function readSettingsFile(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const saveDir = typeof parsed?.saveDir === 'string' ? parsed.saveDir.trim() : ''
    const preferredIp = typeof parsed?.preferredIp === 'string' ? parsed.preferredIp.trim() : ''
    return { saveDir, preferredIp }
  } catch {
    return null
  }
}

/** 旧品牌的设置文件位置。 */
function legacySettingsFile() {
  return path.join(resolveDshHome(), 'files-remote-dsh', 'settings.json')
}

/** 读取持久化设置；旧品牌目录里的设置会迁移到新位置。 */
export function loadSettings() {
  const current = readSettingsFile(settingsFile())
  if (current) return current
  const legacy = readSettingsFile(legacySettingsFile())
  if (legacy) {
    try {
      const file = settingsFile()
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(legacy, null, 2) + '\n', 'utf8')
    } catch {
      // 迁移失败不影响本次使用。
    }
    return legacy
  }
  return { ...EMPTY_SETTINGS }
}

/** 合并写入持久化设置。 */
export function persistSettings(patch) {
  const next = { ...loadSettings(), ...patch }
  const file = settingsFile()
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(next, null, 2) + '\n', 'utf8')
  return next
}

/** 接收记录文件位置。 */
export function receiptsFile() {
  return path.join(resolveDshHome(), 'shuttle', 'received.json')
}

/** 读取指定保存目录对应的接收记录；目录不一致时视为空。 */
export function loadReceipts(saveDir) {
  try {
    const parsed = JSON.parse(readFileSync(receiptsFile(), 'utf8'))
    if (!parsed || typeof parsed.saveDir !== 'string' || path.resolve(parsed.saveDir) !== path.resolve(saveDir)) return []
    if (!Array.isArray(parsed.items)) return []
    return parsed.items.filter(
      (item) =>
        item &&
        typeof item.path === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(item.size) &&
        Number.isFinite(item.at) &&
        typeof item.dir === 'string',
    )
  } catch {
    return []
  }
}

/** 持久化接收记录。 */
export function persistReceipts(saveDir, items) {
  const file = receiptsFile()
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify({ saveDir, items }, null, 2) + '\n', 'utf8')
}

const PRIVATE_V4 = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./]
const LOOPBACK_V4 = /^127\./

/** 是否是私有网段 IPv4。 */
export function isPrivateIPv4(address) {
  return PRIVATE_V4.some((re) => re.test(address))
}

/**
 * 列出可用的局域网 IPv4 地址，按“最可能是当前 WiFi”排序。
 * 过滤回环、链路本地（169.254）与内部地址。
 */
export function listIPv4Addresses() {
  const result = []
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== 'IPv4' || address.internal) continue
      if (LOOPBACK_V4.test(address.address) || address.address.startsWith('169.254.')) continue
      result.push({ name, address: address.address, netmask: address.netmask, mac: address.mac ?? '' })
    }
  }
  result.sort((a, b) => rankAddress(a) - rankAddress(b))
  return result
}

function rankAddress(item) {
  const name = String(item.name).toLowerCase()
  let score = 0
  if (!isPrivateIPv4(item.address)) score += 100
  if (/^(en0|en1)$/.test(name)) score -= 40
  else if (/wi-?fi|wlan|wireless/.test(name)) score -= 35
  else if (/ethernet|^eth\d|^en\d/.test(name)) score -= 20
  else if (/utun|tun|tap|awdl|llw|bridge|vnic|vmnet|docker|vbox|tailscale|zt|wg/.test(name)) score += 60
  return score
}

/** 选择要写进二维码的地址。 */
export function pickAddress(addresses, preferred) {
  const wanted = String(preferred ?? '').trim()
  if (wanted && addresses.some((item) => item.address === wanted)) return wanted
  return addresses[0]?.address ?? ''
}

/** 每次启动生成的一次性 token。 */
export function createToken() {
  return randomBytes(18).toString('base64url')
}

/** 常量时间比较 token，避免按字符泄露。 */
export function tokenMatches(actual, expected) {
  const left = createHash('sha256').update(String(actual ?? '')).digest()
  const right = createHash('sha256').update(String(expected ?? '')).digest()
  return timingSafeEqual(left, right)
}

/** 生成二维码 SVG（纯离线，无外部请求）。 */
export function qrSvg(text, { scale = 8, margin = 3 } = {}) {
  const qr = qrcode(0, 'M')
  qr.addData(String(text))
  qr.make()
  const count = qr.getModuleCount()
  const size = (count + margin * 2) * scale
  const cells = []
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!qr.isDark(row, column)) continue
      cells.push(`M${(column + margin) * scale} ${(row + margin) * scale}h${scale}v${scale}h-${scale}z`)
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"` +
    ` shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${cells.join('')}" fill="#111111"/></svg>`
  )
}

const COMMON_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
}

/** 发送 JSON。 */
export function sendJson(res, status, payload) {
  if (res.writableEnded) return
  const body = JSON.stringify(payload)
  res.writeHead(status, { ...COMMON_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

/** 发送 HTML。 */
export function sendHtml(res, html, status = 200) {
  if (res.writableEnded) return
  const body = Buffer.from(html, 'utf8')
  res.writeHead(status, { ...COMMON_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length })
  res.end(body)
}

/** 发送 SVG。 */
export function sendSvg(res, svg) {
  if (res.writableEnded) return
  const body = Buffer.from(svg, 'utf8')
  res.writeHead(200, { ...COMMON_HEADERS, 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Length': body.length })
  res.end(body)
}

/** 发送纯文本。 */
export function sendText(res, status, text) {
  if (res.writableEnded) return
  const body = Buffer.from(String(text), 'utf8')
  res.writeHead(status, { ...COMMON_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.length })
  res.end(body)
}

/** 读取 JSON 请求体，带大小上限。 */
export async function readJsonBody(req, limit = 1024 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('请求内容过大')
    chunks.push(chunk)
  }
  if (size === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('请求不是合法的 JSON')
  }
}
