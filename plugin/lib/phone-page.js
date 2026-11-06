/**
 * 文件穿梭机 · Shuttle — 手机上传页。
 *
 * 这个页面由局域网监听器直接返回（不是 DSH 的 Web UI），完全自包含：
 * 无外部字体、无 CDN、无框架，只有内联 CSS/JS。
 *
 * 兼容性注意：微信内置浏览器（尤其 Android 旧版 X5 内核）可能不支持
 * async/await 等新语法，静态脚本会直接 SyntaxError，表现为“页面能打开但
 * 按钮没反应”。因此这里的脚本刻意写成 ES5，并带 onerror 兜底提示。
 * 微信 UA 由 Host 判断后传入 wechat，页面顶部会显示操作提示。
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function jsonForScript(value) {
  return JSON.stringify(value ?? '').replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

export function renderPhonePage({ token, hostName, saveDirName, wechat = false }) {
  const safeHost = escapeHtml(hostName)
  const safeDir = escapeHtml(saveDirName)
  const photoIcon = `<span class="picker-icon-wrap" aria-hidden="true">
          <svg class="picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.2" y="4.8" width="17.6" height="14.4" rx="2.6"/>
            <circle cx="8.6" cy="9.6" r="1.4" fill="currentColor" stroke="none"/>
            <path d="M4.6 16.9l4.1-4.1a1.7 1.7 0 0 1 2.4 0l3 3 1.5-1.5a1.7 1.7 0 0 1 2.4 0l2.4 2.4"/>
          </svg>
        </span>`
  const fileIcon = `<span class="picker-icon-wrap" aria-hidden="true">
          <svg class="picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.4 3.6h6.9l4.9 4.9v11a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6V5.2a1.6 1.6 0 0 1 1.6-1.6z"/>
            <path d="M13.3 3.6v5.2h5.2"/>
          </svg>
        </span>`
  const pickers = wechat
    ? `<label class="picker">
        ${fileIcon}
        <span class="picker-title">文件</span>
        <input class="picker-input" id="files" type="file" multiple>
      </label>`
    : `<label class="picker">
        ${photoIcon}
        <span class="picker-title">照片</span>
        <input class="picker-input" id="photos" type="file" accept="image/*,video/*" multiple>
      </label>
      <label class="picker">
        ${fileIcon}
        <span class="picker-title">文件</span>
        <input class="picker-input" id="files" type="file" multiple>
      </label>`
  const pickerGridClass = wechat ? 'pickers pickers-single' : 'pickers pickers-double'
  const pickerNote = wechat
    ? '<p class="picker-note">微信内传送照片请从「文件」入口进入系统选择器的「图片」分类；想要更顺手的体验，建议用手机系统相机扫码，或点右上角「…」→「在浏览器中打开」。</p>'
    : ''
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f2f4f8">
<meta name="color-scheme" content="light">
<meta name="referrer" content="no-referrer">
<title>文件穿梭机</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  [hidden] { display: none !important; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", system-ui, sans-serif;
    background: #f2f4f8; color: #0f172a; line-height: 1.5; -webkit-text-size-adjust: 100%;
    min-height: 100vh; padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
  }
  .app { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }

  .head { display: flex; align-items: center; gap: 10px; padding: 4px 2px 2px; min-width: 0; }
  .logo { flex: none; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
    background: linear-gradient(135deg, #2563eb, #60a5fa); color: #fff; font-size: 20px; font-weight: 700; }
  .head-text { flex: 0 0 auto; }
  .head-text h1 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: .01em; white-space: nowrap; }
  .head-meta { margin-left: auto; display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; flex: 1 1 auto; }
  .host-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #64748b; }
  .dot { flex: none; width: 9px; height: 9px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.14); }
  .dot.off { background: #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,.14); }

  .notice { background: #eef4ff; border: 1px solid #c3d6f5; color: #1e3a66; border-radius: 12px; padding: 11px 14px; font-size: 12.5px; display: flex; flex-direction: column; gap: 4px; }
  .notice b { font-size: 13px; }
  .notice.error { background: #fde9e9; border-color: #f0a8a8; color: #9b1c1c; }

  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }
  .row-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  h2 { font-size: 14px; margin: 0; font-weight: 650; letter-spacing: .01em; }
  .badge { font-size: 11px; color: #2563eb; background: rgba(37,99,235,.1); border-radius: 999px; padding: 3px 9px; white-space: nowrap; }

  .pickers { display: grid; gap: 10px; margin-top: 14px; }
  .pickers-double { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pickers-single { grid-template-columns: minmax(0, 1fr); }
  .picker { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 18px 10px 16px; min-height: 116px; border: 1px solid #d3dce8; border-radius: 16px;
    background: #ffffff; cursor: pointer; }
  .picker-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; font-size: 0; cursor: pointer; z-index: 2; }
  .picker:active { background: #eef3fa; border-color: #b9c8db; }
  .picker-icon-wrap { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: rgba(37, 99, 235, .10); color: #2563eb; margin-bottom: 10px; }
  .picker-icon { width: 25px; height: 25px; display: block; }
  .picker-title { font-size: 15px; font-weight: 650; color: #0f172a; letter-spacing: .01em; }
  .picker-note { margin: 10px 0 0; font-size: 12px; line-height: 1.55; color: #5b6b80; }

  .target { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
  .target label { font-size: 12.5px; color: #64748b; white-space: nowrap; }
  select { flex: 1; min-width: 0; font-size: 13px; padding: 9px 10px; border-radius: 10px; border: 1px solid #d5deea; background: #fff; color: inherit; }

  .queue { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 9px; max-height: 52vh; overflow: auto; }
  .queue-item { background: #f8fafc; border: 1px solid #e5eaf2; border-radius: 12px; padding: 10px 12px; }
  .queue-top { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; }
  .queue-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .queue-state { margin-top: 6px; font-size: 11.5px; color: #64748b; word-break: break-all; }
  .queue-state.ok { color: #16a34a; }
  .queue-state.bad { color: #dc2626; }
  .bar { height: 5px; border-radius: 999px; background: #e2e8f0; margin-top: 8px; overflow: hidden; }
  .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #2563eb, #60a5fa); border-radius: 999px; transition: width .18s ease; }
  .bar.bad i { background: #dc2626; }
  .muted { color: #7b8899; font-size: 12px; }

  .tips { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 16px; font-size: 12.5px; }
  .tips summary { cursor: pointer; color: #475569; font-weight: 600; }
  .tips ul { margin: 8px 0 0; padding-left: 18px; color: #64748b; display: flex; flex-direction: column; gap: 5px; }
  .foot { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 4px; }

</style>
</head>
<body>
<main class="app">
  <header class="head">
    <div class="logo" aria-hidden="true">⇪</div>
    <div class="head-text"><h1>文件穿梭机</h1></div>
    <div class="head-meta">
      <span class="host-name" title="${safeHost}">${safeHost}</span>
      <span class="dot" id="status-dot" title="连接正常"></span>
    </div>
  </header>

  <div class="notice error" id="script-error" hidden></div>
  <div class="notice error" id="pick-error" hidden></div>

  <section class="card">
    <div class="row-between">
      <h2>选择要发送的内容</h2>
      <span class="badge">仅限局域网</span>
    </div>
    <div class="${pickerGridClass}">
      ${pickers}
    </div>
    ${pickerNote}
    <div class="target">
      <label for="dir">保存到</label>
      <select id="dir"><option value="">/（根目录）</option></select>
    </div>
  </section>

  <section class="card" id="queue-card" hidden>
    <div class="row-between">
      <h2>传输进度</h2>
      <span class="muted" id="summary"></span>
    </div>
    <ul class="queue" id="queue"></ul>
  </section>

  <section class="tips">
    <details>
      <summary>传不过去？点这里</summary>
      <ul>
        <li>确认手机和电脑连接的是同一个 WiFi（不是访客网络）。</li>
        <li>微信「扫一扫」对局域网地址不稳定；页面打不开或没反应时，改用手机系统相机扫码，或在微信里点右上角「…」→「在浏览器打开」。</li>
        <li>首次使用时电脑可能弹出「允许接受传入连接」，需要允许。</li>
        <li>传大视频时保持此页面在前台，不要锁屏或切到后台。</li>
        <li>如果提示链接失效，请回到电脑重新扫码。</li>
      </ul>
    </details>
  </section>

  <footer class="foot">Shuttle · 文件只在局域网内传输，不经过任何中转服务器</footer>
</main>
<script>
(function () {
  'use strict';
  var TOKEN = ${jsonForScript(token)};
  var IS_WECHAT = ${wechat ? 'true' : 'false'};
  var BASE = '/s/' + encodeURIComponent(TOKEN);
  var els = {
    photos: document.getElementById('photos'),
    files: document.getElementById('files'),
    dir: document.getElementById('dir'),
    queue: document.getElementById('queue'),
    queueCard: document.getElementById('queue-card'),
    summary: document.getElementById('summary'),
    status: document.getElementById('status-dot'),
    scriptError: document.getElementById('script-error'),
    pickError: document.getElementById('pick-error')
  };
  var pending = [];
  var running = false;
  var okCount = 0;
  var badCount = 0;
  var loadInfo = { reloads: 1, pickedBeforeReload: false };

  function sendEvent(type, detail) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', BASE + '/event', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({
        type: type,
        detail: detail || {},
        reloads: loadInfo.reloads,
        pickedBeforeReload: loadInfo.pickedBeforeReload
      }));
    } catch (error) {
      // 诊断上报失败不影响上传。
    }
  }

  function initDiagnostics() {
    try {
      var loads = Number(sessionStorage.getItem('shuttle.loads') || '0') + 1;
      sessionStorage.setItem('shuttle.loads', String(loads));
      loadInfo.reloads = loads;
      loadInfo.pickedBeforeReload = sessionStorage.getItem('shuttle.pickOpened') === '1';
      sessionStorage.removeItem('shuttle.pickOpened');
    } catch (error) {
      // sessionStorage 不可用时只上报默认值。
    }
    sendEvent('page', { reloads: loadInfo.reloads, pickedBeforeReload: loadInfo.pickedBeforeReload });
  }

  function showScriptError(detail) {
    if (!els.scriptError) return;
    els.scriptError.hidden = false;
    els.scriptError.innerHTML = '';
    var title = document.createElement('b');
    title.textContent = '页面脚本没有正常运行';
    var hint = document.createElement('span');
    hint.textContent = '上传按钮可能没有反应。请改用手机系统相机扫码，或在浏览器中打开本页。' + (detail ? '（' + detail + '）' : '');
    els.scriptError.appendChild(title);
    els.scriptError.appendChild(hint);
  }

  window.onerror = function (message) {
    showScriptError(String(message || ''));
    return false;
  };

  function formatSize(bytes) {
    if (!isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return bytes + ' B';
    var units = ['KB', 'MB', 'GB', 'TB'];
    var value = bytes / 1024;
    var index = 0;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return (value >= 10 ? Math.round(value) : value.toFixed(1)) + ' ' + units[index];
  }

  function addRow(name, size) {
    var item = document.createElement('li');
    item.className = 'queue-item';
    var top = document.createElement('div');
    top.className = 'queue-top';
    var nameEl = document.createElement('span');
    nameEl.className = 'queue-name';
    nameEl.textContent = name;
    var sizeEl = document.createElement('span');
    sizeEl.className = 'muted';
    sizeEl.textContent = formatSize(size);
    top.appendChild(nameEl);
    top.appendChild(sizeEl);
    var bar = document.createElement('div');
    bar.className = 'bar';
    var fill = document.createElement('i');
    bar.appendChild(fill);
    var state = document.createElement('div');
    state.className = 'queue-state';
    state.textContent = '等待中';
    item.appendChild(top);
    item.appendChild(bar);
    item.appendChild(state);
    els.queue.appendChild(item);
    return { fill: fill, state: state, bar: bar };
  }

  function uploadOne(file, targetDir, row, done) {
    var xhr = new XMLHttpRequest();
    var url = BASE + '/upload?name=' + encodeURIComponent(file.name || 'file') + '&dir=' + encodeURIComponent(targetDir || '');
    xhr.open('POST', url, true);
    xhr.timeout = 0;
    xhr.upload.onprogress = function (event) {
      if (!event.lengthComputable) return;
      var percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      row.fill.style.width = percent + '%';
      row.state.textContent = '上传中 ' + percent + '%';
    };
    xhr.onload = function () {
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (error) { data = null; }
      if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
        row.fill.style.width = '100%';
        row.state.className = 'queue-state ok';
        row.state.textContent = '已保存到电脑' + (data.path ? '：' + data.path : '');
        done(true);
        return;
      }
      row.state.className = 'queue-state bad';
      row.bar.className = 'bar bad';
      row.state.textContent = '失败：' + ((data && data.error) || ('HTTP ' + xhr.status));
      done(false);
    };
    xhr.onerror = function () {
      row.state.className = 'queue-state bad';
      row.bar.className = 'bar bad';
      row.state.textContent = '网络中断，请确认电脑服务仍在运行';
      done(false);
    };
    xhr.onabort = function () { done(false); };
    try {
      xhr.send(file);
    } catch (error) {
      row.state.className = 'queue-state bad';
      row.state.textContent = '发送失败：' + (error && error.message ? error.message : '未知错误');
      done(false);
    }
  }

  function updateSummary() {
    els.summary.textContent = '成功 ' + okCount + ' 个' + (badCount > 0 ? ' · 失败 ' + badCount + ' 个' : '');
  }

  function pump() {
    if (pending.length === 0) {
      running = false;
      updateSummary();
      return;
    }
    var task = pending.shift();
    task.row.state.textContent = '上传中…';
    uploadOne(task.file, task.dir, task.row, function (ok) {
      if (ok) {
        okCount += 1;
      } else {
        badCount += 1;
      }
      updateSummary();
      if (typeof task.onItemDone === 'function') {
        try { task.onItemDone(); } catch (error) { /* 忽略 */ }
      }
      pump();
    });
  }

  function enqueue(fileList, onItemDone) {
    if (!fileList || fileList.length === 0) return;
    var targetDir = els.dir.value || '';
    els.queueCard.hidden = false;
    for (var index = 0; index < fileList.length; index += 1) {
      var file = fileList[index];
      pending.push({ file: file, dir: targetDir, row: addRow(file.name, file.size), onItemDone: onItemDone });
    }
    if (!running) {
      running = true;
      pump();
    }
  }

  function showPickError(message) {
    if (!els.pickError) return;
    els.pickError.hidden = false;
    els.pickError.innerHTML = '';
    var title = document.createElement('b');
    title.textContent = '照片 / 文件没有交到网页';
    var hint = document.createElement('span');
    hint.textContent = message || '选择器已关闭但没有返回文件。请重试，或改用手机系统相机扫码，也可以在浏览器中打开本页。';
    els.pickError.appendChild(title);
    els.pickError.appendChild(hint);
  }

  function hidePickError() {
    if (els.pickError) els.pickError.hidden = true;
  }

  function bindInput(input, label) {
    if (!input) return;
    var lastHandledAt = 0;

    function handle(source) {
      var files = input.files ? Array.prototype.slice.call(input.files) : [];
      if (!files.length) {
        sendEvent('empty', { source: source, label: label });
        showPickError('选择器返回了 0 个文件（' + (label || '文件') + '）。');
        try { input.value = ''; } catch (error) { /* 忽略 */ }
        return;
      }
      try { sessionStorage.removeItem('shuttle.pickOpened'); } catch (error) { /* 忽略 */ }
      sendEvent('pick', { source: source, count: files.length, label: label });
      hidePickError();
      var remaining = files.length;
      enqueue(files, function () {
        remaining -= 1;
        // 等这一批发送完再清空：部分 WebView 在清空 input 后会让 File 对象失效。
        if (remaining <= 0) {
          try { input.value = ''; } catch (error) { /* 忽略 */ }
        }
      });
    }

    input.addEventListener('click', function () {
      try { sessionStorage.setItem('shuttle.pickOpened', '1'); } catch (error) { /* 忽略 */ }
      sendEvent('open', { label: label });
    });
    input.addEventListener('change', function () {
      if (Date.now() - lastHandledAt < 800) return;
      lastHandledAt = Date.now();
      handle('change');
    });
    input.addEventListener('input', function () {
      if (Date.now() - lastHandledAt < 800) return;
      lastHandledAt = Date.now();
      handle('input');
    });
    window.addEventListener('focus', function () {
      // 部分 WebView 不派发 change：选择器关闭、页面回到前台时主动读取一次。
      setTimeout(function () {
        if (!input.files || input.files.length === 0) return;
        if (Date.now() - lastHandledAt < 800) return;
        lastHandledAt = Date.now();
        sendEvent('focus', { count: input.files.length, label: label });
        handle('focus');
      }, 250);
    });
  }

  function loadTargets() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + '/dirs', true);
    xhr.onload = function () {
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (error) { data = null; }
      if (!data || !data.ok || !data.dirs) return;
      for (var index = 0; index < data.dirs.length; index += 1) {
        var entry = data.dirs[index];
        if (!entry || typeof entry.path !== 'string' || entry.path === '') continue;
        var option = document.createElement('option');
        option.value = entry.path;
        option.textContent = '/' + entry.path;
        els.dir.appendChild(option);
      }
    };
    try { xhr.send(); } catch (error) { /* 目录列表不是必需的 */ }
  }

  function ping() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + '/health', true);
    xhr.onload = function () {
      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (error) { data = null; }
      els.status.className = data && data.ok ? 'dot' : 'dot off';
      els.status.title = data && data.ok ? '连接正常' : '连接异常';
    };
    xhr.onerror = function () {
      els.status.className = 'dot off';
      els.status.title = '连接异常';
    };
    try { xhr.send(); } catch (error) { /* 健康检查失败不阻塞上传 */ }
  }

  try {
    initDiagnostics();
    bindInput(els.photos, '照片');
    bindInput(els.files, '文件');
    hidePickError();
    loadTargets();
    ping();
    setInterval(ping, 15000);
  } catch (error) {
    showScriptError(error && error.message ? error.message : '');
  }
})();
</script>
</body>
</html>`
}
