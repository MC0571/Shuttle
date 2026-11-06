# 文件穿梭机 · Shuttle

DeepSeek Harness（DSH）插件：电脑显示二维码，手机扫码即可把照片、视频和任意文件**直接传到这台电脑**。数据只在同一局域网内传输，不经过任何中转服务器，手机端零安装。

插件本体位于 [`plugin/`](plugin/)，安装标识（npm 包名）为 `shuttle-dsh`。

## 仓库结构

```
.
├── plugin/                  # 可安装的 DSH bundle
│   ├── index.js             # Host 半：局域网接收服务 + 同源管理 API
│   ├── client.js            # Client 半：DSH Web UI 页面（二维码 / 文件管理）
│   ├── lib/                 # 手机上传页、文件系统操作、二维码、网络工具
│   ├── vendor/qrcode.mjs    # 本地二维码生成（MIT，见 THIRD_PARTY_NOTICES）
│   ├── locale/              # 插件显示名与描述（中 / 英）
│   └── cordis.patch.yml     # bundle patch（插件行）
├── tests/integration.mjs    # 集成测试（真实 HTTP 服务 + 临时目录）
├── CHANGELOG.md             # 版本记录
└── README.md
```

## 安装 / 卸载

```text
plugin_manager install_bundle target=/Users/mc/dev/files-remote/plugin
plugin_manager remove_bundle target=shuttle-dsh
```

安装后 DSH 侧边栏出现「文件穿梭机」入口。首次使用需允许系统防火墙的「接受传入连接」。刷新 Web UI 页面以加载新的前端模块。

## 版本与发布

- 版本号只维护一处：`plugin/package.json` 的 `version`；发布时同步更新 `CHANGELOG.md`。
- 每个发布对应一个 Git tag：`v<version>`（例如 `v0.1.7`）。
- 发布流程：

```bash
# 1. 修改 plugin/package.json 的 version，并更新 CHANGELOG.md
# 2. 提交
git add -A && git commit -m "feat: ..." 
# 3. 打 tag（与 package.json 保持一致）
VERSION=$(node -p "require('./plugin/package.json').version")
git tag -a "v$VERSION" -m "shuttle-dsh $VERSION"
# 4. 让 DSH 重新加载本地 link 安装
#    plugin_manager remove_bundle target=shuttle-dsh
#    plugin_manager install_bundle target=<仓库>/plugin
```

## 回滚

仓库使用 Git 管理，可随时回到某个已发布版本：

```bash
git log --oneline --decorate      # 查看历史
git checkout v0.1.7               # 临时检出到某个版本
git checkout -b fix/xxx v0.1.7    # 或基于旧版本开修复分支
```

> 注意：DSH 以 `link:` 方式安装本目录，工作区文件变化会直接影响正在运行的插件；回滚后需要重新加载插件（remove + install，或重启 DSH）。

## 开发提示

- 手机上传页由 Host 端动态返回（`lib/phone-page.js`），完全自包含，无外部资源。
- 手机端脚本刻意保持 ES5 语法，兼容微信内置浏览器旧内核。
- 二维码在 Host 端本地生成（`lib/qr.js` 调用 `vendor/qrcode.mjs`），不依赖任何外部服务。
- 改动后至少运行一次集成测试（见下）。

### 测试

```bash
node tests/integration.mjs
```

测试会以临时目录作为接收目录，启动真实的局域网监听与同源管理 API，覆盖上传、子目录、重名、列目录、重命名、删除、路径穿越、token 轮换等。
