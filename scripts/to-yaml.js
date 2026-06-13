#!/usr/bin/env node
/**
 * to-yaml.js  （工作流① 核心）
 * ─────────────────────────────────────────────────────────
 * 读取 sources.yaml 中的脚本 URL 列表，逐一拉取并执行，
 * 输出完整 Mihomo 配置到 output/<name>.yaml
 *
 * 核心策略：
 *   注入覆盖所有主要地区的虚拟节点，让脚本的地区匹配逻辑正常运行，
 *   生成完整分组骨架。执行完成后，对分组进行后处理：
 *   将硬编码节点名替换为 include-all + filter，确保真实订阅节点能被导入。
 */

"use strict";

const fs    = require("fs");
const path  = require("path");
const https = require("https");
const http  = require("http");
const vm    = require("vm");
const yaml  = require("js-yaml");
const { renderMihomoYaml } = require("./render-yaml");

// ─── CLI ──────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const onlyIdx  = args.indexOf("--only");
const onlyName = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

// ─── 虚拟节点定义 ─────────────────────────────────────────────
// 每个地区至少注入 2 个虚拟节点，触发脚本的地区分类逻辑。
// 节点名包含地区关键词，能被主流脚本的正则命中。
// 执行后这些虚拟节点会被后处理步骤替换掉。
const SEED_PROXIES = [
  // 香港
  { name: "__seed__HK香港01", type: "socks5", server: "127.0.0.1", port: 1 },
  { name: "__seed__HK香港02", type: "socks5", server: "127.0.0.1", port: 2 },
  // 美国
  { name: "__seed__US美国01", type: "socks5", server: "127.0.0.1", port: 3 },
  { name: "__seed__US美国02", type: "socks5", server: "127.0.0.1", port: 4 },
  // 日本
  { name: "__seed__JP日本01", type: "socks5", server: "127.0.0.1", port: 5 },
  { name: "__seed__JP日本02", type: "socks5", server: "127.0.0.1", port: 6 },
  // 韩国
  { name: "__seed__KR韩国01", type: "socks5", server: "127.0.0.1", port: 7 },
  { name: "__seed__KR韩国02", type: "socks5", server: "127.0.0.1", port: 8 },
  // 新加坡
  { name: "__seed__SG新加坡01", type: "socks5", server: "127.0.0.1", port: 9 },
  { name: "__seed__SG新加坡02", type: "socks5", server: "127.0.0.1", port: 10 },
  // 台湾
  { name: "__seed__TW台湾01", type: "socks5", server: "127.0.0.1", port: 11 },
  { name: "__seed__TW台湾02", type: "socks5", server: "127.0.0.1", port: 12 },
  // 英国
  { name: "__seed__GB英国01", type: "socks5", server: "127.0.0.1", port: 13 },
  { name: "__seed__GB英国02", type: "socks5", server: "127.0.0.1", port: 14 },
  // 德国
  { name: "__seed__DE德国01", type: "socks5", server: "127.0.0.1", port: 15 },
  { name: "__seed__DE德国02", type: "socks5", server: "127.0.0.1", port: 16 },
  // 马来西亚
  { name: "__seed__MY马来西亚01", type: "socks5", server: "127.0.0.1", port: 17 },
  { name: "__seed__MY马来西亚02", type: "socks5", server: "127.0.0.1", port: 18 },
  // 土耳其
  { name: "__seed__TK土耳其01", type: "socks5", server: "127.0.0.1", port: 19 },
  { name: "__seed__TK土耳其02", type: "socks5", server: "127.0.0.1", port: 20 },
  // 加拿大
  { name: "__seed__CA加拿大01", type: "socks5", server: "127.0.0.1", port: 21 },
  { name: "__seed__CA加拿大02", type: "socks5", server: "127.0.0.1", port: 22 },
  // 澳大利亚
  { name: "__seed__AU澳大利亚01", type: "socks5", server: "127.0.0.1", port: 23 },
  { name: "__seed__AU澳大利亚02", type: "socks5", server: "127.0.0.1", port: 24 },
];

// 虚拟节点名集合，用于后处理识别
const SEED_NAMES = new Set(SEED_PROXIES.map(p => p.name));

// ─── 地区节点 → filter 正则映射 ──────────────────────────────
// 与主流脚本（YaNet/sing-mix 等）的地区定义保持一致
const REGION_FILTERS = [
  { keywords: ["香港", "HK", "hk", "hongkong", "hong kong", "🇭🇰"],
    filter: "(?i)港|🇭🇰|\\bHK\\b|hongkong|hong.?kong" },
  { keywords: ["美国", "US", "us", "usa", "united states", "🇺🇸"],
    filter: "(?i)(?!.*aus)(美|🇺🇸|\\bUS\\b|\\bUSA\\b|united.?states)" },
  { keywords: ["日本", "JP", "jp", "japan", "🇯🇵"],
    filter: "(?i)日本|🇯🇵|\\bJP\\b|japan" },
  { keywords: ["韩国", "KR", "kr", "korea", "🇰🇷"],
    filter: "(?i)韩|🇰🇷|\\bKR\\b|korea" },
  { keywords: ["新加坡", "SG", "sg", "singapore", "🇸🇬"],
    filter: "(?i)新加坡|🇸🇬|\\bSG\\b|singapore" },
  { keywords: ["台湾", "TW", "tw", "taiwan", "🇹🇼"],
    filter: "(?i)台湾|台灣|🇹🇼|\\bTW\\b|taiwan" },
  { keywords: ["英国", "GB", "gb", "uk", "united kingdom", "🇬🇧"],
    filter: "(?i)英|🇬🇧|\\bUK\\b|\\bGB\\b|united.?kingdom" },
  { keywords: ["德国", "DE", "de", "germany", "🇩🇪"],
    filter: "(?i)德|🇩🇪|\\bDE\\b|germany" },
  { keywords: ["马来西亚", "MY", "my", "malaysia", "🇲🇾"],
    filter: "(?i)马来|🇲🇾|\\bMY\\b|malaysia" },
  { keywords: ["土耳其", "TK", "tk", "turkey", "🇹🇷"],
    filter: "(?i)土耳其|🇹🇷|\\bTR\\b|turkey" },
  { keywords: ["加拿大", "CA", "ca", "canada", "🇨🇦"],
    filter: "(?i)加拿大|🇨🇦|\\bCA\\b|canada" },
  { keywords: ["澳大利亚", "AU", "au", "australia", "🇦🇺"],
    filter: "(?i)澳|🇦🇺|\\bAU\\b|australia" },
];

// 根据一批节点名，推断这个分组对应的地区 filter
function inferFilter(proxyNames) {
  // 去掉虚拟节点前缀后提取关键词
  const sample = proxyNames
    .filter(n => SEED_NAMES.has(n))
    .map(n => n.replace("__seed__", ""));

  for (const region of REGION_FILTERS) {
    if (sample.some(s => region.keywords.some(k => s.includes(k)))) {
      return region.filter;
    }
  }
  return null;
}

// ─── 后处理：把虚拟节点替换为 include-all + filter ────────────
function postProcess(result) {
  // 1. 移除所有虚拟节点（从 proxies 数组）
  if (Array.isArray(result.proxies)) {
    result.proxies = result.proxies.filter(p => !SEED_NAMES.has(p.name));
  }

  // 2. 处理每个分组
  if (!Array.isArray(result["proxy-groups"])) return result;

  const groupNames = new Set(result["proxy-groups"].map(g => g.name));
  const staticNames = new Set((result.proxies || []).map(p => p.name));
  // DIRECT/REJECT 及各种内置关键字
  const builtins = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "no-resolve"]);

  result["proxy-groups"] = result["proxy-groups"].map(group => {
    const proxies = group.proxies || [];

    // 分离：虚拟节点 vs 静态引用（其他分组名/DIRECT/REJECT/静态节点）
    const seedNodes  = proxies.filter(n => SEED_NAMES.has(n));
    const staticRefs = proxies.filter(n =>
      !SEED_NAMES.has(n) && (groupNames.has(n) || staticNames.has(n) || builtins.has(n))
    );

    if (seedNodes.length === 0) {
      // 没有虚拟节点，不需要改动（纯引用其他分组的选择器）
      return group;
    }

    // 推断该分组的地区 filter
    const filter = inferFilter(seedNodes);

    if (filter) {
      // 地区分组：替换为 include-all + filter
      const newGroup = { ...group };
      delete newGroup.proxies;
      newGroup["include-all"] = true;
      newGroup.filter = filter;
      // 保留静态引用（如手动放在首位的其他分组名）
      if (staticRefs.length > 0) {
        newGroup.proxies = staticRefs;
      }
      return newGroup;
    } else {
      // 无法识别地区（如"其他节点"兜底组）→ 也用 include-all，不加 filter
      const newGroup = { ...group };
      delete newGroup.proxies;
      newGroup["include-all"] = true;
      if (staticRefs.length > 0) {
        newGroup.proxies = staticRefs;
      }
      return newGroup;
    }
  });

  return result;
}

// ─── HTTP fetch ───────────────────────────────────────────────
function fetch(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    if (redirects === 0) return reject(new Error("Too many redirects: " + url));
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 30_000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).href;
        res.resume();
        return fetch(next, redirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} — ${url}`));
      }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout: " + url)); });
  });
}

// ─── 基础配置骨架 ─────────────────────────────────────────────
function makeBaseConfig(providerDefs) {
  const providers = {};
  for (const p of (providerDefs || [])) {
    const def = {
      type:     p.type     || "http",
      url:      p.url,
      interval: p.interval || 86400,
      "health-check": p["health-check"] || {
        enable: true, url: "https://www.gstatic.com/generate_204", interval: 300,
      },
    };
    if (p.override) def.override = p.override;
    if (p.path)     def.path     = p.path;
    providers[p.name] = def;
  }

  return {
    "mixed-port": 7890,
    "allow-lan":  false,
    mode:         "rule",
    "log-level":  "info",
    ipv6:         false,
    "external-controller": "127.0.0.1:9090",
    dns: {
      enable: true, ipv6: false,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.0/15",
      "fake-ip-filter": ["*.lan", "*.local"],
      nameserver: ["https://doh.pub/dns-query", "https://dns.alidns.com/dns-query"],
      fallback:   ["https://1.0.0.1/dns-query", "https://8.8.4.4/dns-query"],
      "fallback-filter": { geoip: true, "geoip-code": "CN", ipcidr: ["240.0.0.0/4"] },
    },
    tun: {
      enable: false, stack: "system",
      "dns-hijack": ["any:53"], "auto-route": true, "auto-detect-interface": true,
    },
    "proxy-providers": providers,
    // 注入虚拟节点，让脚本的地区匹配逻辑生效
    proxies: [...SEED_PROXIES],
    "proxy-groups": [],
    rules: [],
  };
}

// ─── JS 脚本执行 ──────────────────────────────────────────────
function runJs(code, base) {
  const sandbox = {
    module:     { exports: {} },
    exports:    {},
    console:    { log: () => {}, warn: () => {}, error: () => {} },
    require:    () => ({}),
    globalThis: {},
  };
  vm.createContext(sandbox);

  try {
    vm.runInContext(code, sandbox, { timeout: 15_000 });
  } catch (e) {
    throw new Error("JS 执行出错: " + e.message);
  }

  let fn =
    (typeof sandbox.module.exports === "function" ? sandbox.module.exports : null) ||
    sandbox.module.exports?.main ||
    sandbox.exports?.main ||
    sandbox.main;

  if (typeof fn !== "function") {
    try {
      const ctx = {};
      vm.createContext(ctx);
      vm.runInContext(code, ctx, { timeout: 15_000 });
      fn = ctx.main;
    } catch (_) {}
  }

  if (typeof fn !== "function") throw new Error("找不到 main(config) 函数");

  const result = fn(JSON.parse(JSON.stringify(base)));
  if (!result || typeof result !== "object") throw new Error("main(config) 未返回有效对象");
  return result;
}

// ─── YAML patch 应用 ──────────────────────────────────────────
function applyPatch(base, patch) {
  if (typeof patch !== "object" || patch === null) return patch;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const rawKey of Object.keys(patch)) {
    if (rawKey.endsWith("!")) { out[rawKey.slice(0, -1)] = patch[rawKey]; continue; }
    if (rawKey.startsWith("+")) {
      const k = rawKey.slice(1);
      out[k] = [...(patch[rawKey] || []), ...(Array.isArray(out[k]) ? out[k] : [])];
      continue;
    }
    if (rawKey.endsWith("+")) {
      const k = rawKey.slice(0, -1);
      out[k] = [...(Array.isArray(out[k]) ? out[k] : []), ...(patch[rawKey] || [])];
      continue;
    }
    const val = patch[rawKey];
    if (typeof val === "object" && val !== null && !Array.isArray(val) &&
        typeof out[rawKey] === "object" && out[rawKey] !== null && !Array.isArray(out[rawKey])) {
      out[rawKey] = applyPatch(out[rawKey], val);
    } else {
      out[rawKey] = val;
    }
  }
  return out;
}

// ─── 主流程 ───────────────────────────────────────────────────
async function main() {
  const root      = process.cwd();
  const srcFile   = path.join(root, "sources.yaml");
  const outputDir = path.join(root, "output");

  if (!fs.existsSync(srcFile)) { console.error("❌  找不到 sources.yaml"); process.exit(1); }
  fs.mkdirSync(outputDir, { recursive: true });

  const sources = yaml.load(fs.readFileSync(srcFile, "utf8"));
  const scripts = (sources.scripts || []).filter(s => !onlyName || s.name === onlyName);

  if (scripts.length === 0) {
    console.error(onlyName ? `❌  找不到 name=${onlyName}` : "❌  scripts 列表为空");
    process.exit(1);
  }

  let ok = 0, fail = 0;

  for (const entry of scripts) {
    const { name, type, url, description = "" } = entry;
    console.log(`\n▶  [${name}]  type=${type}  ${description}`);
    console.log(`   URL: ${url}`);

    try {
      const code = await fetch(url);
      console.log(`   ✔ 拉取成功 (${(code.length / 1024).toFixed(1)} KB)`);

      const base = makeBaseConfig(sources.proxy_providers);
      let result;

      if (type === "js") {
        result = runJs(code, base);
        // 后处理：虚拟节点 → include-all + filter
        result = postProcess(result);
        console.log(`   ✔ 后处理完成，分组数: ${(result["proxy-groups"] || []).length}`);
      } else if (type === "yaml") {
        const patch = yaml.load(code);
        if (!patch || typeof patch !== "object") throw new Error("YAML patch 为空或格式错误");
        result = applyPatch(base, patch);
        // YAML patch 通常已经是 include-all 格式，不需要后处理
        // 但仍清理可能残留的虚拟节点
        if (Array.isArray(result.proxies)) {
          result.proxies = result.proxies.filter(p => !SEED_NAMES.has(p.name));
        }
      } else {
        throw new Error(`未知 type="${type}"，只支持 js / yaml`);
      }

      // 确保 proxy-providers 不被脚本清空
      if (!result["proxy-providers"] || Object.keys(result["proxy-providers"]).length === 0) {
        result["proxy-providers"] = makeBaseConfig(sources.proxy_providers)["proxy-providers"];
        console.log(`   ⚠  proxy-providers 被脚本清空，已从 sources.yaml 补回`);
      }

      // 验证分组里是否有残留虚拟节点
      const groups = result["proxy-groups"] || [];
      let leaked = 0;
      for (const g of groups) {
        for (const p of (g.proxies || [])) {
          if (SEED_NAMES.has(p)) leaked++;
        }
      }
      if (leaked > 0) console.warn(`   ⚠  仍有 ${leaked} 处虚拟节点引用未清理，请检查`);

      const rendered = renderMihomoYaml(result, {
        name, url, description,
        generatedAt: new Date().toISOString(),
      });

      const outPath = path.join(outputDir, `${name}.yaml`);
      fs.writeFileSync(outPath, rendered);
      console.log(`   ✅  → output/${name}.yaml`);
      ok++;

    } catch (err) {
      console.error(`   ❌  失败: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${"─".repeat(56)}`);
  console.log(`完成: ${ok} 成功 / ${fail} 失败 / ${scripts.length} 总计`);
  if (fail > 0) process.exit(1);
}

main();
