/**
 * 文件穿梭机 · Shuttle — Client 半（DSH Web UI 页面）。
 *
 * 侧边栏入口 + 主面板页面：展示二维码、网络接口、接收状态，
 * 并管理保存目录里的文件和文件夹。数据通过同源 /shuttle/api 读写，
 * 手机上传走局域网独立监听端口，不经过浏览器。
 *
 * 注意：Electron 宿主不支持 window.prompt / window.confirm，
 * 因此所有输入与确认都使用页面内自绘弹层。
 */
window.__ModuleLoader__.load({
  id: 'shuttle-dsh',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'shuttle'
    const API = '/shuttle/api'
    const PANEL_KEY = 'shuttle'
    let panelCtx = null

    const zh = {
      'panel.title': '文件穿梭机',
      'page.subtitle': '手机和电脑连同一个 WiFi，扫码即可把照片和文件传到这台电脑，不经过任何中转服务器。',
      'status.ready': '接收中',
      'status.degraded': '未就绪',
      'status.loading': '连接中',
      'common.refresh': '刷新',
      'common.copy': '复制链接',
      'common.copied': '链接已复制',
      'common.open': '打开',
      'common.rename': '重命名',
      'common.delete': '删除',
      'common.save': '保存',
      'common.cancel': '取消',
      'common.loading': '加载中…',
      'common.empty': '还没有文件',
      'qr.title': '扫码传文件',
      'qr.alt': '手机上传二维码',
      'qr.wait': '正在启动接收服务…',
      'qr.hint': '用手机系统相机扫码（微信「扫一扫」可能拦截局域网地址）；打开页面后选择照片或文件即可发送。',
      'qr.reset': '重置链接',
      'qr.resetConfirm': '重置链接后，当前二维码和之前分享的链接会立即失效，确定吗？',
      'qr.last': '最近接收：{name} · {size}',
      'qr.never': '还没有收到文件',
      'qr.lastVisit': '最近扫码：{device} · {ip}',
      'qr.neverVisit': '还没有设备扫码',
      'diag.title': '诊断（最近事件）',
      'diag.none': '暂无事件',
      'diag.pageViews': '页面共打开 {n} 次',
      'diag.page': '页面打开（第 {n} 次）',
      'diag.clientPage': '页面脚本加载完成（第 {n} 次）',
      'diag.reloadedAfterPick': '⚠ 页面在打开选择器后被重载（已选内容丢失）',
      'diag.open': '点开「{label}」选择器',
      'diag.pick': '「{label}」返回 {n} 个文件',
      'diag.empty': '「{label}」返回 0 个文件',
      'diag.focus': '页面恢复焦点，读取到 {n} 个文件',
      'diag.uploadStart': '开始上传 {name}',
      'diag.uploadOk': '上传完成 {name}（{size}）',
      'diag.uploadError': '上传失败：{message}',
      'diag.aborted': '⚠ 上次选图时页面被微信重载：相册选择器打开期间网页被系统回收，照片没有送达。可重新扫码再试，或改用手机系统相机。',
      'device.wechat': '微信内置浏览器',
      'device.mobile': '手机浏览器',
      'device.browser': '浏览器',
      'qr.noNetwork': '没有找到局域网地址，请先把电脑连上 WiFi 或局域网。',
      'network.label': '网络接口',
      'network.cardTitle': '网络与诊断',
      'network.hint': '选择与手机处于同一 WiFi 的地址。',
      'files.title': '已接收文件',
      'files.root': '保存目录',
      'files.newFolder': '新建文件夹',
      'files.newFolderPrompt': '新文件夹名称',
      'files.openFolder': '打开目录',
      'files.reveal': '在文件夹中显示',
      'files.renamePrompt': '新名称',
      'files.deleteConfirm': '删除「{name}」？',
      'files.deleteDirConfirm': '删除空文件夹「{name}」？',
      'files.received': '收到新文件：{name}',
      'files.count': '{dirs} 个文件夹 · {files} 个文件',
      'files.search': '搜索文件名…',
      'files.sort': '排序',
      'files.sortTimeDesc': '最新优先',
      'files.sortTimeAsc': '最早优先',
      'files.sortNameAsc': '名称 A→Z',
      'files.sortNameDesc': '名称 Z→A',
      'files.sortSizeDesc': '大小：大到小',
      'files.sortSizeAsc': '大小：小到大',
      'files.sortType': '类型',
      'files.noMatch': '没有匹配的文件',
      'files.more': '更多操作',
      'files.today': '今天',
      'files.yesterday': '昨天',
      'files.colName': '名称',
      'files.colSize': '大小',
      'files.colTime': '修改时间',
      'files.selectAll': '全选',
      'files.selectedCount': '已选 {n} 项',
      'files.batchDelete': '批量删除',
      'files.batchDeleteConfirm': '删除选中的 {n} 项？文件夹仅能删除空目录。',
      'files.clearSelection': '取消选择',
      'files.emptyTitle': '还没有收到文件',
      'files.emptyHint': '用手机扫描左侧二维码，照片和文件会直接传到这台电脑。',
      'files.noMatchHint': '换个关键词，或清空搜索框再试。',
      'files.up': '上一级',
      'files.groupFolders': '文件夹',
      'files.clearSearch': '清空搜索',
      'settings.title': '保存目录',
      'settings.saveDir': '保存到',
      'settings.change': '修改',
      'settings.changePrompt': '保存目录路径',
      'settings.pick': '选择文件夹…',
      'settings.unavailable': '当前环境无法打开系统文件夹选择器',
      'settings.updated': '保存目录已更新',
      'tips.title': '使用提示',
      'tips.sameWifi': '手机和电脑必须连接同一个 WiFi 或局域网。',
      'tips.wechat': '微信内只显示「文件」入口（照片可在系统选择器的「图片」分类里选）；想要更顺手的体验，建议用手机系统相机扫码，或点右上角「…」→「在浏览器中打开」。',
      'tips.firewall': '首次使用时系统可能询问「是否允许接受传入连接」，必须允许，否则手机无法访问电脑。',
      'tips.foreground': '传输大视频时请保持上传页面在前台，不要锁屏。',
      'tips.token': '链接是本次 DSH 会话的一次性地址；如果误分享，可以点「重置链接」。',
    }

    const en = {
      'panel.title': 'Shuttle',
      'page.subtitle': 'Send photos and files from your phone to this computer over the same Wi-Fi. No relay server.',
      'status.ready': 'Receiving',
      'status.degraded': 'Unavailable',
      'status.loading': 'Connecting',
      'common.refresh': 'Refresh',
      'common.copy': 'Copy link',
      'common.copied': 'Link copied',
      'common.open': 'Open',
      'common.rename': 'Rename',
      'common.delete': 'Delete',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.loading': 'Loading…',
      'common.empty': 'Nothing here yet',
      'qr.title': 'Scan to send',
      'qr.alt': 'QR code for phone upload',
      'qr.wait': 'Starting the receiver…',
      'qr.hint': 'Use your phone system camera to scan (WeChat scanner may block local addresses); then pick photos or files on the page.',
      'qr.reset': 'Reset link',
      'qr.resetConfirm': 'Reset the link? The QR code and previously shared links will stop working.',
      'qr.last': 'Last received: {name} · {size}',
      'qr.never': 'No file received yet',
      'qr.lastVisit': 'Last scan: {device} · {ip}',
      'qr.neverVisit': 'No scan yet',
      'diag.title': 'Diagnostics (recent events)',
      'diag.none': 'No events yet',
      'diag.pageViews': 'Page opened {n} time(s) in total',
      'diag.page': 'Page opened (#{n})',
      'diag.clientPage': 'Page script loaded (#{n})',
      'diag.reloadedAfterPick': '⚠ Page reloaded after opening the picker (selection lost)',
      'diag.open': 'Opened the {label} picker',
      'diag.pick': '{label} picker returned {n} file(s)',
      'diag.empty': '{label} picker returned 0 files',
      'diag.focus': 'Page refocused, read {n} file(s)',
      'diag.uploadStart': 'Upload started: {name}',
      'diag.uploadOk': 'Upload finished: {name} ({size})',
      'diag.uploadError': 'Upload failed: {message}',
      'diag.aborted': '⚠ The page was reloaded by WeChat while the photo picker was open; the photo never reached the page. Rescan to retry, or use the system camera.',
      'device.wechat': 'WeChat browser',
      'device.mobile': 'Mobile browser',
      'device.browser': 'Browser',
      'qr.noNetwork': 'No local network address found. Connect this computer to Wi-Fi or a LAN.',
      'network.label': 'Network interface',
      'network.cardTitle': 'Network & diagnostics',
      'network.hint': 'Pick the address on the same Wi-Fi as your phone.',
      'files.title': 'Received files',
      'files.root': 'Save folder',
      'files.newFolder': 'New folder',
      'files.newFolderPrompt': 'New folder name',
      'files.openFolder': 'Open folder',
      'files.reveal': 'Show in folder',
      'files.renamePrompt': 'New name',
      'files.deleteConfirm': 'Delete "{name}"?',
      'files.deleteDirConfirm': 'Delete the empty folder "{name}"?',
      'files.received': 'New file received: {name}',
      'files.count': '{dirs} folders · {files} files',
      'files.search': 'Search file name…',
      'files.sort': 'Sort',
      'files.sortTimeDesc': 'Newest first',
      'files.sortTimeAsc': 'Oldest first',
      'files.sortNameAsc': 'Name A→Z',
      'files.sortNameDesc': 'Name Z→A',
      'files.sortSizeDesc': 'Size: large to small',
      'files.sortSizeAsc': 'Size: small to large',
      'files.sortType': 'Type',
      'files.noMatch': 'No matching files',
      'files.more': 'More actions',
      'files.today': 'Today',
      'files.yesterday': 'Yesterday',
      'files.colName': 'Name',
      'files.colSize': 'Size',
      'files.colTime': 'Modified',
      'files.selectAll': 'Select all',
      'files.selectedCount': '{n} selected',
      'files.batchDelete': 'Delete selected',
      'files.batchDeleteConfirm': 'Delete the {n} selected item(s)? Only empty folders can be deleted.',
      'files.clearSelection': 'Clear selection',
      'files.emptyTitle': 'No files yet',
      'files.emptyHint': 'Scan the QR code on the left; photos and files will arrive here.',
      'files.noMatchHint': 'Try another keyword or clear the search.',
      'files.up': 'Up',
      'files.groupFolders': 'Folders',
      'files.clearSearch': 'Clear search',
      'settings.title': 'Save folder',
      'settings.saveDir': 'Save to',
      'settings.change': 'Change',
      'settings.changePrompt': 'Save folder path',
      'settings.pick': 'Choose folder…',
      'settings.unavailable': 'The system folder picker is not available here',
      'settings.updated': 'Save folder updated',
      'tips.title': 'Good to know',
      'tips.sameWifi': 'Phone and computer must be on the same Wi-Fi or LAN.',
      'tips.wechat': 'Inside WeChat only the “File” entry is shown (photos live under the system picker’s “Images” section). For a smoother flow use the system camera, or open this page in a browser.',
      'tips.firewall': 'On first use the system may ask to allow incoming connections — allow it, or the phone cannot reach this computer.',
      'tips.foreground': 'Keep the upload page in the foreground while sending large videos.',
      'tips.token': 'The link is a one-time address for this DSH session; reset it if you shared it by mistake.',
    }

    const CSS = `
.fr-root { box-sizing: border-box; height: 100%; overflow: hidden; display: flex; flex-direction: column; padding: 26px 30px 24px; color: var(--dsw-alias-label-primary); font-size: 13.5px; line-height: 1.55; }
.fr-root *, .fr-root *::before, .fr-root *::after { box-sizing: border-box; }
.fr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; max-width: 1120px; width: 100%; margin: 0 auto 16px; flex: none; }
.fr-head-text h1 { margin: 0; font-size: 19px; font-weight: 650; letter-spacing: .01em; }
.fr-head-text p { margin: 4px 0 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary); max-width: 680px; }
.fr-head-actions { display: flex; align-items: center; gap: 10px; flex: none; }
.fr-status { font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.fr-status-ready { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.fr-status-degraded { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }
.fr-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 6px 12px; font-size: 12.5px; font-family: inherit; cursor: pointer; white-space: nowrap; }
.fr-btn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.fr-btn:disabled { opacity: .5; cursor: default; }
.fr-btn-primary { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: #fff; }
.fr-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); opacity: .92; }
.fr-btn-danger { background: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); color: #fff; }
.fr-btn-danger:hover:not(:disabled) { background: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); opacity: .92; }
.fr-grid { display: grid; grid-template-columns: minmax(300px, 360px) minmax(0, 1fr); gap: 16px; max-width: 1120px; width: 100%; margin: 0 auto; flex: 1; min-height: 0; align-items: stretch; }
.fr-side { display: flex; flex-direction: column; gap: 16px; min-height: 0; overflow: auto; padding-right: 2px; }
.fr-main { display: flex; flex-direction: column; min-height: 0; }
.fr-card-files { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.fr-card { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 18px; min-width: 0; }
.fr-save-path { display: flex; align-items: center; gap: 10px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
.fr-save-icon { flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: rgba(37, 99, 235, .12); color: var(--dsw-alias-brand-primary); }
.fr-save-path-text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; color: var(--dsw-alias-label-primary); }
.fr-btn-block { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 12px; font-size: 13px; border-radius: 9px; }
.fr-btn-icon { display: inline-flex; align-items: center; }
.fr-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.fr-card h2 { margin: 0; font-size: 14px; font-weight: 650; letter-spacing: .01em; }
.fr-qr-box { display: flex; justify-content: center; padding: 14px; margin-bottom: 14px; border-radius: 12px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); }
.fr-qr { width: 100%; max-width: 236px; height: auto; display: block; border-radius: 10px; background: #fff; }
.fr-qr-empty { min-height: 180px; align-items: center; color: var(--dsw-alias-label-secondary); font-size: 12.5px; text-align: center; }
.fr-qr-hint { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(37, 99, 235, .12), rgba(96, 165, 250, .08)); border: 1px solid rgba(37, 99, 235, .22);
  color: var(--dsw-alias-brand-primary); font-size: 12.5px; font-weight: 600; line-height: 1.45; }
.fr-qr-hint svg { flex: none; margin-top: 1px; }
.fr-save-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 13px; border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px;
  text-align: left; cursor: pointer; }
.fr-save-row:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.fr-save-row:disabled { opacity: .5; cursor: default; }
.fr-save-label { flex: none; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.fr-save-path-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; font-weight: 600; }
.fr-save-chevron { flex: none; color: var(--dsw-alias-label-secondary); font-size: 18px; line-height: 1; }
.fr-field { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--dsw-alias-label-secondary); margin-bottom: 6px; }
.fr-field select { flex: 1; min-width: 0; appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 7px 10px; font-size: 12.5px; font-family: inherit; }
.fr-hint { margin: 0 0 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fr-warn { color: var(--dsw-alias-state-warn-primary); }
.fr-url { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11.5px; word-break: break-all; background: var(--dsw-alias-bg-base); border: 1px dashed var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 10px; color: var(--dsw-alias-label-secondary); margin-bottom: 12px; }
.fr-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.fr-last { margin: 12px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); word-break: break-all; }
.fr-diag { margin: 10px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fr-diag summary { cursor: pointer; }
.fr-diag ul { margin: 6px 0 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow: auto; }
.fr-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-bottom: 10px; font-size: 12.5px; }
.fr-crumb { appearance: none; border: none; background: none; color: var(--dsw-alias-label-secondary); padding: 2px 5px; border-radius: 6px; cursor: pointer; font-size: 12.5px; font-family: inherit; }
.fr-crumb:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-crumb-sep { color: var(--dsw-alias-border-l2); padding: 0 1px; }
.fr-list { border-top: 1px solid var(--dsw-alias-border-l1); flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; position: relative; }
.fr-table-head { display: grid; grid-template-columns: 26px 18px minmax(0, 1fr) 72px 102px 30px; align-items: center; gap: 10px; padding: 7px 6px; border-top: 1px solid var(--dsw-alias-border-l1); border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 11px; color: var(--dsw-alias-label-secondary); flex: none; }
.fr-table-head span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-row { display: grid; grid-template-columns: 26px 18px minmax(0, 1fr) 72px 102px 30px; align-items: center; gap: 10px; padding: 8px 6px; height: 56px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.fr-row:hover { background: var(--dsw-alias-bg-layer-2); }
.fr-row-new { animation: frNewRow 3.2s ease-out; }
@keyframes frNewRow { 0% { background: rgba(37, 99, 235, .16); } 100% { background: transparent; } }
.fr-row-busy { opacity: .55; }
.fr-row-icon { font-size: 13px; text-align: center; }
.fr-check { width: 15px; height: 15px; margin: 0; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
.fr-thumb { width: 30px; height: 30px; border-radius: 7px; overflow: hidden; background: var(--dsw-alias-bg-base); display: block; }
.fr-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fr-group { display: flex; align-items: center; gap: 8px; height: 32px; padding: 6px 6px 2px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); border-bottom: 1px solid var(--dsw-alias-border-l1); position: sticky; top: 0; z-index: 2; }
.fr-group b { font-weight: 600; color: var(--dsw-alias-label-primary); }
.fr-row-name { display: flex; align-items: flex-start; gap: 5px; min-width: 0; overflow: hidden; font-size: 13px; line-height: 1.35; }
.fr-row-name-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; overflow-wrap: anywhere; max-height: 2.7em; }
.fr-row-ext { flex: none; margin-top: 1px; padding: 0 4px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 9.5px; line-height: 1.45; text-transform: uppercase; }
.fr-row-link { appearance: none; border: none; background: none; text-align: left; padding: 0; color: var(--dsw-alias-brand-primary); cursor: pointer; font-size: 13px; font-family: inherit; }
.fr-row-link:hover { text-decoration: underline; }
.fr-row-meta, .fr-row-time { font-size: 11.5px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-row-actions { display: flex; gap: 8px; justify-content: flex-end; position: relative; }
.fr-more { appearance: none; border: none; background: none; color: var(--dsw-alias-label-secondary); font-size: 17px; line-height: 1; padding: 2px 4px; border-radius: 6px; cursor: pointer; font-family: inherit; }
.fr-more:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-more:disabled { opacity: .5; cursor: default; }
.fr-list-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.fr-search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary); }
.fr-search svg { flex: none; }
.fr-search input { flex: 1; min-width: 0; appearance: none; border: none; outline: none; background: none; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 12.5px; padding: 0; }
.fr-sort { flex: none; max-width: 130px; appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary); border-radius: 8px; padding: 6px 8px; font-size: 12px; font-family: inherit; }
.fr-menu-overlay { position: fixed; inset: 0; z-index: 70; }
.fr-row-menu { position: fixed; z-index: 71; width: 168px; padding: 5px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-overlay); box-shadow: 0 12px 36px rgba(15, 23, 42, .22); }
.fr-menu-item { display: block; width: 100%; padding: 8px 10px; border: none; border-radius: 7px; background: none; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.fr-menu-item:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.fr-menu-item:disabled { opacity: .5; cursor: default; }
.fr-menu-item-danger { color: var(--dsw-alias-state-error-primary); }
.fr-link { appearance: none; border: none; background: none; color: var(--dsw-alias-label-secondary); font-size: 12px; padding: 2px 0; cursor: pointer; font-family: inherit; white-space: nowrap; }
.fr-link:hover:not(:disabled) { color: var(--dsw-alias-brand-primary); }
.fr-link:disabled { opacity: .5; cursor: default; }
.fr-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.fr-empty { padding: 36px 16px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12.5px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.fr-empty-icon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--dsw-alias-bg-layer-2); font-size: 20px; }
.fr-empty strong { font-size: 13.5px; color: var(--dsw-alias-label-primary); font-weight: 600; }
.fr-selection-bar { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; padding: 7px 10px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fr-selection-bar .fr-count { margin-left: auto; }
.fr-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 12px; color: var(--dsw-alias-label-secondary); flex-wrap: wrap; }
.fr-count { margin-left: auto; }
.fr-tips { max-width: none; margin: 0; flex: none; }
.fr-tips ul { margin: 8px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; }
.fr-banner { max-width: 1120px; margin: 0 auto 12px; padding: 9px 12px; border-radius: 9px; font-size: 12.5px; background: var(--dsw-alias-bg-layer-1); }
.fr-banner-error { color: var(--dsw-alias-state-error-primary); border: 1px solid var(--dsw-alias-state-error-primary); }
.fr-banner-ok { color: var(--dsw-alias-state-success-primary); border: 1px solid var(--dsw-alias-state-success-primary); }
.fr-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 24px; background: rgba(15, 23, 42, .36); }
.fr-dialog { width: min(440px, calc(100vw - 48px)); background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 20px; box-shadow: 0 18px 60px rgba(15, 23, 42, .28); }
.fr-dialog h3 { margin: 0 0 8px; font-size: 15px; font-weight: 650; }
.fr-dialog-message { margin: 0 0 14px; font-size: 13px; color: var(--dsw-alias-label-secondary); word-break: break-word; }
.fr-dialog-input { width: 100%; appearance: none; border: 1px solid var(--dsw-alias-border-l2); border-radius: 9px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); padding: 9px 11px; font-size: 13.5px; font-family: inherit; margin: 2px 0 16px; }
.fr-dialog-input:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; }
.fr-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 900px) {
  .fr-root { padding: 16px 14px 20px; overflow: auto; }
  .fr-grid { display: flex; flex-direction: column; flex: none; }
  .fr-side { overflow: visible; }
  .fr-card-files { min-height: 460px; }
  .fr-row { grid-template-columns: 24px 18px minmax(0, 1fr) 30px; height: 56px; }
  .fr-table-head { display: none; }
  .fr-row-meta, .fr-row-time { display: none; }
}
`

    function postJson(body) {
      return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    }

    async function request(endpoint, options) {
      const response = await fetch(API + endpoint, Object.assign({ cache: 'no-store' }, options))
      let data = null
      try {
        data = await response.json()
      } catch {
        data = null
      }
      if (!response.ok || !data || data.ok !== true) {
        const message = data && typeof data.error === 'string' && data.error ? data.error : `HTTP ${response.status}`
        throw new Error(message)
      }
      return data
    }

    function formatSize(bytes) {
      const value = Number(bytes)
      if (!Number.isFinite(value) || value < 0) return ''
      if (value < 1024) return `${value} B`
      const units = ['KB', 'MB', 'GB', 'TB']
      let size = value / 1024
      let index = 0
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024
        index += 1
      }
      return `${size >= 10 ? Math.round(size) : size.toFixed(1)} ${units[index]}`
    }

    function formatTime(milliseconds) {
      const value = Number(milliseconds)
      if (!Number.isFinite(value) || value <= 0) return ''
      try {
        return new Date(value).toLocaleString()
      } catch {
        return ''
      }
    }

    function formatFileTime(milliseconds, translate) {
      const value = Number(milliseconds)
      if (!Number.isFinite(value) || value <= 0) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      const pad = (number) => String(number).padStart(2, '0')
      const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
      const sameDay = (left, right) =>
        left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
      if (sameDay(date, now)) return `${translate('files.today')} ${clock}`
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      if (sameDay(date, yesterday)) return `${translate('files.yesterday')} ${clock}`
      const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
      if (date.getFullYear() === now.getFullYear()) return `${monthDay} ${clock}`
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    function fileExtension(name) {
      const text = String(name || '')
      const dot = text.lastIndexOf('.')
      return dot > 0 && dot < text.length - 1 ? text.slice(dot + 1).toLowerCase() : ''
    }

    function fileIcon(name, kind) {
      if (kind === 'directory') return '📁'
      const extension = fileExtension(name)
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'heic'].includes(extension)) return '🖼️'
      if (['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'ts'].includes(extension)) return '🎬'
      if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(extension)) return '🎵'
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) return '🗜️'
      if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'pages'].includes(extension)) return '📄'
      if (['xls', 'xlsx', 'csv', 'numbers'].includes(extension)) return '📊'
      if (['ppt', 'pptx', 'key'].includes(extension)) return '📽️'
      if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java', 'sh'].includes(extension)) return '🧾'
      return '📄'
    }

    function imageFile(name) {
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'heic'].includes(fileExtension(name))
    }

    function formatGroupLabel(milliseconds, translate) {
      const value = Number(milliseconds)
      if (!Number.isFinite(value) || value <= 0) return ''
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      const sameDay = (left, right) =>
        left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
      if (sameDay(date, now)) return translate('files.today')
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      if (sameDay(date, yesterday)) return translate('files.yesterday')
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date)
    }

    function formatDiagnostic(event, translate) {
      const type = String(event && event.type ? event.type : '')
      const detail = (event && event.detail) || {}
      const label = detail.label || ''
      if (type === 'page') return translate('diag.page').replace('{n}', String(detail.view || 0))
      if (type === 'client:page') {
        if (detail.pickedBeforeReload) return translate('diag.reloadedAfterPick')
        return translate('diag.clientPage').replace('{n}', String(detail.reloads || 1))
      }
      if (type === 'client:open') return translate('diag.open').replace('{label}', label)
      if (type === 'client:pick') return translate('diag.pick').replace('{label}', label).replace('{n}', String(detail.count || 0))
      if (type === 'client:empty') return translate('diag.empty').replace('{label}', label)
      if (type === 'client:focus') return translate('diag.focus').replace('{n}', String(detail.count || 0))
      if (type === 'upload-start') return translate('diag.uploadStart').replace('{name}', detail.name || '')
      if (type === 'upload-ok') return translate('diag.uploadOk').replace('{name}', detail.name || '').replace('{size}', formatSize(detail.size))
      if (type === 'upload-error') return translate('diag.uploadError').replace('{message}', detail.message || '')
      return type
    }

    function fallbackCopy(text, done) {
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
        done()
      } catch {
        // 复制失败时不打断主流程。
      }
    }

    function Icon({ size = 18, active = false }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('rect', { x: 3, y: 3, width: 7, height: 7, rx: 1.4, stroke: 'currentColor', strokeWidth: 1.6, fill: active ? 'currentColor' : 'none', fillOpacity: active ? 0.16 : 0 }),
        h('rect', { x: 14, y: 3, width: 7, height: 7, rx: 1.4, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('rect', { x: 3, y: 14, width: 7, height: 7, rx: 1.4, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('rect', { x: 14, y: 14, width: 3.2, height: 3.2, rx: 0.6, fill: 'currentColor' }),
        h('rect', { x: 19, y: 14, width: 2, height: 2, rx: 0.4, fill: 'currentColor' }),
        h('rect', { x: 14, y: 19, width: 2, height: 2, rx: 0.4, fill: 'currentColor' }),
        h('rect', { x: 18.5, y: 18.5, width: 2.5, height: 2.5, rx: 0.5, fill: 'currentColor' }),
      )
    }

    /** 页面内弹层：替代 Electron 不支持的 window.prompt / window.confirm。 */
    function Dialog({ dialog, translate, onCancel, onSubmit }) {
      const isText = dialog.type === 'text'
      const [value, setValue] = React.useState(dialog.value || '')
      const inputRef = React.useRef(null)

      React.useEffect(() => {
        if (isText && inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }, [isText])

      const submit = () => {
        if (isText && !value.trim()) return
        onSubmit(value)
      }

      return h(
        'div',
        {
          className: 'fr-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onCancel()
          },
        },
        h(
          'div',
          {
            className: 'fr-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
            },
          },
          h('h3', null, dialog.title),
          dialog.message ? h('p', { className: 'fr-dialog-message' }, dialog.message) : null,
          isText
            ? h('input', {
                ref: inputRef,
                className: 'fr-dialog-input',
                value,
                spellCheck: false,
                'aria-label': dialog.title,
                onChange: (event) => setValue(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submit()
                  }
                },
              })
            : null,
          h(
            'div',
            { className: 'fr-dialog-actions' },
            h('button', { type: 'button', className: 'fr-btn', onClick: onCancel }, translate('common.cancel')),
            h(
              'button',
              {
                type: 'button',
                className: `fr-btn fr-btn-primary${dialog.danger ? ' fr-btn-danger' : ''}`,
                onClick: submit,
                disabled: isText && !value.trim(),
              },
              dialog.confirmText || translate('common.save'),
            ),
          ),
        ),
      )
    }

    function Page(props) {
      const translate = React.useCallback(
        (key) => {
          if (typeof props.t === 'function') {
            const value = props.t(key)
            if (value && value !== key) return value
          }
          return key
        },
        [props.t],
      )

      const [state, setState] = React.useState(null)
      const [listing, setListing] = React.useState(null)
      const [currentPath, setCurrentPath] = React.useState('')
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [dialog, setDialog] = React.useState(null)
      const [search, setSearch] = React.useState('')
      const [rowBusy, setRowBusy] = React.useState('')
      const [freshPath, setFreshPath] = React.useState('')
      const [selectedPaths, setSelectedPaths] = React.useState([])
      const [scrollTop, setScrollTop] = React.useState(0)
      const [viewportHeight, setViewportHeight] = React.useState(420)
      const [sort, setSort] = React.useState(() => {
        const allowed = ['time-desc', 'time-asc', 'name-asc', 'name-desc', 'size-desc', 'size-asc', 'type-asc']
        try {
          const saved = localStorage.getItem('shuttle.listSort')
          return allowed.includes(saved) ? saved : 'time-desc'
        } catch {
          return 'time-desc'
        }
      })
      const [rowMenu, setRowMenu] = React.useState(null)

      const pathRef = React.useRef('')
      const listingSeq = React.useRef(0)
      const dialogAction = React.useRef(null)
      const noticeTimer = React.useRef(null)
      const lastUploadAt = React.useRef(null)
      const freshTimer = React.useRef(null)
      const listRef = React.useRef(null)
      const selectAllRef = React.useRef(null)

      React.useEffect(
        () => () => {
          if (noticeTimer.current) clearTimeout(noticeTimer.current)
          if (freshTimer.current) clearTimeout(freshTimer.current)
        },
        [],
      )

      React.useEffect(() => {
        try {
          localStorage.setItem('shuttle.listSort', sort)
        } catch {
          // localStorage 不可用时仅保留当前会话排序。
        }
      }, [sort])

      React.useEffect(() => {
        if (!rowMenu) return undefined
        const close = () => setRowMenu(null)
        const onKey = (event) => {
          if (event.key === 'Escape') close()
        }
        window.addEventListener('keydown', onKey)
        window.addEventListener('resize', close)
        document.addEventListener('scroll', close, true)
        return () => {
          window.removeEventListener('keydown', onKey)
          window.removeEventListener('resize', close)
          document.removeEventListener('scroll', close, true)
        }
      }, [rowMenu])

      const flash = (text) => {
        setNotice(text)
        if (noticeTimer.current) clearTimeout(noticeTimer.current)
        noticeTimer.current = setTimeout(() => setNotice(''), 3200)
      }

      const loadState = async () => {
        const data = await request('/state')
        setState(data)
        return data
      }

      const loadListing = async (target) => {
        const wanted = typeof target === 'string' ? target : pathRef.current
        const seq = listingSeq.current + 1
        listingSeq.current = seq
        const data = await request('/list?path=' + encodeURIComponent(wanted || ''))
        if (seq !== listingSeq.current) return data
        setListing(data)
        const resolved = typeof data.path === 'string' ? data.path : ''
        setCurrentPath(resolved)
        pathRef.current = resolved
        return data
      }

      // 同时刷新状态与当前目录；桌面端列表靠它自动更新。
      const refresh = React.useCallback(async (target) => {
        try {
          const next = await loadState()
          await loadListing(typeof target === 'string' ? target : pathRef.current)
          setError('')
          const uploadAt = next && next.lastUpload ? next.lastUpload.at : null
          if (uploadAt && uploadAt !== lastUploadAt.current) {
            const firstTime = lastUploadAt.current === null
            lastUploadAt.current = uploadAt
            if (!firstTime && next.lastUpload.name) {
              flash(translate('files.received').replace('{name}', next.lastUpload.name))
              const uploadedPath = next.lastUpload.path || next.lastUpload.name
              setFreshPath(uploadedPath)
              if (freshTimer.current) clearTimeout(freshTimer.current)
              freshTimer.current = setTimeout(() => setFreshPath(''), 3600)
            }
          }
        } catch (refreshError) {
          setError(refreshError && refreshError.message ? refreshError.message : String(refreshError))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [translate])

      React.useEffect(() => {
        let timer = null
        const start = () => {
          if (timer !== null) return
          timer = setInterval(() => {
            if (!document.hidden) refresh()
          }, 2500)
        }
        const stop = () => {
          if (timer === null) return
          clearInterval(timer)
          timer = null
        }
        const onVisibility = () => {
          if (document.hidden) {
            stop()
            return
          }
          refresh()
          start()
        }
        refresh('')
        start()
        document.addEventListener('visibilitychange', onVisibility)
        return () => {
          stop()
          document.removeEventListener('visibilitychange', onVisibility)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      const act = async (operation) => {
        setBusy(true)
        setError('')
        try {
          await operation()
        } catch (operationError) {
          setError(operationError && operationError.message ? operationError.message : String(operationError))
        } finally {
          setBusy(false)
        }
      }

      const closeDialog = () => {
        dialogAction.current = null
        setDialog(null)
      }

      const submitDialog = (value) => {
        const action = dialogAction.current
        dialogAction.current = null
        setDialog(null)
        if (action) action(value)
      }

      const askText = (descriptor, handler) => {
        dialogAction.current = handler
        setDialog({ type: 'text', ...descriptor })
      }

      const askConfirm = (descriptor, handler) => {
        dialogAction.current = handler
        setDialog({ type: 'confirm', ...descriptor })
      }

      const copyLink = () => {
        if (!state || !state.url) return
        const done = () => flash(translate('common.copied'))
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(state.url).then(done, () => fallbackCopy(state.url, done))
          return
        }
        fallbackCopy(state.url, done)
      }

      const chooseAddress = (address) => {
        act(async () => {
          const next = await request('/settings', postJson({ preferredIp: address }))
          setState(next)
        })
      }

      const rotateToken = () => {
        askConfirm(
          {
            title: translate('qr.reset'),
            message: translate('qr.resetConfirm'),
            confirmText: translate('qr.reset'),
            danger: true,
          },
          () => {
            act(async () => {
              const next = await request('/rotate-token', { method: 'POST' })
              setState(next)
            })
          },
        )
      }

      const navigateTo = (target) => {
        pathRef.current = target
        act(async () => {
          await loadListing(target)
        })
      }

      const createFolder = () => {
        askText(
          {
            title: translate('files.newFolderPrompt'),
            value: '',
            confirmText: translate('files.newFolder'),
          },
          (name) => {
            if (!name || !name.trim()) return
            act(async () => {
              await request('/mkdir', postJson({ path: pathRef.current, name }))
              await loadListing(pathRef.current)
            })
          },
        )
      }

      const runRowAction = async (item, operation) => {
        setRowBusy(item.path)
        setError('')
        try {
          await operation()
        } catch (actionError) {
          setError(actionError && actionError.message ? actionError.message : String(actionError))
        } finally {
          setRowBusy('')
        }
      }

      const toggleSelect = (path) => {
        setSelectedPaths((previous) => (previous.includes(path) ? previous.filter((value) => value !== path) : previous.concat(path)))
      }

      const toggleSelectAll = (items) => {
        const paths = items.map((item) => item.path)
        setSelectedPaths((previous) => (paths.every((path) => previous.includes(path)) ? previous.filter((path) => !paths.includes(path)) : Array.from(new Set(previous.concat(paths)))))
      }

      const deleteSelected = () => {
        const paths = selectedPaths.slice()
        if (paths.length === 0) return
        askConfirm(
          {
            title: translate('files.batchDelete'),
            message: translate('files.batchDeleteConfirm').replace('{n}', String(paths.length)),
            confirmText: translate('files.batchDelete'),
            danger: true,
          },
          () => {
            act(async () => {
              await request('/delete', postJson({ paths }))
              setSelectedPaths([])
              await loadListing(pathRef.current)
            })
          },
        )
      }

      const renameItem = (item) => {
        askText(
          {
            title: translate('files.renamePrompt'),
            value: item.name,
            confirmText: translate('common.rename'),
          },
          (next) => {
            if (!next || !next.trim() || next.trim() === item.name) return
            runRowAction(item, async () => {
              await request('/rename', postJson({ path: item.path, name: next }))
              await loadListing(pathRef.current)
            })
          },
        )
      }

      const removeItem = (item) => {
        const template = item.kind === 'directory' ? translate('files.deleteDirConfirm') : translate('files.deleteConfirm')
        askConfirm(
          {
            title: translate('common.delete'),
            message: template.replace('{name}', item.name),
            confirmText: translate('common.delete'),
            danger: true,
          },
          () => {
            runRowAction(item, async () => {
              await request('/delete', postJson({ paths: [item.path] }))
              await loadListing(pathRef.current)
            })
          },
        )
      }

      const revealItem = (item) => {
        runRowAction(item, async () => {
          await request('/open', postJson({ path: item.path }))
        })
      }

      const openCurrentDir = () => {
        act(async () => {
          await request('/open', postJson({ path: pathRef.current }))
        })
      }

      const changeSaveDir = () => {
        if (!state) return
        act(async () => {
          let picked = null
          // 桌面端优先走 preload 的 Electron 原生对话框；它直接调用
          // dialog.showOpenDialog，比 Host 的 osascript 目录选择器快很多。
          const desktopPicker = typeof globalThis !== 'undefined' ? globalThis.__DSH_DIRECTORY_PICKER__ : null
          if (desktopPicker && typeof desktopPicker.pick === 'function') {
            picked = await desktopPicker.pick()
          } else {
            const workspace = panelCtx && typeof panelCtx.get === 'function' ? panelCtx.get('uiWorkspace') : null
            if (workspace && typeof workspace.pickDirectory === 'function') {
              picked = await workspace.pickDirectory()
            } else {
              const result = await request('/pick-dir', { method: 'POST' })
              if (!result.available) throw new Error(translate('settings.unavailable'))
              picked = result.path
            }
          }
          if (!picked) return
          const updated = await request('/settings', postJson({ saveDir: picked }))
          setState(updated)
          pathRef.current = ''
          await loadListing('')
          flash(translate('settings.updated'))
        })
      }

      const status = state ? (state.lanError ? 'degraded' : state.url ? 'ready' : 'degraded') : 'loading'
      const statusText =
        status === 'ready' ? translate('status.ready') : status === 'loading' ? translate('status.loading') : translate('status.degraded')

      const addresses = state && Array.isArray(state.addresses) ? state.addresses : []
      const dirs = listing && Array.isArray(listing.dirs) ? listing.dirs : []
      const files = listing && Array.isArray(listing.files) ? listing.files : []

      const searchNeedle = search.trim().toLowerCase()
      const matchesSearch = (item) => !searchNeedle || String(item.name || '').toLowerCase().includes(searchNeedle)
      const sortParts = String(sort || 'time-desc').split('-')
      const sortKey = sortParts[0] || 'time'
      const sortAscending = sortParts[1] === 'asc'
      const compareEntries = (left, right) => {
        let result = 0
        if (sortKey === 'name') {
          result = String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
        } else if (sortKey === 'size') {
          result = Number(left.size || 0) - Number(right.size || 0)
        } else if (sortKey === 'type') {
          result = fileExtension(left.name).localeCompare(fileExtension(right.name)) || String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
        } else {
          result = Number(left.mtime || 0) - Number(right.mtime || 0)
        }
        return sortAscending ? result : -result
      }
      const visibleDirs = dirs.filter(matchesSearch).slice().sort((left, right) =>
        String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }),
      )
      const visibleFiles = files.filter(matchesSearch).slice().sort(compareEntries)
      const visibleTotal = visibleDirs.length + visibleFiles.length

      React.useEffect(() => {
        const available = new Set(dirs.concat(files).map((item) => item.path))
        setSelectedPaths((previous) => {
          const next = previous.filter((path) => available.has(path))
          return next.length === previous.length ? previous : next
        })
      }, [listing])

      React.useEffect(() => {
        setScrollTop(0)
        if (listRef.current) listRef.current.scrollTop = 0
      }, [currentPath, search, sort])

      React.useEffect(() => {
        const node = listRef.current
        if (!node) return undefined
        const measure = () => setViewportHeight(node.clientHeight || 420)
        measure()
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
      }, [state])

      const renderName = (item) => {
        const extension = item.kind === 'directory' ? '' : fileExtension(item.name)
        const stem = extension ? item.name.slice(0, item.name.length - extension.length - 1) : item.name
        return [
          h('span', { key: 'text', className: 'fr-row-name-text' }, stem || item.name),
          extension ? h('span', { key: 'ext', className: 'fr-row-ext' }, extension) : null,
        ]
      }

      const openRowMenu = (event, item) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = 168
        const height = 116
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
        const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
        setRowMenu({ item, left, top })
      }

      const renderEntry = (item) => {
        const isSelected = selectedPaths.includes(item.path)
        const isBusy = rowBusy === item.path
        return h(
          'div',
          { key: item.path, className: 'fr-row' + (freshPath === item.path ? ' fr-row-new' : '') + (isBusy ? ' fr-row-busy' : '') },
          h('input', {
            type: 'checkbox',
            className: 'fr-check',
            checked: isSelected,
            onChange: () => toggleSelect(item.path),
            'aria-label': translate('files.selectAll') + ': ' + item.name,
          }),
          item.kind === 'file' && imageFile(item.name)
            ? h(
                'span',
                { className: 'fr-thumb' },
                h('img', {
                  src: API + '/raw?path=' + encodeURIComponent(item.path),
                  loading: 'lazy',
                  alt: '',
                }),
              )
            : h('span', { className: 'fr-row-icon', 'aria-hidden': true }, fileIcon(item.name, item.kind)),
          item.kind === 'directory'
            ? h('button', { type: 'button', className: 'fr-row-name fr-row-link', onClick: () => navigateTo(item.path), title: item.name }, renderName(item))
            : h('span', { className: 'fr-row-name', title: item.name }, renderName(item)),
          h('span', { className: 'fr-row-meta' }, item.kind === 'directory' ? '' : formatSize(item.size)),
          h('span', { className: 'fr-row-time', title: formatTime(item.mtime) }, formatFileTime(item.mtime, translate)),
          h(
            'span',
            { className: 'fr-row-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'fr-more',
                onClick: (event) => openRowMenu(event, item),
                disabled: busy || isBusy,
                'aria-label': translate('files.more'),
                title: translate('files.more'),
              },
              isBusy ? '…' : '⋯',
            ),
          ),
        )
      }

      const listRows = []
      if (visibleDirs.length > 0) {
        listRows.push({ type: 'group', key: 'group-folders', label: translate('files.groupFolders') })
        for (const item of visibleDirs) listRows.push({ type: 'row', key: item.path, item })
      }
      if (visibleFiles.length > 0) {
        if (sortKey === 'time') {
          let lastDay = ''
          for (const item of visibleFiles) {
            const date = new Date(item.mtime || 0)
            const day = Number.isNaN(date.getTime())
              ? 'unknown'
              : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
            if (day !== lastDay) {
              listRows.push({ type: 'group', key: 'group-' + day, label: formatGroupLabel(item.mtime, translate) })
              lastDay = day
            }
            listRows.push({ type: 'row', key: item.path, item })
          }
        } else {
          for (const item of visibleFiles) listRows.push({ type: 'row', key: item.path, item })
        }
      }

      const ROW_HEIGHT = 56
      const GROUP_HEIGHT = 32
      const rowEnds = []
      let listHeight = 0
      for (const row of listRows) {
        listHeight += row.type === 'group' ? GROUP_HEIGHT : ROW_HEIGHT
        rowEnds.push(listHeight)
      }
      const virtual = listRows.length > 160
      const findRowIndex = (offset) => {
        let low = 0
        let high = rowEnds.length
        while (low < high) {
          const middle = Math.floor((low + high) / 2)
          if (rowEnds[middle] <= offset) low = middle + 1
          else high = middle
        }
        return low
      }
      const startIndex = virtual ? findRowIndex(Math.max(0, scrollTop - 120)) : 0
      let renderStart = Math.min(startIndex, listRows.length - 1)
      while (renderStart > 0 && listRows[renderStart].type !== 'group') renderStart -= 1
      const endIndex = virtual ? findRowIndex(scrollTop + viewportHeight + 240) : listRows.length
      const paddingTop = virtual && renderStart > 0 ? rowEnds[renderStart - 1] : 0
      const paddingBottom = virtual && endIndex < rowEnds.length ? listHeight - rowEnds[endIndex - 1] : 0
      const renderedRows = virtual ? listRows.slice(renderStart, endIndex) : listRows
      const allVisibleItems = visibleDirs.concat(visibleFiles)
      const selectedCount = selectedPaths.length
      const allVisibleSelected = allVisibleItems.length > 0 && allVisibleItems.every((item) => selectedPaths.includes(item.path))
      const someVisibleSelected = allVisibleItems.some((item) => selectedPaths.includes(item.path))

      React.useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
      }, [someVisibleSelected, allVisibleSelected])

      const renderListRow = (row) =>
        row.type === 'group'
          ? h('div', { key: row.key, className: 'fr-group' }, h('b', null, row.label))
          : renderEntry(row.item)

      const wifiGlyph = h(
        'svg',
        { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M2.5 8.6a15.2 15.2 0 0 1 19 0' }),
        h('path', { d: 'M5.6 12.1a10.4 10.4 0 0 1 12.8 0' }),
        h('path', { d: 'M8.8 15.5a5.6 5.6 0 0 1 6.4 0' }),
        h('circle', { cx: 12, cy: 19, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      )

      const qrCard = h(
        'section',
        { className: 'fr-card' },
        h('div', { className: 'fr-card-head' }, h('h2', null, translate('qr.title'))),
        state && state.url
          ? h('div', { className: 'fr-qr-box' }, h('img', { className: 'fr-qr', src: state.qrSvgUrl, alt: translate('qr.alt') }))
          : h('div', { className: 'fr-qr-box fr-qr-empty' }, state && state.lanError ? state.lanError : translate('qr.wait')),
        h('div', { className: 'fr-qr-hint' }, wifiGlyph, h('span', null, translate('network.hint'))),
        state && !state.url ? h('p', { className: 'fr-hint fr-warn' }, (state && state.lanError) || translate('qr.noNetwork')) : null,
        h(
          'div',
          { className: 'fr-actions', style: { marginTop: '12px' } },
          h('button', { type: 'button', className: 'fr-btn fr-btn-primary', onClick: copyLink, disabled: !state || !state.url }, translate('common.copy')),
          h('button', { type: 'button', className: 'fr-btn', onClick: rotateToken, disabled: busy || !state || !state.url }, translate('qr.reset')),
        ),
        h(
          'p',
          { className: 'fr-last' },
          state && state.lastUpload
            ? translate('qr.last').replace('{name}', state.lastUpload.name).replace('{size}', formatSize(state.lastUpload.size))
            : translate('qr.never'),
        ),
      )

      const diagnosticsBlock = h(
        'details',
        { className: 'fr-diag' },
        h('summary', null, translate('diag.title')),
        h(
          'ul',
          null,
          state && state.pageViews > 1 ? h('li', { key: 'views' }, translate('diag.pageViews').replace('{n}', String(state.pageViews))) : null,
          state && Array.isArray(state.diagnostics) && state.diagnostics.length > 0
            ? state.diagnostics
                .slice(-8)
                .reverse()
                .map((event, index) =>
                  h('li', { key: `${event && event.at}-${index}` }, `${formatTime(event && event.at)} · ${formatDiagnostic(event, translate)}`),
                )
            : h('li', { key: 'none' }, translate('diag.none')),
        ),
      )

      const networkCard = h(
        'section',
        { className: 'fr-card fr-network' },
        h('div', { className: 'fr-card-head' }, h('h2', null, translate('network.cardTitle'))),
        h(
          'label',
          { className: 'fr-field' },
          h('span', null, translate('network.label')),
          h(
            'select',
            { value: state ? state.preferredIp || '' : '', onChange: (event) => chooseAddress(event.target.value), disabled: busy || addresses.length === 0 },
            addresses.map((item) => h('option', { key: item.address, value: item.address }, `${item.name} · ${item.address}`)),
            addresses.length === 0 ? h('option', { value: '' }, '—') : null,
          ),
        ),
        diagnosticsBlock,
        state && state.pickerAborted && Date.now() - state.pickerAborted.abortedAt < 10 * 60 * 1000
          ? h('p', { className: 'fr-hint fr-warn', style: { margin: '8px 0 0' } }, translate('diag.aborted'))
          : null,
      )

      const folderGlyph = h(
        'svg',
        {
          width: 17,
          height: 17,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M3.5 6.8a1.7 1.7 0 0 1 1.7-1.7h4l1.8 2.2h7.8a1.7 1.7 0 0 1 1.7 1.7v8.2a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z' }),
      )

      const settingsCard = h(
        'button',
        {
          type: 'button',
          className: 'fr-save-row',
          onClick: changeSaveDir,
          disabled: busy,
          title: state ? state.saveDir : '',
        },
        h('span', { className: 'fr-save-icon' }, folderGlyph),
        h('span', { className: 'fr-save-label' }, translate('settings.title')),
        h('span', { className: 'fr-save-path-text' }, state ? state.saveDirLabel : ''),
        h('span', { className: 'fr-save-chevron' }, '›'),
      )

      const parentPath = currentPath ? currentPath.split('/').slice(0, -1).join('/') : ''
      const filesCard = h(
        'section',
        { className: 'fr-card fr-card-files' },
        h(
          'div',
          { className: 'fr-card-head' },
          h('h2', null, translate('files.title')),
          h(
            'div',
            { className: 'fr-actions' },
            currentPath
              ? h('button', { type: 'button', className: 'fr-btn', onClick: () => navigateTo(parentPath), disabled: busy }, '↑ ' + translate('files.up'))
              : null,
            h('button', { type: 'button', className: 'fr-btn', onClick: createFolder, disabled: busy }, translate('files.newFolder')),
            h('button', { type: 'button', className: 'fr-btn', onClick: openCurrentDir, disabled: busy }, translate('files.openFolder')),
            h('button', { type: 'button', className: 'fr-btn', onClick: () => refresh(pathRef.current), disabled: busy }, translate('common.refresh')),
          ),
        ),
        h(
          'div',
          { className: 'fr-list-toolbar' },
          h(
            'label',
            { className: 'fr-search' },
            h(
              'svg',
              { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
              h('circle', { cx: 11, cy: 11, r: 6.5 }),
              h('path', { d: 'M16 16l4.5 4.5' }),
            ),
            h('input', {
              value: search,
              onChange: (event) => setSearch(event.target.value),
              placeholder: translate('files.search'),
              'aria-label': translate('files.search'),
              spellCheck: false,
            }),
          ),
          h(
            'select',
            { className: 'fr-sort', value: sort, onChange: (event) => setSort(event.target.value), 'aria-label': translate('files.sort'), title: translate('files.sort') },
            h('option', { value: 'time-desc' }, translate('files.sortTimeDesc')),
            h('option', { value: 'time-asc' }, translate('files.sortTimeAsc')),
            h('option', { value: 'name-asc' }, translate('files.sortNameAsc')),
            h('option', { value: 'name-desc' }, translate('files.sortNameDesc')),
            h('option', { value: 'size-desc' }, translate('files.sortSizeDesc')),
            h('option', { value: 'size-asc' }, translate('files.sortSizeAsc')),
            h('option', { value: 'type-asc' }, translate('files.sortType')),
          ),
        ),
        selectedCount > 0
          ? h(
              'div',
              { className: 'fr-selection-bar' },
              h('span', null, translate('files.selectedCount').replace('{n}', String(selectedCount))),
              h('button', { type: 'button', className: 'fr-link', onClick: () => setSelectedPaths([]) }, translate('files.clearSelection')),
              h('button', { type: 'button', className: 'fr-btn fr-btn-danger', onClick: deleteSelected, disabled: busy }, translate('files.batchDelete')),
            )
          : null,
        h(
          'div',
          { className: 'fr-table-head' },
          h('input', {
            ref: selectAllRef,
            type: 'checkbox',
            className: 'fr-check',
            checked: allVisibleSelected,
            onChange: () => toggleSelectAll(allVisibleItems),
            disabled: allVisibleItems.length === 0,
            'aria-label': translate('files.selectAll'),
            title: translate('files.selectAll'),
          }),
          h('span'),
          h('span', null, translate('files.colName')),
          h('span', { className: 'fr-col-size' }, translate('files.colSize')),
          h('span', { className: 'fr-col-time' }, translate('files.colTime')),
          h('span'),
        ),
        h(
          'div',
          { className: 'fr-list', ref: listRef, onScroll: (event) => setScrollTop(event.currentTarget.scrollTop) },
          visibleTotal === 0
            ? h(
                'div',
                { className: 'fr-empty' },
                h('span', { className: 'fr-empty-icon', 'aria-hidden': true }, searchNeedle ? '🔍' : '📥'),
                h('strong', null, searchNeedle ? translate('files.noMatch') : translate('files.emptyTitle')),
                h('span', null, searchNeedle ? translate('files.noMatchHint') : translate('files.emptyHint')),
                searchNeedle ? h('button', { type: 'button', className: 'fr-btn', onClick: () => setSearch('') }, translate('files.clearSearch')) : null,
              )
            : [
                paddingTop > 0 ? h('div', { key: 'pad-top', style: { height: paddingTop } }) : null,
                ...renderedRows.map(renderListRow),
                paddingBottom > 0 ? h('div', { key: 'pad-bottom', style: { height: paddingBottom } }) : null,
              ],
        ),
        h(
          'div',
          { className: 'fr-foot' },
          h('span', { className: 'fr-count' }, translate('files.count').replace('{dirs}', String(visibleDirs.length)).replace('{files}', String(visibleFiles.length))),
        ),
      )

      return h(
        'div',
        { className: 'fr-root' },
        h(
          'header',
          { className: 'fr-head' },
          h(
            'div',
            { className: 'fr-head-text' },
            h('h1', null, translate('panel.title')),
            h('p', null, translate('page.subtitle')),
          ),
          h(
            'div',
            { className: 'fr-head-actions' },
            h('span', { className: 'fr-status fr-status-' + status }, statusText),
            h('button', { type: 'button', className: 'fr-btn', onClick: () => refresh(pathRef.current), disabled: busy }, translate('common.refresh')),
          ),
        ),
        error ? h('div', { className: 'fr-banner fr-banner-error' }, error) : null,
        notice ? h('div', { className: 'fr-banner fr-banner-ok' }, notice) : null,
        !state && !error ? h('div', { className: 'fr-empty' }, translate('common.loading')) : null,
        state
          ? h(
              'div',
              { className: 'fr-grid' },
              h(
                'div',
                { className: 'fr-side' },
                qrCard,
                settingsCard,
                h(
                  'section',
                  { className: 'fr-card fr-tips' },
                  h('h2', null, translate('tips.title')),
                  h(
                    'ul',
                    null,
                    h('li', null, translate('tips.sameWifi')),
                    h('li', null, translate('tips.wechat')),
                    h('li', null, translate('tips.firewall')),
                    h('li', null, translate('tips.foreground')),
                    h('li', null, translate('tips.token')),
                  ),
                ),
                networkCard,
              ),
              h('div', { className: 'fr-main' }, filesCard),
            )
          : null,
        rowMenu
          ? h(
              'div',
              { className: 'fr-menu-overlay', onMouseDown: () => setRowMenu(null) },
              h(
                'div',
                {
                  className: 'fr-row-menu',
                  role: 'menu',
                  style: { left: rowMenu.left, top: rowMenu.top },
                  onMouseDown: (event) => event.stopPropagation(),
                },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fr-menu-item',
                    role: 'menuitem',
                    disabled: busy,
                    onClick: () => {
                      const item = rowMenu.item
                      setRowMenu(null)
                      revealItem(item)
                    },
                  },
                  translate('files.reveal'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fr-menu-item',
                    role: 'menuitem',
                    disabled: busy,
                    onClick: () => {
                      const item = rowMenu.item
                      setRowMenu(null)
                      renameItem(item)
                    },
                  },
                  translate('common.rename'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fr-menu-item fr-menu-item-danger',
                    role: 'menuitem',
                    disabled: busy,
                    onClick: () => {
                      const item = rowMenu.item
                      setRowMenu(null)
                      removeItem(item)
                    },
                  },
                  translate('common.delete'),
                ),
              ),
            )
          : null,
        dialog ? h(Dialog, { dialog, translate, onCancel: closeDialog, onSubmit: submitDialog }) : null,
      )
    }

    function injectStyles(ctx) {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-shuttle-css]')) return
      const style = document.createElement('style')
      style.dataset.filesRemoteCss = ''
      style.textContent = CSS
      document.head.appendChild(style)
      ctx.effect(() => () => style.remove())
    }

    function apply(ctx) {
      panelCtx = ctx
      injectStyles(ctx)
      const t = (key) => {
        try {
          return ctx.locale.bind(NS)(key)
        } catch {
          return key
        }
      }
      ctx.effect(() => {
        if (typeof ctx.locale?.register !== 'function') return () => {}
        return ctx.locale.register(NS, { zh, en })
      })
      ctx.effect(() =>
        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_KEY,
              locale: NS,
              inject: () => ({ t }),
            },
            Page,
          ),
        ),
      )
      ctx.effect(() =>
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_KEY,
              order: 30,
              locale: NS,
              label: () => {
                try {
                  return ctx.locale.bind(NS)('panel.title')
                } catch {
                  return 'Shuttle'
                }
              },
            },
            Icon,
          ),
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
