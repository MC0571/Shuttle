/**
 * 文件穿梭机 · Shuttle — 文件系统操作。
 *
 * 所有对外暴露的路径都必须是保存目录内的相对路径；越界、绝对路径、
 * 含 .. 的路径一律拒绝，避免 Host 侧被上传/管理接口带到任意位置。
 */
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, rename, rmdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'

const INVALID_NAME = /[\u0000-\u001f<>:"/\\|?*]/

/** 判断 target 是否在 root 内（含 root 本身）。 */
export function isInside(root, target) {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

/** 把相对路径解析成保存目录内的绝对路径。 */
export function resolveInside(root, relative = '') {
  const raw = String(relative ?? '')
  if (raw.includes('\0')) throw new Error('非法路径')
  const target = path.resolve(root, raw.replace(/\\/g, '/'))
  if (!isInside(root, target)) throw new Error('路径超出保存目录')
  return target
}

/** 绝对路径转相对保存目录的 POSIX 形式。 */
export function toRelative(root, absolute) {
  const relative = path.relative(root, absolute)
  return relative.split(path.sep).join('/')
}

/** 清理上传文件名：去目录、非法字符与控制字符。 */
export function sanitizeUploadName(name) {
  let base = String(name ?? 'file')
  base = base.split(/[/\\]/).pop() ?? 'file'
  base = base.replace(INVALID_NAME, '_').replace(/\.+$/, '').trim()
  if (!base || base === '.' || base === '..') base = 'file'
  if (Buffer.byteLength(base, 'utf8') > 200) {
    const extension = path.extname(base).slice(0, 16)
    let stem = base.slice(0, base.length - extension.length)
    while (Buffer.byteLength(stem + extension, 'utf8') > 200) stem = stem.slice(0, -1)
    base = stem + extension
  }
  return base
}

/** 校验用户输入的文件/文件夹名（不允许分隔符）。 */
export function sanitizeEntryName(name) {
  const raw = String(name ?? '').trim()
  if (!raw) throw new Error('名称不能为空')
  if (INVALID_NAME.test(raw)) throw new Error('名称不能包含 / \\ : * ? " < > | 等字符')
  if (raw === '.' || raw === '..') throw new Error('名称不合法')
  return raw
}

/** 目录里是否已有同名项。 */
async function exists(target) {
  try {
    await stat(target)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

/** 生成不冲突的目标路径：img.jpg → img (1).jpg。 */
export async function uniquePath(dir, name) {
  const extension = path.extname(name)
  const stem = name.slice(0, name.length - extension.length) || 'file'
  let candidate = path.join(dir, name)
  let counter = 1
  while (await exists(candidate)) {
    candidate = path.join(dir, `${stem} (${counter})${extension}`)
    counter += 1
  }
  return candidate
}

/** 创建目录（递归）。 */
export async function ensureDirectory(root, relative = '') {
  const target = resolveInside(root, relative)
  await mkdir(target, { recursive: true })
  return target
}

/** 列出一层目录内容，隐藏以 . 开头的项目（临时上传文件用 .part）。 */
export async function listDirectory(root, relative = '') {
  const directory = resolveInside(root, relative)
  const entries = await readdir(directory, { withFileTypes: true })
  const dirs = []
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const absolute = path.join(directory, entry.name)
    let info
    try {
      info = await stat(absolute)
    } catch {
      continue
    }
    const item = {
      name: entry.name,
      path: toRelative(root, absolute),
      size: info.size,
      mtime: info.mtimeMs,
      kind: info.isDirectory() ? 'directory' : 'file',
    }
    if (item.kind === 'directory') dirs.push(item)
    else files.push(item)
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  files.sort((a, b) => b.mtime - a.mtime)
  return {
    path: relative,
    parent: relative ? toRelative(root, path.dirname(directory)) : null,
    dirs,
    files,
  }
}

/** 递归列出目录（用于手机端选择保存子目录）。 */
export async function listDirectories(root, maxDepth = 2) {
  const result = [{ path: '', label: '/' }]
  async function walk(relative, depth) {
    if (depth > maxDepth) return
    let entries
    try {
      entries = await readdir(resolveInside(root, relative), { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name
      result.push({ path: childRelative, label: childRelative })
      await walk(childRelative, depth + 1)
    }
  }
  await walk('', 1)
  result.sort((a, b) => a.path.localeCompare(b.path, 'zh-Hans-CN'))
  return result
}

/** 新建文件夹。 */
export async function createDirectory(root, relative, name) {
  const safeName = sanitizeEntryName(name)
  const parent = resolveInside(root, relative)
  const target = path.join(parent, safeName)
  await mkdir(target)
  return toRelative(root, target)
}

/** 重命名文件或文件夹（只改同一层内的名字）。 */
export async function renameEntry(root, relative, name) {
  const target = resolveInside(root, relative)
  const safeName = sanitizeEntryName(name)
  const next = path.join(path.dirname(target), safeName)
  if (next === target) return toRelative(root, target)
  if (await exists(next)) throw new Error('同一目录下已存在同名项目')
  await rename(target, next)
  return toRelative(root, next)
}

/** 删除文件；文件夹只允许删除空目录，避免误删整棵目录树。 */
export async function deleteEntry(root, relative) {
  const target = resolveInside(root, relative)
  if (target === root) throw new Error('不能删除保存目录本身')
  const info = await stat(target)
  if (info.isDirectory()) {
    await rmdir(target)
  } else {
    await unlink(target)
  }
  return toRelative(root, target)
}

/**
 * 把上传流写入目录：先写 .part 临时文件，成功后原子改名。
 * 返回 { name, path, size }。
 */
export async function saveUpload(root, relativeDir, rawName, input) {
  const directory = await ensureDirectory(root, relativeDir)
  const name = sanitizeUploadName(rawName)
  const temporary = path.join(directory, `.upload-${Date.now()}-${randomBytes(4).toString('hex')}.part`)
  let size = 0
  try {
    const counter = new Transform({
      transform(chunk, _encoding, callback) {
        size += chunk.length
        callback(null, chunk)
      },
    })
    await pipeline(input, counter, createWriteStream(temporary, { flags: 'wx' }))
    const target = await uniquePath(directory, name)
    await rename(temporary, target)
    return { name: path.basename(target), path: toRelative(root, target), size }
  } catch (error) {
    await unlink(temporary).catch(() => {})
    throw error
  }
}

/** 在系统文件管理器里打开某个路径。 */
export function openInFileManager(target) {
  const command =
    process.platform === 'darwin'
      ? ['open', [target]]
      : process.platform === 'win32'
        ? ['explorer', [target]]
        : ['xdg-open', [target]]
  try {
    const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' })
    child.on('error', () => {})
    child.unref()
    return true
  } catch {
    return false
  }
}
