# Mihomo Toolbox

两条完全独立的工作流，互不依赖。

```
.
├── sources.yaml          ← 工作流① 的唯一配置（脚本来源 + proxy-providers 模板）
├── input/                ← 工作流② 的输入目录（手动放入完整 YAML）
│   └── <name>.yaml
├── output/               ← 工作流① 的输出（完整 Mihomo YAML）
│   └── <name>.yaml
├── overrides/            ← 工作流② 的输出（通用覆写 JS）
│   └── <name>.js
├── scripts/
│   ├── to-yaml.js        ← 工作流① 核心
│   └── to-override.js    ← 工作流② 核心
└── .github/workflows/
    ├── to-yaml.yml       ← 工作流①
    └── to-override.yml   ← 工作流②
```

---

## 工作流① — 覆写脚本 → 完整 YAML

**输入**：`sources.yaml` 中列出的第三方脚本 raw URL（JS 或 YAML patch）

**输出**：`output/<name>.yaml`（完整自包含 Mihomo 配置，含 proxy-providers）

**触发**：Actions → `① 覆写脚本 → 完整 Mihomo YAML` → Run workflow

**新增脚本**：在 `sources.yaml` 的 `scripts:` 下追加：
```yaml
- name: my-script
  type: js          # js 或 yaml
  url: https://raw.githubusercontent.com/...
  description: "描述"
```

**填写订阅地址**：编辑 `sources.yaml` 中 `proxy_providers:` 块的 `url` 字段。

---

## 工作流② — 完整 YAML → 覆写 JS

**输入**：`input/<name>.yaml`（你的完整 Mihomo 配置，手动放入）

**输出**：`overrides/<name>.js`（通用覆写脚本）

**触发**：Actions → `② 完整 YAML → 覆写 JS` → Run workflow

**兼容客户端**：FlClash v0.8.85+ / Mihomo Party / Clash Party / Clash Verge Rev / Sparkle

**使用生成的覆写文件**：
- FlClash：工具 → 高级配置 → 脚本 → 添加 URL（填 raw 链接）→ 配置卡片 → 覆写 → 脚本模式
- Mihomo Party：覆写页面 → 导入 URL → 绑定到对应订阅
- Clash Verge Rev：订阅 → 编辑 → 脚本（扩展脚本）

**覆写内容**：proxy-groups（原样）、rules、rule-providers、dns、sniffer、tun（enable=false）、hosts 等

**不覆写**：端口、allow-lan、mode、log-level、管理面板、GEO 数据源、认证信息

---

## 为什么不会 loop

工作流② 生成的覆写脚本保留了源 YAML 中分组的 `include-all: true` + `filter:` 字段，节点由 Mihomo 内核在运行时从订阅的 `proxy-providers` 自动填充，**不硬编码任何节点名**。源 YAML 里 `proxies:` 定义的静态节点（如 `直接连接`、`DNS劫持`）会被主动注入，防止分组引用悬空。
