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
      'files.countFiles': '{files} 个接收文件',
      'files.search': '搜索文件名…',
      'files.viewSort': '视图与排序',
      'files.searchTypeHeading': '按类型查找',
      'files.searchFolderHeading': '按目录查找',
      'files.searchTimeHeading': '按时间查找',
      'files.searchResults': '搜索到结果（{n} 项）',
      'files.searchHint': '输入文件名，或选择类型、目录、时间开始搜索',
      'files.scopeCurrent': '当前目录：{path}',
      'files.scopeAll': '全部保存位置',
      'files.searchLoading': '正在搜索…',
      'files.searchError': '搜索失败：{message}',
      'files.viewMode': '显示方式',
      'files.viewGrid': '宫格',
      'files.viewList': '列表',
      'files.sortMode': '排序方式',
      'files.sortDate': '文件日期',
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
      'files.back': '返回接收列表',
      'files.colSource': '来源',
      'files.browseTitle': '浏览',
      'files.recentTitle': '最近',
      'files.clearFilter': '清除筛选',
      'files.filterFolder': '保存位置',
      'files.allFolders': '全部位置',
      'files.typeAll': '全部类型',
      'files.typeImage': '图片',
      'files.typeVideo': '视频',
      'files.typeAudio': '音频',
      'files.typeDocument': '文档',
      'files.typeSheet': '表格',
      'files.typePresentation': '演示文稿',
      'files.typeArchive': '压缩包',
      'files.typePackage': '安装包',
      'files.typeFolder': '文件夹',
      'files.typeCode': '代码',
      'files.typeOther': '其他',
      'files.timeAll': '全部时间',
      'files.timeToday': '今天',
      'files.time7d': '近 7 天',
      'files.time30d': '近 30 天',
      'files.hasNew': '有新文件',
      'files.folderAreaActions': '文件夹区域操作',
      'files.copyPath': '复制路径',
      'files.pathCopied': '路径已复制',
      'files.switchDir': '切换目录',
      'files.rootDir': '根目录',
      'files.filter': '搜索与筛选',
      'files.moreActions': '更多操作',
      'files.groupCount': '{label} | {n} 项',
      'files.childCount': '{n} 项',
      'files.newBadge': '新',
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
      'files.countFiles': '{files} received files',
      'files.search': 'Search file name…',
      'files.viewSort': 'View and sort',
      'files.searchTypeHeading': 'Search by type',
      'files.searchFolderHeading': 'Search by folder',
      'files.searchTimeHeading': 'Search by time',
      'files.searchResults': 'Search results ({n})',
      'files.searchHint': 'Type a file name, or choose a type, folder, or time to start',
      'files.scopeCurrent': 'Current folder: {path}',
      'files.scopeAll': 'All saved files',
      'files.searchLoading': 'Searching…',
      'files.searchError': 'Search failed: {message}',
      'files.viewMode': 'View',
      'files.viewGrid': 'Grid',
      'files.viewList': 'List',
      'files.sortMode': 'Sort',
      'files.sortDate': 'File date',
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
      'files.back': 'Back to received list',
      'files.colSource': 'From',
      'files.browseTitle': 'Browse',
      'files.recentTitle': 'Recent',
      'files.clearFilter': 'Clear filter',
      'files.filterFolder': 'Save location',
      'files.allFolders': 'All locations',
      'files.typeAll': 'All types',
      'files.typeImage': 'Images',
      'files.typeVideo': 'Videos',
      'files.typeAudio': 'Audio',
      'files.typeDocument': 'Documents',
      'files.typeSheet': 'Spreadsheets',
      'files.typePresentation': 'Presentations',
      'files.typeArchive': 'Archives',
      'files.typePackage': 'Packages',
      'files.typeFolder': 'Folders',
      'files.typeCode': 'Code',
      'files.typeOther': 'Other',
      'files.timeAll': 'All time',
      'files.timeToday': 'Today',
      'files.time7d': 'Last 7 days',
      'files.time30d': 'Last 30 days',
      'files.hasNew': 'New files',
      'files.folderAreaActions': 'Folder area actions',
      'files.copyPath': 'Copy path',
      'files.pathCopied': 'Path copied',
      'files.switchDir': 'Switch folder',
      'files.rootDir': 'Root',
      'files.filter': 'Search and filters',
      'files.moreActions': 'More actions',
      'files.groupCount': '{label} | {n} items',
      'files.childCount': '{n} items',
      'files.newBadge': 'NEW',
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
.fr-folders-wrap { flex: none; margin-bottom: 8px; }
.fr-folders-head { display: flex; justify-content: flex-end; margin-bottom: 4px; }
.fr-folder-area-more { width: 28px; height: 24px; border: none; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 17px; line-height: 1; cursor: pointer; font-family: inherit; }
.fr-folder-area-more:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-folders { display: flex; gap: 10px; overflow-x: auto; padding: 2px 2px 7px; scroll-snap-type: x proximity; scrollbar-width: thin; }
.fr-folder-card { position: relative; flex: 0 0 180px; width: 180px; display: flex; align-items: center; gap: 10px; min-width: 0; padding: 10px 12px; text-align: left; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: inherit; cursor: pointer; scroll-snap-align: start; }
.fr-folder-more { flex: none; width: 22px; height: 22px; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 15px; line-height: 1; cursor: pointer; }
.fr-folder-more:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-folder-card:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.fr-folder-icon { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(59, 130, 246, .12); }
.fr-folder-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.fr-folder-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-folder-time { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }
.fr-folder-dot { flex: none; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-border-l2); }
.fr-folder-dot.is-new { background: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 2px rgba(59, 130, 246, .14); }
.fr-folder-add { border-style: dashed; background: transparent; color: var(--dsw-alias-label-secondary); }
.fr-folder-add:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.fr-folder-add-icon { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(59, 130, 246, .10); font-size: 22px; line-height: 1; }
.fr-folder-add-label { font-size: 12px; font-weight: 600; }
.fr-card-title { display: flex; align-items: center; gap: 8px; min-width: 0; }
.fr-card-title h2 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-back { appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; font-size: 16px; line-height: 1; cursor: pointer; font-family: inherit; }
.fr-back:hover { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-border-l2); }
.fr-card { background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; padding: 18px; min-width: 0; }
.fr-save-path { display: flex; align-items: center; gap: 10px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
.fr-save-icon { flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: rgba(37, 99, 235, .12); color: var(--dsw-alias-brand-primary); }
.fr-save-path-text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; color: var(--dsw-alias-label-primary); }
.fr-btn-block { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 12px; font-size: 13px; border-radius: 9px; }
.fr-btn-icon { display: inline-flex; align-items: center; }
.fr-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.fr-card h2 { margin: 0; font-size: 14px; font-weight: 650; letter-spacing: .01em; }
.fr-qr-box { display: flex; justify-content: center; padding: 10px; margin-bottom: 10px; border-radius: 12px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); }
.fr-qr { width: 100%; max-width: 200px; height: auto; display: block; border-radius: 10px; background: #fff; }

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
.fr-qr-actions { justify-content: center; }
.fr-last { margin: 12px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); word-break: break-all; }
.fr-diag { margin: 10px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.fr-diag summary { cursor: pointer; }
.fr-diag ul { margin: 6px 0 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow: auto; }
.fr-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; margin-bottom: 10px; font-size: 12.5px; }
.fr-crumb { appearance: none; border: none; background: none; color: var(--dsw-alias-label-secondary); padding: 2px 5px; border-radius: 6px; cursor: pointer; font-size: 12.5px; font-family: inherit; }
.fr-crumb:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-crumb-sep { color: var(--dsw-alias-border-l2); padding: 0 1px; }
.fr-list { border-top: 1px solid var(--dsw-alias-border-l1); flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; position: relative; }
.fr-table-head { display: grid; grid-template-columns: 26px 34px minmax(0, 1fr) 84px 72px 102px 30px; align-items: center; gap: 10px; padding: 7px 6px; border-top: 1px solid var(--dsw-alias-border-l1); border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 11px; color: var(--dsw-alias-label-secondary); flex: none; }
.fr-table-head span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-sort-head { appearance: none; border: none; background: none; padding: 0; margin: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-sort-head:hover { color: var(--dsw-alias-label-primary); }
.fr-row { display: grid; grid-template-columns: 26px 34px minmax(0, 1fr) 84px 72px 102px 30px; align-items: center; gap: 10px; padding: 8px 6px; height: 56px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.fr-row-file { cursor: pointer; }
.fr-row-browse { grid-template-columns: 26px 34px minmax(0, 1fr) 72px 102px 30px; }
.fr-row-browse .fr-row-source { display: none; }
.fr-table-head-browse { grid-template-columns: 26px 34px minmax(0, 1fr) 72px 102px 30px; }
.fr-table-head-browse .fr-col-source { display: none; }
.fr-row:hover { background: var(--dsw-alias-bg-layer-2); }
.fr-row-new { animation: frNewRow 3.6s ease-out; }
@keyframes frNewRow { 0% { background: rgba(37, 99, 235, .20); box-shadow: inset 3px 0 0 var(--dsw-alias-brand-primary); } 55% { background: rgba(37, 99, 235, .10); } 100% { background: transparent; box-shadow: none; } }
.fr-new-badge { flex: none; align-self: center; padding: 1px 4px; border-radius: 4px; background: var(--dsw-alias-brand-primary); color: #fff; font-size: 9px; line-height: 1.4; font-weight: 700; letter-spacing: .02em; }
.fr-row-busy { opacity: .55; }
.fr-row-icon { width: 32px; height: 32px; display: grid; place-items: center; color: var(--dsw-alias-label-secondary); }
.fr-row-icon svg { display: block; }
.fr-type-folder { color: #3b82f6; }
.fr-type-image { color: #14b8a6; }
.fr-type-video { color: #8b5cf6; }
.fr-type-audio { color: #ec4899; }
.fr-type-archive { color: #f59e0b; }
.fr-type-sheet { color: #22c55e; }
.fr-type-presentation { color: #f97316; }
.fr-type-code { color: #64748b; }
.fr-type-document, .fr-type-file { color: #60a5fa; }
.fr-check { width: 15px; height: 15px; margin: 0; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
.fr-thumb { position: relative; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; background: var(--dsw-alias-bg-base); display: block; }
.fr-thumb img { position: relative; z-index: 1; width: 100%; height: 100%; object-fit: cover; display: block; }
.fr-thumb-fallback { position: absolute; inset: 0; display: grid; place-items: center; font-size: 14px; }
.fr-group { display: flex; align-items: center; gap: 8px; height: 32px; padding: 6px 6px 2px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-bg-layer-1); border-bottom: 1px solid var(--dsw-alias-border-l1); position: sticky; top: 0; z-index: 2; }
.fr-group b { font-weight: 600; color: var(--dsw-alias-label-primary); }
.fr-row-name { display: flex; align-items: flex-start; gap: 5px; min-width: 0; overflow: hidden; font-size: 13px; line-height: 1.35; }
.fr-row-name-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; overflow-wrap: anywhere; max-height: 2.7em; }
.fr-row-ext { flex: none; margin-top: 1px; padding: 0 4px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 9.5px; line-height: 1.45; text-transform: uppercase; }
.fr-row-link { appearance: none; border: none; background: none; text-align: left; padding: 0; color: var(--dsw-alias-brand-primary); cursor: pointer; font-size: 13px; font-family: inherit; }
.fr-row-link:hover { text-decoration: underline; }
.fr-row-meta, .fr-row-time, .fr-row-source { font-size: 11.5px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-row-source { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 10.5px; }
.fr-row-actions { display: flex; gap: 8px; justify-content: flex-end; position: relative; }
.fr-more { appearance: none; border: none; background: none; color: var(--dsw-alias-label-secondary); font-size: 17px; line-height: 1; padding: 2px 4px; border-radius: 6px; cursor: pointer; font-family: inherit; }
.fr-more:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-more:disabled { opacity: .5; cursor: default; }
.fr-list-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.fr-search { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary); }
.fr-search svg { flex: none; }
.fr-search input { flex: 1; min-width: 0; appearance: none; border: none; outline: none; background: none; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 12.5px; padding: 0; }
.fr-sort { flex: none; max-width: 130px; appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary); border-radius: 8px; padding: 6px 8px; font-size: 12px; font-family: inherit; }
.fr-filter { flex: 1 1 110px; max-width: 150px; }
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
.fr-tips li strong { font-weight: 650; color: var(--dsw-alias-label-primary); }
.fr-banner { max-width: 1120px; margin: 0 auto 12px; padding: 9px 12px; border-radius: 9px; font-size: 12.5px; background: var(--dsw-alias-bg-layer-1); }
.fr-banner-error { color: var(--dsw-alias-state-error-primary); border: 1px solid var(--dsw-alias-state-error-primary); }
.fr-banner-ok { color: var(--dsw-alias-state-success-primary); border: 1px solid var(--dsw-alias-state-success-primary); }
.fr-toast { position: fixed; top: 18px; right: 24px; z-index: 90; max-width: 360px; margin: 0; padding: 10px 14px;
  background: var(--dsw-alias-bg-overlay); border: 1px solid var(--dsw-alias-state-success-primary); color: var(--dsw-alias-label-primary);
  border-radius: 10px; box-shadow: 0 10px 32px rgba(15, 23, 42, .20); font-size: 12.5px; pointer-events: none;
  animation: frToastIn .18s ease-out; }
@keyframes frToastIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 600px) { .fr-toast { left: 12px; right: 12px; top: 12px; max-width: none; } }
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
  .fr-row { grid-template-columns: 24px 34px minmax(0, 1fr) 30px; height: 56px; }
  .fr-table-head { display: none; }
  .fr-row-meta, .fr-row-time, .fr-row-source { display: none; }
}
.fr-library-card { display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1); border-radius: 18px; overflow: hidden; }
.fr-library-tabs { display: none; }
.fr-library-nav { display: flex; align-items: stretch; gap: 8px; flex: none; padding: 8px 20px 10px; border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.fr-library-tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; appearance: none; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-family: inherit; font-size: 11.5px; font-weight: 600; padding: 6px 10px; border-radius: 12px; cursor: pointer; }
.fr-library-tab:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-library-tab.active { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-library-tab-icon { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; }
.fr-library-tab.active .fr-library-tab-icon { width: 26px; height: 26px; background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-1); }
.fr-library-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px 14px; }
.fr-library-title { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; overflow: hidden; }
.fr-library-title h2 { margin: 0; font-size: 30px; line-height: 1.08; font-weight: 720; letter-spacing: -.025em; color: var(--dsw-alias-label-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-library-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; flex: none; }
.fr-library-action-row { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; padding: 0 20px 12px; flex: none; }
.fr-breadcrumb { display: flex; align-items: center; gap: 1px; min-width: 0; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
.fr-breadcrumb::-webkit-scrollbar { display: none; }
.fr-crumb { flex: none; display: inline-flex; align-items: center; gap: 5px; max-width: 180px; padding: 4px 6px; border: none; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); font-family: inherit; font-size: 19px; font-weight: 600; line-height: 1.2; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-crumb:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-crumb.current { color: var(--dsw-alias-label-primary); font-weight: 700; cursor: default; }
.fr-crumb.current:hover { background: transparent; }
.fr-crumb-root { font-size: 18px; }
.fr-crumb-sep { flex: none; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-size: 19px; line-height: 1; }
.fr-dir-menu { position: fixed; z-index: 71; width: 240px; max-height: 360px; overflow-y: auto; padding: 5px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-overlay); box-shadow: 0 12px 36px rgba(15, 23, 42, .22); }
.fr-dir-menu-icon { flex: none; width: 20px; height: 20px; display: inline-grid; place-items: center; }
.fr-dir-menu-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-dir-menu .fr-menu-item { display: flex; align-items: center; gap: 8px; }
.fr-dir-menu .fr-menu-item.active { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-brand-primary); }
.fr-library-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 0 20px 14px; }
.fr-library-toolbar .fr-search { flex: 1 1 210px; }
.fr-library-select { flex: 0 1 130px; appearance: none; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary); border-radius: 9px; padding: 7px 9px; font-size: 12px; font-family: inherit; }
.fr-library-body { flex: 1; min-height: 0; overflow: auto; padding: 0 20px 16px; }
.fr-date-section { margin-bottom: 18px; }
.fr-date-head { display: flex; align-items: center; justify-content: space-between; width: 100%; border: none; background: transparent; color: var(--dsw-alias-label-secondary); padding: 7px 0 12px; font-family: inherit; cursor: pointer; }
.fr-date-label { font-size: 13.5px; font-weight: 600; }
.fr-date-chevron { font-size: 18px; line-height: 1; transition: transform .16s ease; }
.fr-date-chevron.collapsed { transform: rotate(-90deg); }
.fr-recent-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px 14px; }
.fr-recent-card { position: relative; min-width: 0; cursor: pointer; outline: none; }
.fr-recent-card:focus-visible .fr-recent-preview { box-shadow: 0 0 0 3px rgba(37, 99, 235, .25); }
.fr-recent-preview { width: 100%; aspect-ratio: 1 / 1; border-radius: 16px; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); display: grid; place-items: center; }
.fr-recent-media { position: relative; width: 100%; height: 100%; display: grid; place-items: center; color: var(--dsw-alias-label-secondary); }
.fr-recent-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.fr-media-fallback { position: absolute; inset: 0; display: grid; place-items: center; color: var(--dsw-alias-label-secondary); }
.fr-media-icon { color: #60a5fa; }
.fr-recent-more { position: absolute; top: 7px; right: 7px; width: 26px; height: 26px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-secondary); font-size: 16px; line-height: 1; cursor: pointer; opacity: 0; transition: opacity .14s ease; }
.fr-recent-card:hover .fr-recent-more, .fr-recent-more:focus-visible { opacity: 1; }
.fr-recent-name { margin-top: 9px; min-height: 36px; display: flex; align-items: flex-start; gap: 4px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; line-height: 1.35; overflow: hidden; }
.fr-recent-name > span { min-width: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fr-recent-size { margin-top: 3px; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.fr-recent-source { margin-top: 2px; font-size: 10.5px; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-recent-new .fr-recent-preview { animation: frPreviewNew 3.6s ease-out; }
@keyframes frPreviewNew { 0% { box-shadow: 0 0 0 3px rgba(37, 99, 235, .30); } 55% { box-shadow: 0 0 0 2px rgba(37, 99, 235, .12); } 100% { box-shadow: 0 0 0 0 transparent; } }
.fr-type-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
.fr-type-shortcut { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 12px 13px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 15px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-align: left; }
.fr-type-shortcut:hover { background: var(--dsw-alias-bg-layer-2); }
.fr-type-shortcut.active { border-color: var(--dsw-alias-brand-primary); background: rgba(37, 99, 235, .06); }
.fr-type-shortcut-icon { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; }
.fr-type-yellow { background: #fff2ce; color: #d99a00; }
.fr-type-purple { background: #ede9fe; color: #7c3aed; }
.fr-type-blue { background: #dbeafe; color: #2563eb; }
.fr-type-red { background: #ffe4e6; color: #e11d48; }
.fr-type-shortcut-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-browse-list { display: flex; flex-direction: column; }
.fr-browse-row { display: flex; align-items: center; gap: 14px; min-height: 76px; padding: 10px 2px; border-bottom: 1px solid var(--dsw-alias-border-l1); cursor: pointer; outline: none; }
.fr-browse-row:hover { background: var(--dsw-alias-bg-layer-2); }
.fr-browse-row:focus-visible { box-shadow: inset 0 0 0 2px rgba(37, 99, 235, .22); }
.fr-browse-icon { flex: none; width: 52px; height: 52px; border-radius: 13px; display: grid; place-items: center; overflow: hidden; color: var(--dsw-alias-label-secondary); }
.fr-browse-folder-icon { background: rgba(59, 130, 246, .10); }
.fr-browse-media { position: relative; width: 52px; height: 52px; display: grid; place-items: center; }
.fr-browse-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.fr-browse-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.fr-browse-name { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 600; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fr-browse-meta { display: flex; align-items: center; gap: 5px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; line-height: 1.3; }
.fr-file-type-tag { display: inline-flex; align-items: center; padding: 1px 4px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 9.5px; font-weight: 650; letter-spacing: .02em; }
.fr-browse-more { flex: none; width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 16px; line-height: 1; cursor: pointer; }
.fr-browse-more:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-browse-chevron { flex: none; color: var(--dsw-alias-label-secondary); font-size: 24px; line-height: 1; font-weight: 300; }
.fr-browse-new { animation: frBrowseNew 3.6s ease-out; }
@keyframes frBrowseNew { 0% { background: rgba(37, 99, 235, .16); } 55% { background: rgba(37, 99, 235, .07); } 100% { background: transparent; } }
.fr-library-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 230px; padding: 30px 16px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; text-align: center; }
.fr-library-empty strong { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 650; }
.fr-empty-glyph { width: 58px; height: 58px; border-radius: 16px; display: grid; place-items: center; background: var(--dsw-alias-bg-layer-2); color: #60a5fa; margin-bottom: 3px; }
.fr-library-foot { padding: 14px 0 2px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; text-align: right; }
@media (max-width: 900px) {
  .fr-library-title h2 { font-size: 24px; }
  .fr-type-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fr-recent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.fr-library-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: none; padding: 12px 20px 8px; }
.fr-library-topbar-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.fr-library-title-text { margin: 0; color: var(--dsw-alias-label-primary); font-size: 26px; font-weight: 720; letter-spacing: -.02em; line-height: 1.1; }
.fr-library-topbar-actions { display: flex; align-items: center; gap: 2px; flex: none; }
.fr-icon-btn { width: 34px; height: 34px; padding: 0; border: none; border-radius: 9px; background: transparent; color: var(--dsw-alias-label-secondary); display: grid; place-items: center; cursor: pointer; font-family: inherit; }
.fr-icon-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-icon-btn.active { background: rgba(37, 99, 235, .10); color: var(--dsw-alias-brand-primary); }
.fr-icon-btn:disabled { opacity: .4; cursor: default; }
.fr-breadcrumb-wrap { display: flex; align-items: center; gap: 4px; min-width: 0; flex: none; padding: 0 20px 10px; }
.fr-breadcrumb-scroll { display: flex; align-items: center; gap: 1px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.fr-breadcrumb-scroll::-webkit-scrollbar { display: none; }
.fr-crumb { flex: none; display: inline-flex; align-items: center; gap: 4px; max-width: 190px; padding: 4px 8px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); font-family: inherit; font-size: 12.5px; font-weight: 500; line-height: 1.3; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-crumb:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-crumb.current { color: var(--dsw-alias-brand-primary); background: rgba(37, 99, 235, .10); font-weight: 650; cursor: default; }
.fr-crumb.current:hover { background: rgba(37, 99, 235, .10); }
.fr-crumb-root { flex: none; max-width: 140px; padding: 4px 9px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); border-radius: 999px; font-weight: 600; }
.fr-crumb-label { overflow: hidden; text-overflow: ellipsis; }
.fr-crumb-sep { flex: none; color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-size: 13px; line-height: 1; }

.fr-search-card { flex: 1; min-height: 0; }
.fr-search-header { display: flex; align-items: center; gap: 10px; flex: none; padding: 14px 20px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.fr-search-large { flex: 1; min-width: 0; padding: 9px 13px; border: none; border-radius: 12px; background: var(--dsw-alias-bg-layer-2); }
.fr-search-large input { font-size: 14px; }
.fr-search-clear { flex: none; width: 26px; height: 26px; border: none; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 17px; line-height: 1; cursor: pointer; }
.fr-search-clear:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.fr-search-body { flex: 1; min-height: 0; overflow: auto; padding: 18px 20px 20px; }
.fr-search-scope { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.fr-search-heading { margin: 0 0 10px; color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }
.fr-search-heading:not(:first-child) { margin-top: 20px; }
.fr-search-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.fr-search-chip { appearance: none; border: none; border-radius: 10px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; padding: 7px 14px; cursor: pointer; }
.fr-search-chip:hover { background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-2)); }
.fr-search-chip.active { background: rgba(37, 99, 235, .12); color: var(--dsw-alias-brand-primary); font-weight: 600; }
.fr-search-results-head { margin: 22px 0 4px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.fr-search-hint { margin-top: 26px; color: var(--dsw-alias-label-secondary); font-size: 12.5px; line-height: 1.5; }
.fr-search-empty { min-height: 180px; }
.fr-view-menu { position: fixed; z-index: 72; width: 196px; padding: 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-overlay); box-shadow: 0 12px 36px rgba(15, 23, 42, .22); }
.fr-view-menu-label { padding: 8px 10px 5px; color: var(--dsw-alias-label-secondary); font-size: 11px; font-weight: 650; }
.fr-view-menu-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 10px; border: none; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.fr-view-menu-item:hover { background: var(--dsw-alias-bg-layer-2); }
.fr-view-menu-item.active { color: var(--dsw-alias-brand-primary); }
.fr-view-check { color: var(--dsw-alias-brand-primary); font-size: 13px; }
.fr-view-menu-sep { height: 1px; margin: 5px 0; background: var(--dsw-alias-border-l1); }
.fr-recent-list { display: flex; flex-direction: column; }
.fr-browse-source { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); font-size: 10.5px; }
.fr-browse-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px 14px; }
.fr-browse-grid-card { position: relative; min-width: 0; cursor: pointer; outline: none; }
.fr-browse-grid-icon, .fr-browse-grid-preview { width: 100%; aspect-ratio: 1 / 1; border-radius: 16px; overflow: hidden; display: grid; place-items: center; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); }
.fr-browse-grid-icon { color: #3b82f6; background: rgba(59, 130, 246, .10); }
.fr-browse-grid-media { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
.fr-browse-grid-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.fr-browse-grid-name { margin-top: 8px; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fr-browse-grid-meta { margin-top: 2px; color: var(--dsw-alias-label-secondary); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fr-browse-grid-more { position: absolute; top: 7px; right: 7px; width: 26px; height: 26px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-secondary); font-size: 16px; line-height: 1; cursor: pointer; opacity: 0; transition: opacity .14s ease; }
.fr-browse-grid-card:hover .fr-browse-grid-more, .fr-browse-grid-more:focus-visible { opacity: 1; }
@media (max-width: 900px) {
  .fr-browse-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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

    function fileBaseName(name) {
      const text = String(name || '')
      const extension = fileExtension(text)
      return extension ? text.slice(0, text.length - extension.length - 1) : text
    }

    function fileCategory(name, kind) {
      if (kind === 'directory') return 'folder'
      const extension = fileExtension(name)
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'heic'].includes(extension)) return 'image'
      if (['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'ts'].includes(extension)) return 'video'
      if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(extension)) return 'audio'
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) return 'archive'
      if (['apk', 'ipa', 'xapk', 'aab'].includes(extension)) return 'package'
      if (['xls', 'xlsx', 'csv', 'numbers'].includes(extension)) return 'sheet'
      if (['ppt', 'pptx', 'key'].includes(extension)) return 'presentation'
      if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'java', 'sh'].includes(extension)) return 'code'
      if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'pages'].includes(extension)) return 'document'
      return 'file'
    }

    function FileTypeIcon({ name, kind, size = 20 }) {
      const category = fileCategory(name, kind)
      const common = {
        className: 'fr-type-' + category,
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
      }
      if (category === 'folder') {
        return h('svg', common, h('path', { d: 'M3.5 6.8a1.7 1.7 0 0 1 1.7-1.7h4l1.8 2.2h7.8a1.7 1.7 0 0 1 1.7 1.7v8.2a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z' }))
      }
      if (category === 'image') {
        return h('svg', common,
          h('rect', { x: 3, y: 4.8, width: 18, height: 14.4, rx: 2.4 }),
          h('circle', { cx: 8.2, cy: 9.4, r: 1.3, fill: 'currentColor', stroke: 'none' }),
          h('path', { d: 'M4.4 16.7l4-4a1.7 1.7 0 0 1 2.4 0l3 3 1.8-1.8a1.7 1.7 0 0 1 2.4 0l2.2 2.2' }),
        )
      }
      if (category === 'video') {
        return h('svg', common,
          h('rect', { x: 3, y: 5, width: 18, height: 14, rx: 2.4 }),
          h('path', { d: 'M10.2 9.4l5 2.6-5 2.6z', fill: 'currentColor', stroke: 'none' }),
        )
      }
      if (category === 'audio') {
        return h('svg', common,
          h('path', { d: 'M9 17.2V6.4l9-1.8v10.8' }),
          h('circle', { cx: 6.6, cy: 17.6, r: 2.2 }),
          h('circle', { cx: 15.6, cy: 15.8, r: 2.2 }),
        )
      }
      if (category === 'archive') {
        return h('svg', common,
          h('rect', { x: 4, y: 3.6, width: 16, height: 16.8, rx: 2 }),
          h('path', { d: 'M12 3.6v3.2M12 9.4v2M12 14v2.2M12 18.6v1.8' }),
        )
      }
      if (category === 'sheet') {
        return h('svg', common,
          h('rect', { x: 3.2, y: 4.4, width: 17.6, height: 15.2, rx: 2.2 }),
          h('path', { d: 'M3.2 9.4h17.6M9.6 9.4v10.2M14.6 9.4v10.2' }),
        )
      }
      if (category === 'presentation') {
        return h('svg', common,
          h('rect', { x: 3, y: 4, width: 18, height: 12.4, rx: 2 }),
          h('path', { d: 'M12 16.4v3.4M8.4 21h7.2' }),
        )
      }
      if (category === 'code') {
        return h('svg', common,
          h('path', { d: 'M8.5 8.2l-4 3.8 4 3.8M15.5 8.2l4 3.8-4 3.8' }),
        )
      }
      return h('svg', common,
        h('path', { d: 'M6.4 3.6h6.9l4.9 4.9v11a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6V5.2a1.6 1.6 0 0 1 1.6-1.6z' }),
        h('path', { d: 'M13.3 3.6v5.2h5.2' }),
      )
    }

    function imageFile(name) {
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'heic'].includes(fileExtension(name))
    }

    function videoFile(name) {
      return ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm', 'ts'].includes(fileExtension(name))
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
      const [mode, setMode] = React.useState('home')
      const [folders, setFolders] = React.useState([])
      const [currentPath, setCurrentPath] = React.useState('')
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [dialog, setDialog] = React.useState(null)
      const [search, setSearch] = React.useState('')
      const [folderFilter, setFolderFilter] = React.useState('all')
      const [typeFilter, setTypeFilter] = React.useState('all')
      const [timeFilter, setTimeFilter] = React.useState('all')
      const [collapsedGroups, setCollapsedGroups] = React.useState({})
      const [rowBusy, setRowBusy] = React.useState('')
      const [freshPath, setFreshPath] = React.useState('')
      const [selectedPaths, setSelectedPaths] = React.useState([])
      const [scrollTop, setScrollTop] = React.useState(0)
      const [viewportHeight, setViewportHeight] = React.useState(420)
      const [sort, setSort] = React.useState(() => {
        const allowed = ['time-desc', 'time-asc', 'name-asc', 'name-desc', 'size-desc', 'size-asc', 'source-asc', 'source-desc', 'type-asc']
        try {
          const saved = localStorage.getItem('shuttle.listSort')
          return allowed.includes(saved) ? saved : 'time-desc'
        } catch {
          return 'time-desc'
        }
      })
      const [rowMenu, setRowMenu] = React.useState(null)
      const [folderAreaMenu, setFolderAreaMenu] = React.useState(null)
      const [dirSwitchMenu, setDirSwitchMenu] = React.useState(null)
      const [moreMenu, setMoreMenu] = React.useState(null)
      const [viewMenu, setViewMenu] = React.useState(null)
      const [searchOpen, setSearchOpen] = React.useState(false)
      const [searchScope, setSearchScope] = React.useState('current')
      const [searchRemote, setSearchRemote] = React.useState({ loading: false, error: '', dirs: [], files: [], truncated: false })
      const [recentViewMode, setRecentViewMode] = React.useState(() => {
        try { return localStorage.getItem('shuttle.recentView') === 'list' ? 'list' : 'grid' } catch { return 'grid' }
      })
      const [browseViewMode, setBrowseViewMode] = React.useState(() => {
        try { return localStorage.getItem('shuttle.browseView') === 'grid' ? 'grid' : 'list' } catch { return 'list' }
      })
      const [folderSeen, setFolderSeen] = React.useState(() => {
        try {
          const parsed = JSON.parse(localStorage.getItem('shuttle.folderSeen') || '{}')
          return parsed && typeof parsed === 'object' ? parsed : {}
        } catch {
          return {}
        }
      })

      const pathRef = React.useRef('')
      const modeRef = React.useRef('home')
      const breadcrumbScrollRef = React.useRef(null)
      const searchSeqRef = React.useRef(0)
      const lastBrowsePathRef = React.useRef((() => {
        try { return localStorage.getItem('shuttle.lastBrowsePath') || '' } catch { return '' }
      })())
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

      React.useEffect(() => {
        if (!folderAreaMenu) return undefined
        const close = () => setFolderAreaMenu(null)
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
      }, [folderAreaMenu])

      React.useEffect(() => {
        if (!dirSwitchMenu) return undefined
        const close = () => setDirSwitchMenu(null)
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
      }, [dirSwitchMenu])

      React.useEffect(() => {
        if (!moreMenu) return undefined
        const close = () => setMoreMenu(null)
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
      }, [moreMenu])

      React.useEffect(() => {
        if (!viewMenu) return undefined
        const close = () => setViewMenu(null)
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
      }, [viewMenu])

      React.useEffect(() => {
        const node = breadcrumbScrollRef.current
        if (node) node.scrollLeft = node.scrollWidth
      }, [currentPath])

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

      const loadFolders = async () => {
        const data = await request('/folders')
        setFolders(Array.isArray(data.folders) ? data.folders : [])
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
        if (modeRef.current === 'browse') {
          lastBrowsePathRef.current = resolved
          try { localStorage.setItem('shuttle.lastBrowsePath', resolved) } catch { /* 忽略 */ }
        }
        return data
      }

      // 同时刷新状态与当前视图；桌面端列表靠它自动更新。
      const refresh = React.useCallback(async (target) => {
        try {
          const next = await loadState()
          if (modeRef.current === 'browse') {
            await loadListing(typeof target === 'string' ? target : pathRef.current)
          } else {
            await loadFolders()
          }
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

      const folderSeenKey = (target) => `${state && state.saveDir ? state.saveDir : ''}:${typeof target === 'string' ? target : ''}`

      const markFolderSeen = (target) => {
        const key = folderSeenKey(target)
        const now = Date.now()
        setFolderSeen((previous) => {
          const next = { ...previous, [key]: now }
          try {
            localStorage.setItem('shuttle.folderSeen', JSON.stringify(next))
          } catch {
            // localStorage 不可用时只保留当前会话。
          }
          return next
        })
      }

      const navigateTo = (target) => {
        setSearchOpen(false)
        modeRef.current = 'browse'
        setMode('browse')
        setListing(null)
        setSearch('')
        setSelectedPaths([])
        pathRef.current = target
        setCurrentPath(target)
        markFolderSeen(target)
        act(async () => {
          await loadListing(target)
        })
      }

      const enterBrowseDefault = () => {
        const target = lastBrowsePathRef.current || ''
        modeRef.current = 'browse'
        setMode('browse')
        setListing(null)
        setSearch('')
        setSelectedPaths([])
        pathRef.current = target
        setCurrentPath(target)
        markFolderSeen(target)
        act(async () => {
          try {
            await loadListing(target)
          } catch {
            lastBrowsePathRef.current = ''
            try { localStorage.removeItem('shuttle.lastBrowsePath') } catch { /* 忽略 */ }
            await loadListing('')
          }
          await loadFolders().catch(() => {})
        })
      }

      const backToHome = () => {
        modeRef.current = 'home'
        setMode('home')
        setListing(null)
        pathRef.current = ''
        setCurrentPath('')
        setSearch('')
        setSelectedPaths([])
        act(async () => {
          await refresh('')
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
              const target = modeRef.current === 'browse' ? pathRef.current : ''
              await request('/mkdir', postJson({ path: target, name }))
              if (modeRef.current === 'browse') await loadListing(target)
              else await loadFolders()
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
              if (modeRef.current === 'browse') await loadListing(pathRef.current)
              else await refresh('')
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
              if (modeRef.current === 'browse') await loadListing(pathRef.current)
              else await refresh('')
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
              if (modeRef.current === 'browse') await loadListing(pathRef.current)
              else await refresh('')
            })
          },
        )
      }

      const revealItem = (item) => {
        runRowAction(item, async () => {
          await request('/open', postJson({ path: item.path, reveal: true }))
        })
      }

      const openItem = (item) => {
        runRowAction(item, async () => {
          await request('/open', postJson({ path: item.path }))
        })
      }

      const copyItemPath = (item) => {
        const base = state && state.saveDir ? String(state.saveDir) : ''
        const separator = base.includes('\\') ? '\\' : '/'
        const relative = String(item && item.path ? item.path : '').replace(/[\\/]+/g, separator)
        const absolute = base ? base.replace(/[\\/]+$/, '') + (relative ? separator + relative : '') : relative
        const done = () => flash(translate('files.pathCopied'))
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(absolute).then(done, () => fallbackCopy(absolute, done))
          return
        }
        fallbackCopy(absolute, done)
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
          modeRef.current = 'home'
          setMode('home')
          setListing(null)
          pathRef.current = ''
          setCurrentPath('')
          setFolderFilter('all')
          setFolderSeen({})
          lastBrowsePathRef.current = ''
          try {
            localStorage.removeItem('shuttle.folderSeen')
            localStorage.removeItem('shuttle.lastBrowsePath')
          } catch { /* 忽略 */ }
          await loadFolders()
          flash(translate('settings.updated'))
        })
      }

      const status = state ? (state.lanError ? 'degraded' : state.url ? 'ready' : 'degraded') : 'loading'
      const statusText =
        status === 'ready' ? translate('status.ready') : status === 'loading' ? translate('status.loading') : translate('status.degraded')

      const addresses = state && Array.isArray(state.addresses) ? state.addresses : []
      const isHome = mode === 'home'
      const receivedItems = isHome && state && Array.isArray(state.received)
        ? state.received.map((record, index) => ({
            ...record,
            key: `${record.path || record.name}-${record.at || index}`,
            kind: 'file',
            mtime: record.at,
            receivedAt: record.at,
            sourceDir: record.dir || (state.defaultFolder || '默认'),
          }))
        : []
      const dirs = isHome ? [] : (listing && Array.isArray(listing.dirs) ? listing.dirs : [])
      const files = isHome ? receivedItems : (listing && Array.isArray(listing.files) ? listing.files : [])

      const searchNeedle = search.trim().toLowerCase()
      const matchesSearch = (item) => !searchNeedle || String(item.name || '').toLowerCase().includes(searchNeedle)

      React.useEffect(() => {
        const hasQuery = Boolean(search.trim()) || typeFilter !== 'all' || timeFilter !== 'all'
        if (!searchOpen || isHome || !hasQuery) {
          searchSeqRef.current += 1
          setSearchRemote({ loading: false, error: '', dirs: [], files: [], truncated: false })
          return undefined
        }
        const seq = ++searchSeqRef.current
        const root = searchScope === 'all' ? '' : pathRef.current
        setSearchRemote((previous) => ({ ...previous, loading: true, error: '' }))
        request('/search?path=' + encodeURIComponent(root) + '&q=' + encodeURIComponent(search))
          .then((data) => {
            if (seq !== searchSeqRef.current) return
            setSearchRemote({
              loading: false,
              error: '',
              dirs: Array.isArray(data.dirs) ? data.dirs : [],
              files: Array.isArray(data.files) ? data.files : [],
              truncated: Boolean(data.truncated),
            })
          })
          .catch((error) => {
            if (seq !== searchSeqRef.current) return
            setSearchRemote({ loading: false, error: error.message, dirs: [], files: [], truncated: false })
          })
        return () => { /* sequence guard handles stale responses */ }
      }, [searchOpen, isHome, searchScope, currentPath, search])

      const folderFilterOptions = Array.from(new Set(receivedItems.map((item) => item.sourceDir).filter(Boolean))).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
      const matchesFolderFilter = (item) => folderFilter === 'all' || !item.sourceDir || item.sourceDir === folderFilter || item.sourceDir.startsWith(folderFilter + '/')
      const typeFilterOptions = [
        ['all', 'files.typeAll'],
        ['image', 'files.typeImage'],
        ['video', 'files.typeVideo'],
        ['audio', 'files.typeAudio'],
        ['document', 'files.typeDocument'],
        ['sheet', 'files.typeSheet'],
        ['presentation', 'files.typePresentation'],
        ['archive', 'files.typeArchive'],
        ['package', 'files.typePackage'],
        ['code', 'files.typeCode'],
        ['folder', 'files.typeFolder'],
        ['file', 'files.typeOther'],
      ]
      const matchesTypeFilter = (item) => {
        if (typeFilter === 'all') return true
        const category = fileCategory(item.name, item.kind)
        if (typeFilter === 'document') return ['document', 'sheet', 'presentation'].includes(category)
        return category === typeFilter
      }
      const matchesTimeFilter = (item) => {
        if (timeFilter === 'all') return true
        const value = Number(item.mtime)
        if (!Number.isFinite(value) || value <= 0) return false
        const now = new Date()
        const date = new Date(value)
        if (timeFilter === 'today') {
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
        }
        const age = Date.now() - value
        if (timeFilter === '7d') return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000
        if (timeFilter === '30d') return age >= 0 && age <= 30 * 24 * 60 * 60 * 1000
        return true
      }
      const sortParts = String(sort || 'time-desc').split('-')
      const sortKey = sortParts[0] || 'time'
      const sortAscending = sortParts[1] === 'asc'
      const sortMark = (key) => (sortKey === key ? (sortAscending ? ' ↑' : ' ↓') : '')
      const changeSort = (key) => {
        const currentKey = sortKey
        const currentAscending = sortAscending
        if (currentKey === key) setSort(`${key}-${currentAscending ? 'desc' : 'asc'}`)
        else setSort(`${key}-${key === 'time' ? 'desc' : 'asc'}`)
      }
      const compareEntries = (left, right) => {
        let result = 0
        if (sortKey === 'name') {
          result = String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
        } else if (sortKey === 'size') {
          result = Number(left.size || 0) - Number(right.size || 0)
        } else if (sortKey === 'type') {
          result = fileExtension(left.name).localeCompare(fileExtension(right.name)) || String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
        } else if (sortKey === 'source') {
          result = String(left.sourceDir || '').localeCompare(String(right.sourceDir || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' })
        } else {
          result = Number(left.mtime || 0) - Number(right.mtime || 0)
        }
        return sortAscending ? result : -result
      }
      const visibleDirs = dirs.filter((item) => matchesSearch(item) && matchesTypeFilter(item)).slice().sort((left, right) =>
        String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' }),
      )
      const visibleFiles = files.filter((item) => matchesSearch(item) && matchesFolderFilter(item) && matchesTypeFilter(item) && matchesTimeFilter(item)).slice().sort(compareEntries)
      const visibleTotal = visibleDirs.length + visibleFiles.length
      const recentGroups = []
      const recentGroupMap = new Map()
      for (const item of visibleFiles) {
        const label = formatGroupLabel(item.mtime, translate)
        let group = recentGroupMap.get(label)
        if (!group) {
          group = { key: label, label, items: [] }
          recentGroupMap.set(label, group)
          recentGroups.push(group)
        }
        group.items.push(item)
      }
      const toggleRecentGroup = (key) => {
        setCollapsedGroups((previous) => ({ ...previous, [key]: !previous[key] }))
      }

      React.useEffect(() => {
        const available = new Set(dirs.concat(files).map((item) => item.path))
        setSelectedPaths((previous) => {
          const next = previous.filter((path) => available.has(path))
          return next.length === previous.length ? previous : next
        })
      }, [listing, state])

      React.useEffect(() => {
        setScrollTop(0)
        if (listRef.current) listRef.current.scrollTop = 0
      }, [currentPath, search, sort, typeFilter, timeFilter, folderFilter])

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
        const height = 156
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
        const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
        setRowMenu({ item, left, top })
      }

      const openFolderAreaMenu = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = 168
        const height = 86
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
        const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
        setFolderAreaMenu({ left, top })
      }

      const openDirSwitchMenu = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = 240
        const height = Math.min(360, 46 + (folders.length + 1) * 36)
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
        const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
        setDirSwitchMenu({ left, top })
      }

      const selectSwitchDir = (target) => {
        setDirSwitchMenu(null)
        navigateTo(target)
      }

      const openMoreMenu = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = 168
        const height = isHome ? 112 : 152
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
        const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
        setMoreMenu({ left, top })
      }

      const openDirSwitchFromMore = () => {
        const anchor = moreMenu
        setMoreMenu(null)
        setDirSwitchMenu(anchor || null)
      }

      const openViewMenu = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = 196
        const height = isHome ? 282 : 250
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
        const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4
        setViewMenu({ left, top })
      }

      const setViewMode = (mode) => {
        if (isHome) {
          setRecentViewMode(mode)
          try { localStorage.setItem('shuttle.recentView', mode) } catch { /* 忽略 */ }
        } else {
          setBrowseViewMode(mode)
          try { localStorage.setItem('shuttle.browseView', mode) } catch { /* 忽略 */ }
        }
        setViewMenu(null)
      }

      const openSearch = () => {
        setViewMenu(null)
        setMoreMenu(null)
        setSearchScope('current')
        setSearchOpen(true)
      }

      const closeSearch = () => {
        setSearchOpen(false)
        setSearch('')
        setTypeFilter('all')
        setTimeFilter('all')
        setFolderFilter('all')
      }

      const renderEntry = (item) => {
        const isSelected = selectedPaths.includes(item.path)
        const isBusy = rowBusy === item.path
        return h(
          'div',
          {
            key: item.path,
            className: 'fr-row' + (!isHome ? ' fr-row-browse' : '') + (item.kind === 'file' ? ' fr-row-file' : '') + (freshPath === item.path ? ' fr-row-new' : '') + (isBusy ? ' fr-row-busy' : ''),
            onClick: item.kind === 'file'
              ? (event) => {
                  const target = event.target
                  if (target && target.closest && target.closest('button, input, a')) return
                  openItem(item)
                }
              : undefined,
          },
          h('input', {
            type: 'checkbox',
            className: 'fr-check',
            checked: isSelected,
            onChange: () => toggleSelect(item.path),
            'aria-label': translate('files.selectAll') + ': ' + item.name,
          }),
          item.kind === 'file' && (imageFile(item.name) || videoFile(item.name))
            ? h(
                'span',
                { className: 'fr-thumb' },
                h('span', { className: 'fr-thumb-fallback', 'aria-hidden': true }, h(FileTypeIcon, { name: item.name, kind: item.kind, size: 18 })),
                h('img', {
                  src: API + '/thumb?path=' + encodeURIComponent(item.path),
                  loading: 'lazy',
                  alt: '',
                  onError: (event) => {
                    event.currentTarget.style.display = 'none'
                  },
                }),
              )
            : h('span', { className: 'fr-row-icon' }, h(FileTypeIcon, { name: item.name, kind: item.kind, size: 20 })),
          item.kind === 'directory'
            ? h('button', { type: 'button', className: 'fr-row-name fr-row-link', onClick: () => navigateTo(item.path), title: item.name }, renderName(item))
            : h(
                'span',
                { className: 'fr-row-name', title: item.name },
                renderName(item),
                freshPath === item.path ? h('span', { className: 'fr-new-badge' }, translate('files.newBadge')) : null,
              ),
          h('span', { className: 'fr-row-source', title: item.sourceDir ? item.sourceDir + '/' : '' }, item.sourceDir ? item.sourceDir + '/' : ''),
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

      const qrCard = h(
        'section',
        { className: 'fr-card' },
        h('div', { className: 'fr-card-head' }, h('h2', null, translate('qr.title'))),
        state && state.url
          ? h('div', { className: 'fr-qr-box' }, h('img', { className: 'fr-qr', src: state.qrSvgUrl, alt: translate('qr.alt') }))
          : h('div', { className: 'fr-qr-box fr-qr-empty' }, state && state.lanError ? state.lanError : translate('qr.wait')),
        state && !state.url ? h('p', { className: 'fr-hint fr-warn' }, (state && state.lanError) || translate('qr.noNetwork')) : null,
        h(
          'div',
          { className: 'fr-actions fr-qr-actions', style: { marginTop: '10px' } },
          h('button', { type: 'button', className: 'fr-btn', onClick: copyLink, disabled: !state || !state.url }, translate('common.copy')),
          h('button', { type: 'button', className: 'fr-btn', onClick: rotateToken, disabled: busy || !state || !state.url }, translate('qr.reset')),
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
      const showFolderAdd = isHome && folders.length === 1 && folders[0] && folders[0].name === '默认'
      const folderCards = isHome
        ? h('div', { className: 'fr-folders-wrap' },
            h('div', { className: 'fr-folders-head' },
              h('button', {
                type: 'button',
                className: 'fr-folder-area-more',
                onClick: openFolderAreaMenu,
                title: translate('files.folderAreaActions'),
                'aria-label': translate('files.folderAreaActions'),
              }, '⋯'),
            ),
            h('div', { className: 'fr-folders' },
              folders.map((folder) => {
                const updatedAt = folder.lastReceivedAt || folder.mtime || 0
                const isNew = folder.lastReceivedAt > (folderSeen[folderSeenKey(folder.path)] || 0)
                return h('div', {
                    key: folder.path,
                    className: 'fr-folder-card',
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => navigateTo(folder.path),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigateTo(folder.path)
                      }
                    },
                    title: folder.name,
                  },
                  h('span', { className: 'fr-folder-icon' }, h(FileTypeIcon, { name: folder.name, kind: 'directory', size: 22 })),
                  h('span', { className: 'fr-folder-text' },
                    h('span', { className: 'fr-folder-name' }, folder.name),
                    h('span', { className: 'fr-folder-time' },
                      h('span', { className: 'fr-folder-dot' + (isNew ? ' is-new' : ''), title: isNew ? translate('files.hasNew') : '' }),
                      formatFileTime(updatedAt, translate),
                    ),
                  ),
                  h('button', {
                    type: 'button',
                    className: 'fr-folder-more',
                    onClick: (event) => {
                      event.stopPropagation()
                      openRowMenu(event, { kind: 'directory', path: folder.path, name: folder.name })
                    },
                    title: translate('files.more'),
                    'aria-label': translate('files.more'),
                  }, '⋯'),
                )
              }),
              showFolderAdd
                ? h('button', {
                    type: 'button',
                    className: 'fr-folder-card fr-folder-add',
                    onClick: createFolder,
                    title: translate('files.newFolder'),
                    'aria-label': translate('files.newFolder'),
                  },
                    h('span', { className: 'fr-folder-add-icon', 'aria-hidden': true }, '+'),
                    h('span', { className: 'fr-folder-add-label' }, translate('files.newFolder')),
                  )
                : null,
            ),
          )
        : null
      const filesCard = h(
        'section',
        { className: 'fr-card fr-card-files' },
        h(
          'div',
          { className: 'fr-card-head' },
          h('div', { className: 'fr-card-title' },
            isHome ? null : h('button', { type: 'button', className: 'fr-back', onClick: backToHome, title: translate('files.back'), 'aria-label': translate('files.back') }, '←'),
            h('h2', null, isHome ? translate('files.title') : (currentPath ? currentPath.split('/').pop() : translate('files.browseTitle'))),
          ),
          h(
            'div',
            { className: 'fr-actions' },
            currentPath.includes('/')
              ? h('button', { type: 'button', className: 'fr-btn', onClick: () => navigateTo(parentPath), disabled: busy }, '↑ ' + translate('files.up'))
              : null,
            !isHome
              ? h('button', { type: 'button', className: 'fr-btn', onClick: createFolder, disabled: busy }, translate('files.newFolder'))
              : null,
            !isHome
              ? h('button', { type: 'button', className: 'fr-btn', onClick: openCurrentDir, disabled: busy }, translate('files.openFolder'))
              : null,
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
          isHome
            ? h('select', {
                className: 'fr-sort fr-filter',
                value: typeFilter,
                onChange: (event) => setTypeFilter(event.target.value),
                'aria-label': translate('files.typeAll'),
                title: translate('files.typeAll'),
              }, typeFilterOptions.map(([value, key]) => h('option', { key: value, value }, translate(key))))
            : null,
          isHome
            ? h('select', {
                className: 'fr-sort fr-filter',
                value: timeFilter,
                onChange: (event) => setTimeFilter(event.target.value),
                'aria-label': translate('files.timeAll'),
                title: translate('files.timeAll'),
              },
                h('option', { value: 'all' }, translate('files.timeAll')),
                h('option', { value: 'today' }, translate('files.timeToday')),
                h('option', { value: '7d' }, translate('files.time7d')),
                h('option', { value: '30d' }, translate('files.time30d')),
              )
            : null,
          isHome && folderFilterOptions.length > 1
            ? h('select', {
                className: 'fr-sort fr-filter',
                value: folderFilter,
                onChange: (event) => setFolderFilter(event.target.value),
                'aria-label': translate('files.filterFolder'),
                title: translate('files.filterFolder'),
              },
                h('option', { value: 'all' }, translate('files.allFolders')),
                folderFilterOptions.map((folder) => h('option', { key: folder, value: folder }, folder + '/')),
              )
            : null,
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
          { className: 'fr-table-head' + (isHome ? '' : ' fr-table-head-browse') },
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
          h('button', { type: 'button', className: 'fr-sort-head', onClick: () => changeSort('name'), title: translate('files.colName') }, translate('files.colName') + sortMark('name')),
          h('button', { type: 'button', className: 'fr-sort-head fr-col-source', onClick: () => changeSort('source'), title: translate('files.colSource') }, translate('files.colSource') + sortMark('source')),
          h('button', { type: 'button', className: 'fr-sort-head fr-col-size', onClick: () => changeSort('size'), title: translate('files.colSize') }, translate('files.colSize') + sortMark('size')),
          h('button', { type: 'button', className: 'fr-sort-head fr-col-time', onClick: () => changeSort('time'), title: translate('files.colTime') }, translate('files.colTime') + sortMark('time')),
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
          h('span', { className: 'fr-count' }, isHome
            ? translate('files.countFiles').replace('{files}', String(visibleFiles.length))
            : translate('files.count').replace('{dirs}', String(visibleDirs.length)).replace('{files}', String(visibleFiles.length))),
        ),
      )


      const renderMediaPreview = (item, className) => {
        const visual = imageFile(item.name) || videoFile(item.name)
        return h('span', { className: className + (visual ? '' : ' fr-media-icon') },
          visual
            ? [
                h('span', { key: 'fallback', className: 'fr-media-fallback' }, h(FileTypeIcon, { name: item.name, kind: item.kind, size: 30 })),
                h('img', {
                  key: 'image',
                  src: API + '/thumb?path=' + encodeURIComponent(item.path),
                  loading: 'lazy',
                  alt: '',
                  onError: (event) => { event.currentTarget.style.display = 'none' },
                }),
              ]
            : h(FileTypeIcon, { name: item.name, kind: item.kind, size: 34 }),
        )
      }

      const renderItemMore = (item, className) =>
        h('button', {
          type: 'button',
          className: className,
          onClick: (event) => {
            event.stopPropagation()
            openRowMenu(event, item)
          },
          disabled: busy || rowBusy === item.path,
          title: translate('files.more'),
          'aria-label': translate('files.more'),
        }, '⋯')

      const renderRecentCard = (item) => h('article', {
          key: item.path,
          className: 'fr-recent-card' + (freshPath === item.path ? ' fr-recent-new' : ''),
          onClick: () => openItem(item),
          title: item.name,
        },
        h('div', { className: 'fr-recent-preview' }, renderMediaPreview(item, 'fr-recent-media')),
        renderItemMore(item, 'fr-recent-more'),
        h('div', { className: 'fr-recent-name' }, renderName(item)),
        h('div', { className: 'fr-recent-size' }, formatSize(item.size)),
        item.sourceDir ? h('div', { className: 'fr-recent-source' }, item.sourceDir + '/') : null,
      )

      const renderBrowseFolder = (item) => h('div', {
          key: item.path,
          className: 'fr-browse-row fr-browse-folder',
          role: 'button',
          tabIndex: 0,
          onClick: () => navigateTo(item.path),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigateTo(item.path)
            }
          },
          title: item.name,
        },
        h('span', { className: 'fr-browse-icon fr-browse-folder-icon' }, h(FileTypeIcon, { name: item.name, kind: 'directory', size: 30 })),
        h('span', { className: 'fr-browse-main' },
          h('span', { className: 'fr-browse-name' }, item.name),
          h('span', { className: 'fr-browse-meta' },
            formatFileTime(item.mtime, translate),
            typeof item.childCount === 'number' ? ' · ' + translate('files.childCount').replace('{n}', String(item.childCount)) : '',
          ),
        ),
        renderItemMore(item, 'fr-browse-more'),
      )

      const renderBrowseFile = (item) => h('div', {
          key: item.path,
          className: 'fr-browse-row fr-browse-file' + (freshPath === item.path ? ' fr-browse-new' : ''),
          role: 'button',
          tabIndex: 0,
          onClick: () => openItem(item),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openItem(item)
            }
          },
          title: item.name,
        },
        h('span', { className: 'fr-browse-icon' }, renderMediaPreview(item, 'fr-browse-media')),
        h('span', { className: 'fr-browse-main' },
          h('span', { className: 'fr-browse-name' }, fileBaseName(item.name)),
          h('span', { className: 'fr-browse-meta' },
            formatFileTime(item.mtime, translate),
            ' · ',
            formatSize(item.size),
            fileExtension(item.name) ? h('span', { className: 'fr-file-type-tag' }, fileExtension(item.name).toUpperCase()) : null,
            item.sourceDir ? h('span', { className: 'fr-browse-source' }, item.sourceDir + '/') : null,
          ),
        ),
        renderItemMore(item, 'fr-browse-more'),
      )


      const renderBrowseGridFolder = (item) => h('article', {
          key: item.path,
          className: 'fr-browse-grid-card fr-browse-grid-folder',
          onClick: () => navigateTo(item.path),
          title: item.name,
        },
        h('span', { className: 'fr-browse-grid-icon' }, h(FileTypeIcon, { name: item.name, kind: 'directory', size: 38 })),
        h('span', { className: 'fr-browse-grid-name' }, item.name),
        h('span', { className: 'fr-browse-grid-meta' },
          formatFileTime(item.mtime, translate),
          typeof item.childCount === 'number' ? ' · ' + translate('files.childCount').replace('{n}', String(item.childCount)) : '',
        ),
        renderItemMore(item, 'fr-browse-grid-more'),
      )

      const renderBrowseGridFile = (item) => h('article', {
          key: item.path,
          className: 'fr-browse-grid-card fr-browse-grid-file' + (freshPath === item.path ? ' fr-browse-new' : ''),
          onClick: () => openItem(item),
          title: item.name,
        },
        h('span', { className: 'fr-browse-grid-preview' }, renderMediaPreview(item, 'fr-browse-grid-media')),
        renderItemMore(item, 'fr-browse-grid-more'),
        h('span', { className: 'fr-browse-grid-name' }, fileBaseName(item.name)),
        h('span', { className: 'fr-browse-grid-meta' }, formatSize(item.size)),
      )

      const browseTypeCard = (value, sample, label, colorClass) => h('button', {
          type: 'button',
          className: 'fr-type-shortcut' + (typeFilter === value ? ' active' : ''),
          onClick: () => setTypeFilter(typeFilter === value ? 'all' : value),
        },
        h('span', { className: 'fr-type-shortcut-icon ' + colorClass }, h(FileTypeIcon, { name: sample, kind: 'file', size: 25 })),
        h('span', { className: 'fr-type-shortcut-label' }, label),
      )

      const recentEmpty = h('div', { className: 'fr-library-empty' },
        h('span', { className: 'fr-empty-glyph', 'aria-hidden': true }, h(FileTypeIcon, { name: 'file', kind: 'file', size: 38 })),
        h('strong', null, searchNeedle ? translate('files.noMatch') : translate('files.emptyTitle')),
        h('span', null, searchNeedle ? translate('files.noMatchHint') : translate('files.emptyHint')),
        searchNeedle ? h('button', { type: 'button', className: 'fr-btn', onClick: () => setSearch('') }, translate('files.clearSearch')) : null,
      )

      const browseEmpty = h('div', { className: 'fr-library-empty' },
        h('span', { className: 'fr-empty-glyph', 'aria-hidden': true }, h(FileTypeIcon, { name: 'file', kind: 'file', size: 38 })),
        h('strong', null, searchNeedle || typeFilter !== 'all' ? translate('files.noMatch') : translate('files.emptyTitle')),
        h('span', null, searchNeedle || typeFilter !== 'all' ? translate('files.noMatchHint') : translate('files.emptyHint')),
        searchNeedle ? h('button', { type: 'button', className: 'fr-btn', onClick: () => setSearch('') }, translate('files.clearSearch')) : null,
      )

      const recentToolbar = h('div', { className: 'fr-library-toolbar' },
        h('label', { className: 'fr-search' },
          h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
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
        h('select', {
          className: 'fr-library-select',
          value: typeFilter,
          onChange: (event) => setTypeFilter(event.target.value),
          'aria-label': translate('files.typeAll'),
          title: translate('files.typeAll'),
        }, typeFilterOptions.map(([value, key]) => h('option', { key: value, value }, translate(key)))),
        h('select', {
          className: 'fr-library-select',
          value: timeFilter,
          onChange: (event) => setTimeFilter(event.target.value),
          'aria-label': translate('files.timeAll'),
          title: translate('files.timeAll'),
        },
          h('option', { value: 'all' }, translate('files.timeAll')),
          h('option', { value: 'today' }, translate('files.timeToday')),
          h('option', { value: '7d' }, translate('files.time7d')),
          h('option', { value: '30d' }, translate('files.time30d')),
        ),
        folderFilterOptions.length > 1
          ? h('select', {
              className: 'fr-library-select',
              value: folderFilter,
              onChange: (event) => setFolderFilter(event.target.value),
              'aria-label': translate('files.filterFolder'),
              title: translate('files.filterFolder'),
            },
              h('option', { value: 'all' }, translate('files.allFolders')),
              folderFilterOptions.map((folder) => h('option', { key: folder, value: folder }, folder + '/')),
            )
          : null,
      )

      const browseToolbar = h('div', { className: 'fr-library-toolbar' },
        h('label', { className: 'fr-search' },
          h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
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
        typeFilter !== 'all'
          ? h('button', { type: 'button', className: 'fr-link', onClick: () => setTypeFilter('all') }, translate('files.clearFilter'))
          : null,
      )

      const recentView = h('div', { className: 'fr-library-body' },
        recentGroups.length === 0
          ? recentEmpty
          : recentGroups.map((group) => h('section', { key: group.key, className: 'fr-date-section' },
              h('button', {
                  type: 'button',
                  className: 'fr-date-head',
                  onClick: () => toggleRecentGroup(group.key),
                },
                h('span', { className: 'fr-date-label' }, translate('files.groupCount').replace('{label}', group.label).replace('{n}', String(group.items.length))),
                h('span', { className: 'fr-date-chevron' + (collapsedGroups[group.key] ? ' collapsed' : '') }, '⌄'),
              ),
              !collapsedGroups[group.key]
                ? (recentViewMode === 'list'
                    ? h('div', { className: 'fr-recent-list' }, group.items.map(renderBrowseFile))
                    : h('div', { className: 'fr-recent-grid' }, group.items.map(renderRecentCard)))
                : null,
            )),
        h('div', { className: 'fr-library-foot' }, translate('files.countFiles').replace('{files}', String(visibleFiles.length))),
      )

      const browseBody = browseViewMode === 'grid'
        ? h('div', { className: 'fr-browse-grid' },
            visibleDirs.map(renderBrowseGridFolder),
            visibleFiles.map(renderBrowseGridFile),
          )
        : h('div', { className: 'fr-browse-list' },
            visibleDirs.map(renderBrowseFolder),
            visibleFiles.map(renderBrowseFile),
          )

      const browseView = h('div', { className: 'fr-library-body' },
        (visibleDirs.length + visibleFiles.length) === 0 ? browseEmpty : browseBody,
        h('div', { className: 'fr-library-foot' },
          translate('files.count').replace('{dirs}', String(visibleDirs.length)).replace('{files}', String(visibleFiles.length)),
        ),
      )

      const searchRootLabel = state && state.saveDirName ? state.saveDirName : 'FileShuttle'
      const searchTypeOptions = [
        ['all', 'files.typeAll'],
        ['document', 'files.typeDocument'],
        ['image', 'files.typeImage'],
        ['video', 'files.typeVideo'],
        ['audio', 'files.typeAudio'],
        ['archive', 'files.typeArchive'],
        ['package', 'files.typePackage'],
        ['folder', 'files.typeFolder'],
      ]
      const searchDirectoryPaths = new Set()
      for (const item of receivedItems) {
        if (!item.sourceDir) continue
        const parts = String(item.sourceDir).split('/').filter(Boolean)
        for (let index = 1; index <= parts.length; index += 1) {
          searchDirectoryPaths.add(parts.slice(0, index).join('/'))
        }
      }
      const recentSearchDirs = Array.from(searchDirectoryPaths)
        .filter((directory) => !searchNeedle || directory.toLowerCase().includes(searchNeedle))
        .filter((directory) => folderFilter === 'all' || directory === folderFilter || directory.startsWith(folderFilter + '/'))
        .filter((directory) => typeFilter === 'all' || typeFilter === 'folder')
        .map((directory) => ({
          path: directory,
          name: directory.split('/').pop(),
          kind: 'directory',
          mtime: 0,
          childCount: 0,
        }))
      const recentSearchFiles = receivedItems
        .filter((item) => matchesSearch(item) && matchesFolderFilter(item) && matchesTypeFilter(item) && matchesTimeFilter(item))
        .slice()
        .sort(compareEntries)
      const remoteSearchDirs = searchRemote.dirs
        .filter((item) => matchesSearch(item) && matchesTypeFilter(item) && matchesTimeFilter(item))
      const remoteSearchFiles = searchRemote.files
        .filter((item) => matchesSearch(item) && matchesTypeFilter(item) && matchesTimeFilter(item))
        .slice()
        .sort(compareEntries)
      const searchDirs = isHome ? recentSearchDirs : remoteSearchDirs
      const searchFiles = isHome ? recentSearchFiles : remoteSearchFiles
      const searchResultCount = searchDirs.length + searchFiles.length
      const searchLoading = !isHome && searchRemote.loading
      const hasSearchCriteria = Boolean(searchNeedle) || typeFilter !== 'all' || folderFilter !== 'all' || timeFilter !== 'all'
      const searchChip = (active, label, onClick, key) => h('button', {
        key,
        type: 'button',
        className: 'fr-search-chip' + (active ? ' active' : ''),
        onClick,
      }, label)
      const searchView = h('section', { className: 'fr-library-card fr-search-card' },
        h('div', { className: 'fr-search-header' },
          h('button', { type: 'button', className: 'fr-back', onClick: closeSearch, title: translate('files.back'), 'aria-label': translate('files.back') }, '←'),
          h('label', { className: 'fr-search fr-search-large' },
            h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
              h('circle', { cx: 11, cy: 11, r: 6.5 }),
              h('path', { d: 'M16 16l4.5 4.5' }),
            ),
            h('input', {
              value: search,
              onChange: (event) => setSearch(event.target.value),
              placeholder: translate('files.search'),
              'aria-label': translate('files.search'),
              spellCheck: false,
              autoFocus: true,
            }),
            search ? h('button', { type: 'button', className: 'fr-search-clear', onClick: () => setSearch(''), 'aria-label': translate('files.clearSearch'), title: translate('files.clearSearch') }, '×') : null,
          ),
        ),
        h('div', { className: 'fr-search-body' },
          !isHome
            ? h('div', { className: 'fr-search-scope' },
                searchChip(searchScope === 'current', translate('files.scopeCurrent').replace('{path}', currentPath || searchRootLabel), () => setSearchScope('current'), 'scope-current'),
                searchChip(searchScope === 'all', translate('files.scopeAll'), () => setSearchScope('all'), 'scope-all'),
              )
            : null,
          h('h3', { className: 'fr-search-heading' }, translate('files.searchTypeHeading')),
          h('div', { className: 'fr-search-chips' }, searchTypeOptions.map(([value, key]) => searchChip(typeFilter === value, translate(key), () => setTypeFilter(value), value))),
          isHome && folderFilterOptions.length > 1
            ? [
                h('h3', { className: 'fr-search-heading', key: 'dir-heading' }, translate('files.searchFolderHeading')),
                h('div', { className: 'fr-search-chips', key: 'dir-chips' },
                  searchChip(folderFilter === 'all', translate('files.allFolders'), () => setFolderFilter('all'), 'dir-all'),
                  folderFilterOptions.map((folder) => searchChip(folderFilter === folder, folder + '/', () => setFolderFilter(folder), 'dir-' + folder)),
                ),
              ]
            : null,
          h('h3', { className: 'fr-search-heading' }, translate('files.searchTimeHeading')),
          h('div', { className: 'fr-search-chips' },
            searchChip(timeFilter === 'all', translate('files.timeAll'), () => setTimeFilter('all'), 'time-all'),
            searchChip(timeFilter === 'today', translate('files.timeToday'), () => setTimeFilter('today'), 'time-today'),
            searchChip(timeFilter === '7d', translate('files.time7d'), () => setTimeFilter('7d'), 'time-7d'),
            searchChip(timeFilter === '30d', translate('files.time30d'), () => setTimeFilter('30d'), 'time-30d'),
          ),
          hasSearchCriteria
            ? (searchLoading
                ? h('div', { className: 'fr-search-hint' }, translate('files.searchLoading'))
                : searchRemote.error
                  ? h('div', { className: 'fr-search-hint' }, translate('files.searchError').replace('{message}', searchRemote.error))
                  : h('div', { className: 'fr-search-results-head' }, translate('files.searchResults').replace('{n}', String(searchResultCount))))
            : h('div', { className: 'fr-search-hint' }, translate('files.searchHint')),
          hasSearchCriteria && !searchLoading && !searchRemote.error && searchResultCount === 0
            ? h('div', { className: 'fr-library-empty fr-search-empty' },
                h('span', { className: 'fr-empty-glyph', 'aria-hidden': true }, h(FileTypeIcon, { name: 'file', kind: 'file', size: 38 })),
                h('strong', null, translate('files.noMatch')),
              )
            : null,
          hasSearchCriteria && !searchLoading && !searchRemote.error && searchResultCount > 0
            ? h('div', { className: 'fr-browse-list fr-search-results' },
                searchDirs.map(renderBrowseFolder),
                searchFiles.map(renderBrowseFile),
              )
            : null,
        ),
      )

      const recentIcon = h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('circle', { cx: 12, cy: 12, r: 8.2 }),
        h('path', { d: 'M12 7.2v5.1l3.3 2' }),
      )
      const browseIcon = h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M3.5 6.8a1.7 1.7 0 0 1 1.7-1.7h4l1.8 2.2h7.8a1.7 1.7 0 0 1 1.7 1.7v8.2a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z' }),
      )
      const recentTab = h('button', {
        type: 'button',
        className: 'fr-library-tab' + (isHome ? ' active' : ''),
        onClick: () => { if (!isHome) backToHome() },
      }, h('span', { className: 'fr-library-tab-icon' }, recentIcon), h('span', null, translate('files.recentTitle')))

      const browseTab = h('button', {
        type: 'button',
        className: 'fr-library-tab' + (!isHome ? ' active' : ''),
        onClick: () => { if (isHome) enterBrowseDefault() },
      }, h('span', { className: 'fr-library-tab-icon' }, browseIcon), h('span', null, translate('files.browseTitle')))


      const breadcrumbSegments = currentPath ? currentPath.split('/').filter(Boolean) : []
      const rootLabel = state && state.saveDirName ? state.saveDirName : 'FileShuttle'
      const breadcrumb = h('div', { className: 'fr-breadcrumb-wrap' },
        h('button', {
          type: 'button',
          className: 'fr-crumb fr-crumb-root' + (breadcrumbSegments.length === 0 ? ' current' : ''),
          onClick: () => navigateTo(''),
          title: rootLabel,
        },
          h(FileTypeIcon, { name: rootLabel, kind: 'directory', size: 14 }),
          h('span', { className: 'fr-crumb-label' }, rootLabel),
        ),
        breadcrumbSegments.length > 0 ? h('span', { className: 'fr-crumb-sep', 'aria-hidden': true }, '›') : null,
        h('div', { className: 'fr-breadcrumb-scroll', ref: breadcrumbScrollRef },
          breadcrumbSegments.map((segment, index) => {
            const target = breadcrumbSegments.slice(0, index + 1).join('/')
            const isCurrent = index === breadcrumbSegments.length - 1
            return h(React.Fragment, { key: target },
              index > 0 ? h('span', { className: 'fr-crumb-sep', 'aria-hidden': true }, '›') : null,
              h('button', {
                type: 'button',
                className: 'fr-crumb' + (isCurrent ? ' current' : ''),
                onClick: () => navigateTo(target),
                title: target,
              }, segment),
            )
          }),
        ),
      )

      const topIcon = (kind) => {
        if (kind === 'new-folder') {
          return h('svg', { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
            h('path', { d: 'M3.5 6.8a1.7 1.7 0 0 1 1.7-1.7h4l1.8 2.2h7.8a1.7 1.7 0 0 1 1.7 1.7v8.2a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z' }),
            h('path', { d: 'M12 11v5M9.5 13.5h5' }),
          )
        }
        if (kind === 'search') {
          return h('svg', { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', 'aria-hidden': true },
            h('circle', { cx: 10.5, cy: 10.5, r: 6.2 }),
            h('path', { d: 'M15.2 15.2L20 20' }),
          )
        }
        if (kind === 'filter') {
          return h('svg', { width: 19, height: 19, viewBox: '0 0 1024 1024', fill: 'currentColor', 'aria-hidden': true },
            h('path', { d: 'M639.573333 125.013333c-54.058667 0-104.533333 35.498667-120.234666 85.418667L170.24 210.346667a42.666667 42.666667 0 0 0 0 85.333333l349.013333-0.042667c19.157333 52.266667 66.218667 85.333333 120.32 85.333334 54.101333 0 101.632-33.152 121.088-85.674667l92.245334 0.384a42.666667 42.666667 0 0 0 0-85.333333h-92.586667c-20.565333-52.053333-66.688-85.333333-120.746667-85.333334z m0 85.333334a42.666667 42.666667 0 1 1 0 85.333333 42.666667 42.666667 0 0 1 0-85.333333z m-256 170.666666c-56.192 0-103.253333 34.986667-120.448 85.418667-5.973333 0.384-92.842667-0.085333-92.842666-0.085333a42.666667 42.666667 0 0 0 0 85.333333s87.552-0.896 93.013333-0.341333a126.037333 126.037333 0 0 0 120.32 85.674666c54.101333 0 100.437333-33.152 120.746667-85.205333l348.586666-0.128a42.666667 42.666667 0 0 0 0-85.333333l-348.842666-0.426667A128.512 128.512 0 0 0 383.573333 381.013333z m0 85.333334a42.666667 42.666667 0 1 1 0 85.333333 42.666667 42.666667 0 0 1 0-85.333333z m256 170.666666c-54.058667 0-103.552 35.626667-120.277333 84.906667l-349.013333 0.426667a42.666667 42.666667 0 0 0 0 85.333333h348.373333a128.853333 128.853333 0 0 0 120.96 85.333333c54.101333 0 100.693333-33.834667 121.258667-85.333333h92.074666a42.666667 42.666667 0 0 0 0-85.333333l-92.458666-0.256a129.450667 129.450667 0 0 0-120.874667-85.077334z m0 85.333334a42.666667 42.666667 0 1 1 0 85.333333 42.666667 42.666667 0 0 1 0-85.333333z' }),
          )
        }
        return h('svg', { width: 19, height: 19, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true },
          h('circle', { cx: 5, cy: 12, r: 1.7 }),
          h('circle', { cx: 12, cy: 12, r: 1.7 }),
          h('circle', { cx: 19, cy: 12, r: 1.7 }),
        )
      }

      const topAction = (kind, label, onClick, disabled, active) => h('button', {
        type: 'button',
        className: 'fr-icon-btn' + (active ? ' active' : ''),
        onClick,
        disabled,
        title: label,
        'aria-label': label,
      }, topIcon(kind))

      const topbar = h('div', { className: 'fr-library-topbar' },
        h('div', { className: 'fr-library-topbar-left' },
          !isHome
            ? h('button', { type: 'button', className: 'fr-back', onClick: backToHome, title: translate('files.back'), 'aria-label': translate('files.back') }, '←')
            : h('h2', { className: 'fr-library-title-text' }, translate('files.recentTitle')),
        ),
        h('div', { className: 'fr-library-topbar-actions' },
          topAction('search', translate('files.search'), openSearch, false, searchOpen),
          topAction('filter', translate('files.viewSort'), openViewMenu, false, Boolean(viewMenu)),
          topAction('more', translate('files.moreActions'), openMoreMenu, false, Boolean(moreMenu)),
        ),
      )

      const libraryCard = searchOpen ? searchView : h('section', { className: 'fr-library-card' },
        topbar,
        isHome ? null : breadcrumb,
        isHome ? recentView : browseView,
        h('div', { className: 'fr-library-nav' }, recentTab, browseTab),
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
        notice ? h('div', { className: 'fr-banner fr-banner-ok fr-toast' }, notice) : null,
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
                    h('li', null, h('strong', null, translate('tips.sameWifi'))),
                    h('li', null, translate('tips.wechat')),
                    h('li', null, translate('tips.firewall')),
                    h('li', null, translate('tips.foreground')),
                    h('li', null, translate('tips.token')),
                  ),
                ),
                networkCard,
              ),
              h('div', { className: 'fr-main' }, libraryCard),
            )
          : null,
        viewMenu
          ? h(
              'div',
              { className: 'fr-menu-overlay', onMouseDown: () => setViewMenu(null) },
              h(
                'div',
                {
                  className: 'fr-view-menu',
                  role: 'menu',
                  style: { left: viewMenu.left, top: viewMenu.top },
                  onMouseDown: (event) => event.stopPropagation(),
                },
                h('div', { className: 'fr-view-menu-label' }, translate('files.viewMode')),
                h('button', {
                  type: 'button',
                  className: 'fr-view-menu-item' + ((isHome ? recentViewMode : browseViewMode) === 'grid' ? ' active' : ''),
                  role: 'menuitem',
                  onClick: () => setViewMode('grid'),
                },
                  translate('files.viewGrid'),
                  (isHome ? recentViewMode : browseViewMode) === 'grid' ? h('span', { className: 'fr-view-check' }, '✓') : null,
                ),
                h('button', {
                  type: 'button',
                  className: 'fr-view-menu-item' + ((isHome ? recentViewMode : browseViewMode) === 'list' ? ' active' : ''),
                  role: 'menuitem',
                  onClick: () => setViewMode('list'),
                },
                  translate('files.viewList'),
                  (isHome ? recentViewMode : browseViewMode) === 'list' ? h('span', { className: 'fr-view-check' }, '✓') : null,
                ),
                h('div', { className: 'fr-view-menu-sep' }),
                h('div', { className: 'fr-view-menu-label' }, translate('files.sortMode')),
                [['time', 'files.sortDate'], ['name', 'files.colName'], ['size', 'files.colSize']].concat(isHome ? [['source', 'files.colSource']] : []).map(([key, label]) =>
                  h('button', {
                    key,
                    type: 'button',
                    className: 'fr-view-menu-item' + (sortKey === key ? ' active' : ''),
                    role: 'menuitem',
                    onClick: () => {
                      changeSort(key)
                      setViewMenu(null)
                    },
                  }, translate(label) + (sortKey === key ? ' ' + (sortAscending ? '↑' : '↓') : '')),
                ),
              ),
            )
          : null,
        moreMenu
          ? h(
              'div',
              { className: 'fr-menu-overlay', onMouseDown: () => setMoreMenu(null) },
              h(
                'div',
                {
                  className: 'fr-row-menu',
                  role: 'menu',
                  style: { left: moreMenu.left, top: moreMenu.top },
                  onMouseDown: (event) => event.stopPropagation(),
                },
                !isHome
                  ? h('button', {
                      type: 'button',
                      className: 'fr-menu-item',
                      role: 'menuitem',
                      disabled: busy,
                      onClick: () => {
                        setMoreMenu(null)
                        createFolder()
                      },
                    }, translate('files.newFolder'))
                  : null,
                !isHome
                  ? h('button', {
                      type: 'button',
                      className: 'fr-menu-item',
                      role: 'menuitem',
                      disabled: busy || folders.length === 0,
                      onClick: openDirSwitchFromMore,
                    }, translate('files.switchDir'))
                  : null,
                h('button', {
                  type: 'button',
                  className: 'fr-menu-item',
                  role: 'menuitem',
                  disabled: busy,
                  onClick: () => {
                    setMoreMenu(null)
                    openCurrentDir()
                  },
                }, translate('files.openFolder')),
                h('button', {
                  type: 'button',
                  className: 'fr-menu-item',
                  role: 'menuitem',
                  disabled: busy,
                  onClick: () => {
                    setMoreMenu(null)
                    refresh(pathRef.current)
                  },
                }, translate('common.refresh')),
              ),
            )
          : null,
        dirSwitchMenu
          ? h(
              'div',
              { className: 'fr-menu-overlay', onMouseDown: () => setDirSwitchMenu(null) },
              h(
                'div',
                {
                  className: 'fr-dir-menu',
                  role: 'menu',
                  style: { left: dirSwitchMenu.left, top: dirSwitchMenu.top },
                  onMouseDown: (event) => event.stopPropagation(),
                },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fr-menu-item' + (!currentPath ? ' active' : ''),
                    role: 'menuitem',
                    onClick: () => selectSwitchDir(''),
                  },
                  h('span', { className: 'fr-dir-menu-icon' },
                    h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
                      h('path', { d: 'M3.5 10.5L12 3.5l8.5 7' }),
                      h('path', { d: 'M5.5 9.5v9a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-9' }),
                    ),
                  ),
                  h('span', null, './ ' + translate('files.rootDir')),
                ),
                folders.map((folder) => {
                  const active = currentPath === folder.path || currentPath.startsWith(folder.path + '/')
                  return h('button', {
                      key: folder.path,
                      type: 'button',
                      className: 'fr-menu-item' + (active ? ' active' : ''),
                      role: 'menuitem',
                      onClick: () => selectSwitchDir(folder.path),
                      title: './' + folder.path,
                    },
                    h('span', { className: 'fr-dir-menu-icon' }, h(FileTypeIcon, { name: folder.name, kind: 'directory', size: 17 })),
                    h('span', { className: 'fr-dir-menu-name' }, folder.name),
                  )
                }),
              ),
            )
          : null,
        folderAreaMenu
          ? h(
              'div',
              { className: 'fr-menu-overlay', onMouseDown: () => setFolderAreaMenu(null) },
              h(
                'div',
                {
                  className: 'fr-row-menu',
                  role: 'menu',
                  style: { left: folderAreaMenu.left, top: folderAreaMenu.top },
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
                      setFolderAreaMenu(null)
                      createFolder()
                    },
                  },
                  translate('files.newFolder'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'fr-menu-item',
                    role: 'menuitem',
                    disabled: busy,
                    onClick: () => {
                      setFolderAreaMenu(null)
                      openCurrentDir()
                    },
                  },
                  translate('files.openFolder'),
                ),
              ),
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
                      copyItemPath(item)
                    },
                  },
                  translate('files.copyPath'),
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
