#!/usr/bin/env node
/**
 * render-yaml.js
 * 自定义 Mihomo YAML 格式化渲染器
 * ─────────────────────────────────────────────────────────
 * js-yaml dump() 不支持锚点和注释，本模块手动生成带锚点、
 * 分区注释、空行分隔的可视化 YAML 文本。
 *
 * 输出风格参考 666OS/YYDS 配置：
 *   - 锚点：BaseProvider / BaseUT / BaseFB / Filter* / Select*
 *   - 分区标题注释：==================== 区块名 ====================
 *   - 区块之间空行分隔
 *   - proxy-providers / proxy-groups 每项一行（紧凑 flow 格式）
 *   - rules 每条一行
 */

"use strict";

// ─── 工具函数 ─────────────────────────────────────────────────

/** 把值序列化为单行 YAML flow 格式（用于锚点 / 紧凑列表项）*/
function flow(val) {
  if (val === null || val === undefined) return "~";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number")  return String(val);
  if (typeof val === "string") {
    // 需要引号的情况：含特殊字符、以特殊字符开头、纯数字字符串、含冒号空格
    if (/[:{}\[\],#&*!|>'"%@`]/.test(val) ||
        /^\s|\s$/.test(val) ||
        /^[\-?:]/.test(val) ||
        val === "" ||
        /^\d+$/.test(val) ||
        val.includes(": ")) {
      return "'" + val.replace(/'/g, "''") + "'";
    }
    return val;
  }
  if (Array.isArray(val)) {
    return "[" + val.map(flow).join(", ") + "]";
  }
  if (typeof val === "object") {
    const parts = Object.entries(val).map(([k, v]) => `${k}: ${flow(v)}`);
    return "{" + parts.join(", ") + "}";
  }
  return String(val);
}

/** 把字符串值转为 YAML 块标量或带引号的内联值 */
function scalarStr(val) {
  if (typeof val !== "string") return flow(val);
  if (val.includes("\n")) return "|-\n" + val.split("\n").map(l => "  " + l).join("\n");
  if (/[:{}\[\],#&*!|>'"%@`]/.test(val) || /^\s|\s$/.test(val) || val === "") {
    return "'" + val.replace(/'/g, "''") + "'";
  }
  return val;
}

/** 生成分区标题注释行 */
function section(title) {
  const line = `# ${"=".repeat(20)} ${title} ${"=".repeat(20)}`;
  return `\n${line}\n`;
}

/** 把对象序列化为多行 YAML block（缩进 indent 格 ）*/
function dumpBlock(obj, indent = 0) {
  if (obj === null || obj === undefined) return "~\n";
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]\n";
    return obj.map(item => {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const lines = dumpBlock(item, indent + 2);
        return " ".repeat(indent) + "- " + lines.trimStart();
      }
      return " ".repeat(indent) + "- " + flow(item) + "\n";
    }).join("");
  }
  if (typeof obj === "object") {
    return Object.entries(obj).map(([k, v]) => {
      const key = " ".repeat(indent) + k + ":";
      if (v === null || v === undefined) return key + " ~\n";
      if (typeof v === "boolean" || typeof v === "number") return key + " " + v + "\n";
      if (typeof v === "string") return key + " " + scalarStr(v) + "\n";
      if (Array.isArray(v)) {
        if (v.length === 0) return key + " []\n";
        return key + "\n" + dumpBlock(v, indent + 2);
      }
      return key + "\n" + dumpBlock(v, indent + 2);
    }).join("");
  }
  return flow(obj) + "\n";
}

// ─── 锚点提取 ─────────────────────────────────────────────────

/**
 * 从 proxy-groups 中提取可复用的锚点模板。
 * 策略：
 *   - BaseUT / BaseFB / BaseUT2：url-test / fallback 类型的 include-all 分组共同属性
 *   - Filter*：各地区分组的 filter 正则
 *   - Select*：主策略组的 proxies 列表
 */
function extractAnchors(groups) {
  const anchors = {};
  const filterMap = {};    // filter 字符串 → 锚点名
  const selectMap = {};    // JSON(proxies) → 锚点名

  // 收集 url-test 类型的 include-all 分组的公共属性作为 BaseUT
  const utGroups = groups.filter(g =>
    g.type === "url-test" && g["include-all"] && g.filter
  );
  if (utGroups.length >= 2) {
    // 取第一个作为模板，提取公共字段
    const sample = utGroups[0];
    const base = {};
    const commonKeys = ["type", "interval", "lazy", "url", "tolerance", "hidden",
                        "empty-fallback", "max-failed-times", "timeout"];
    for (const k of commonKeys) {
      if (sample[k] !== undefined) {
        // 检查是否所有 ut 分组都有相同值
        const allSame = utGroups.every(g => JSON.stringify(g[k]) === JSON.stringify(sample[k]));
        if (allSame) base[k] = sample[k];
      }
    }
    if (Object.keys(base).length > 1) {
      anchors["BaseUT"] = base;
    }
  }

  // 收集 fallback 类型的公共属性作为 BaseFB
  const fbGroups = groups.filter(g =>
    g.type === "fallback" && g["include-all"] && g.filter
  );
  if (fbGroups.length >= 2) {
    const sample = fbGroups[0];
    const base = {};
    const commonKeys = ["type", "interval", "lazy", "url", "hidden", "empty-fallback"];
    for (const k of commonKeys) {
      if (sample[k] !== undefined) {
        const allSame = fbGroups.every(g => JSON.stringify(g[k]) === JSON.stringify(sample[k]));
        if (allSame) base[k] = sample[k];
      }
    }
    if (Object.keys(base).length > 1) anchors["BaseFB"] = base;
  }

  // 提取地区 filter 作为 Filter* 锚点
  const regionMap = [
    ["HK", /港|hk|hong/i],
    ["TW", /台|tw|taiwan/i],
    ["JP", /日|jp|japan/i],
    ["SG", /新加坡|坡|sg|sing/i],
    ["KR", /韩|kr|korea/i],
    ["US", /美|us|united.?states/i],
    ["EU", /欧|eu|europe|德|法|英|荷/i],
    ["CA", /加拿大|ca|canada/i],
    ["AU", /澳|au|australia/i],
    ["DE", /德|de|germany/i],
    ["GB", /英|gb|uk|united.?kingdom/i],
    ["FR", /法|fr|france/i],
    ["NL", /荷|nl|netherlands/i],
    ["MY", /马来|my|malaysia/i],
    ["TR", /土耳其|tr|turkey/i],
    ["OT", /other|冷门|其他/i],
    ["AL", /all|全部|手动|全球/i],
  ];

  for (const g of groups) {
    if (!g.filter || filterMap[g.filter]) continue;
    for (const [code, re] of regionMap) {
      const anchorName = "Filter" + code;
      if (!anchors[anchorName] && re.test(g.filter)) {
        anchors[anchorName] = g.filter;
        filterMap[g.filter] = anchorName;
        break;
      }
    }
  }

  // 提取 select 类型主策略组的 proxies 作为 Select* 锚点
  const selectGroups = groups.filter(g =>
    g.type === "select" && Array.isArray(g.proxies) && g.proxies.length >= 3 &&
    !g["include-all"]
  );
  const selectSig = {};
  for (const g of selectGroups) {
    const sig = JSON.stringify(g.proxies);
    if (!selectSig[sig]) selectSig[sig] = [];
    selectSig[sig].push(g.name);
  }
  let selectIdx = 0;
  const selectLabels = ["AL", "One", "US", "DC", "HK", "JP", "SG"];
  for (const [sig, names] of Object.entries(selectSig)) {
    if (names.length >= 2) {  // 至少被 2 个分组共用才值得做锚点
      const label = selectLabels[selectIdx++] || String(selectIdx);
      anchors["Select" + label] = { type: "select", proxies: JSON.parse(sig) };
    }
  }

  return { anchors, filterMap, selectMap: selectSig };
}

// ─── 渲染各分区 ───────────────────────────────────────────────

function renderAnchors(anchors) {
  if (Object.keys(anchors).length === 0) return "";
  let out = section("锚点配置");
  for (const [name, val] of Object.entries(anchors)) {
    if (typeof val === "string") {
      // filter 字符串锚点
      out += `${name}: &${name} ${scalarStr(val)}\n`;
    } else if (Array.isArray(val.proxies) && Object.keys(val).length === 2) {
      // Select 锚点
      out += `${name}: &${name} {type: select, proxies: ${flow(val.proxies)}}\n`;
    } else {
      // Base 锚点（BaseUT / BaseFB 等）
      out += `${name}: &${name} ${flow(val)}\n`;
    }
  }
  return out + "\n";
}

function renderProxyProviders(providers) {
  if (!providers || Object.keys(providers).length === 0) return "";
  let out = section("代理提供者");
  out += "proxy-providers:\n";
  for (const [name, def] of Object.entries(providers)) {
    const { "health-check": hc, override: ov, ...rest } = def;
    const parts = Object.entries(rest).map(([k, v]) => `${k}: ${flow(v)}`);
    if (hc) parts.push("health-check: " + flow(hc));
    if (ov) parts.push("override: " + flow(ov));
    out += `  ${name}: {${parts.join(", ")}}\n`;
  }
  return out + "\n";
}

function renderCoreConfig(result) {
  // 核心字段顺序
  const coreKeys = [
    "mode", "port", "socks-port", "redir-port", "mixed-port", "tproxy-port",
    "ipv6", "allow-lan", "bind-address",
    "unified-delay", "tcp-concurrent", "log-level",
    "find-process-mode", "keep-alive-interval", "keep-alive-idle",
    "global-ua", "etag-support", "disable-keep-alive",
  ];

  let out = section("核心配置");
  for (const k of coreKeys) {
    if (result[k] !== undefined) {
      out += `${k}: ${flow(result[k])}\n`;
    }
  }

  // authentication / skip-auth-prefixes
  if (result.authentication) {
    out += `authentication:\n`;
    for (const a of result.authentication) out += `  - ${scalarStr(a)}\n`;
  }
  if (result["skip-auth-prefixes"]) {
    out += `skip-auth-prefixes:\n`;
    for (const a of result["skip-auth-prefixes"]) out += `  - ${scalarStr(a)}\n`;
  }

  // experimental
  if (result.experimental) {
    out += `experimental:\n` + dumpBlock(result.experimental, 2);
  }

  // 管理面板相关
  const panelKeys = ["external-ui-url", "external-ui-name", "external-ui",
                     "external-controller", "external-controller-cors", "secret"];
  let hasPanelHeader = false;
  for (const k of panelKeys) {
    if (result[k] !== undefined) {
      if (!hasPanelHeader) { out += `\n# 管理面板\n`; hasPanelHeader = true; }
      if (typeof result[k] === "object") {
        out += `${k}:\n` + dumpBlock(result[k], 2);
      } else {
        out += `${k}: ${flow(result[k])}\n`;
      }
    }
  }

  // GEO 数据
  const geoKeys = ["geodata-mode", "geodata-loader", "geo-auto-update",
                   "geo-update-interval", "geox-url"];
  let hasGeoHeader = false;
  for (const k of geoKeys) {
    if (result[k] !== undefined) {
      if (!hasGeoHeader) { out += `\n# GEO 数据\n`; hasGeoHeader = true; }
      if (typeof result[k] === "object") {
        out += `${k}:\n` + dumpBlock(result[k], 2);
      } else {
        out += `${k}: ${flow(result[k])}\n`;
      }
    }
  }

  // profile / hosts / ntp / listeners / tunnels
  for (const k of ["profile", "hosts", "ntp", "listeners", "tunnels"]) {
    if (result[k] !== undefined) {
      out += `${k}:\n` + dumpBlock(result[k], 2);
    }
  }

  return out + "\n";
}

function renderSniffer(sniffer) {
  if (!sniffer) return "";
  let out = section("流量嗅探");
  out += "sniffer:\n" + dumpBlock(sniffer, 2);
  return out + "\n";
}

function renderTun(tun) {
  if (!tun) return "";
  let out = section("TUN 模式");
  out += "tun:\n" + dumpBlock(tun, 2);
  return out + "\n";
}

function renderDns(dns) {
  if (!dns) return "";
  let out = section("DNS 配置");
  out += "dns:\n" + dumpBlock(dns, 2);
  return out + "\n";
}

function renderProxies(proxies) {
  if (!proxies || proxies.length === 0) return "";
  let out = section("静态代理节点");
  out += "proxies:\n";
  for (const p of proxies) {
    out += "  - " + flow(p) + "\n";
  }
  return out + "\n";
}

function renderProxyGroups(groups, anchors, filterMap) {
  if (!groups || groups.length === 0) return "";

  // 把锚点值反查为锚点名
  const filterToAnchor = {};
  for (const [name, val] of Object.entries(anchors)) {
    if (name.startsWith("Filter") && typeof val === "string") {
      filterToAnchor[val] = name;
    }
  }
  const selectProxiesToAnchor = {};
  for (const [name, val] of Object.entries(anchors)) {
    if (name.startsWith("Select")) {
      selectProxiesToAnchor[JSON.stringify(val.proxies)] = name;
    }
  }
  const baseKeys = { BaseUT: true, BaseFB: true };

  let out = section("策略组");
  out += "proxy-groups:\n";

  for (const g of groups) {
    const { filter, proxies, type, "include-all": ia, ...rest } = g;

    const parts = [`name: ${scalarStr(g.name)}`];

    // 判断是否可用 Base* 锚点展开
    let usedBase = null;
    for (const baseName of ["BaseUT", "BaseFB"]) {
      const base = anchors[baseName];
      if (!base) continue;
      if (base.type !== type) continue;
      // 检查当前分组是否包含所有 base 字段且值相同
      const match = Object.entries(base).every(([k, v]) =>
        JSON.stringify(g[k]) === JSON.stringify(v)
      );
      if (match) { usedBase = baseName; break; }
    }

    // type 始终显式输出（即使用了 Base 锚点也保留，方便阅读）
    parts.push(`type: ${flow(type)}`);

    if (usedBase) {
      parts.push(`<<: *${usedBase}`);
    } else {
      // 逐字段输出（跳过 type，已在上方输出）
      const fieldOrder = ["interval", "lazy", "timeout", "url",
                          "tolerance", "max-failed-times", "hidden",
                          "empty-fallback", "strategy"];
      for (const k of fieldOrder) {
        if (rest[k] !== undefined) parts.push(`${k}: ${flow(rest[k])}`);
      }
    }

    // include-all
    if (ia) parts.push("include-all: true");

    // filter
    if (filter) {
      const anchorName = filterToAnchor[filter];
      parts.push(anchorName ? `filter: *${anchorName}` : `filter: ${scalarStr(filter)}`);
    }

    // proxies
    if (proxies && proxies.length > 0) {
      const sig = JSON.stringify(proxies);
      const anchorName = selectProxiesToAnchor[sig];
      if (anchorName && !usedBase) {
        // 用 Select 锚点展开
        parts.push(`<<: *${anchorName}`);
      } else {
        parts.push(`proxies: ${flow(proxies)}`);
      }
    }

    // 剩余字段（icon 等）
    const handledKeys = new Set(["name", "type", "interval", "lazy", "timeout", "url",
      "tolerance", "max-failed-times", "hidden", "empty-fallback", "strategy",
      "include-all", "filter", "proxies"]);
    for (const [k, v] of Object.entries(g)) {
      if (!handledKeys.has(k)) parts.push(`${k}: ${flow(v)}`);
    }

    out += `  - {${parts.join(", ")}}\n`;
  }

  return out + "\n";
}

function renderRules(rules) {
  if (!rules || rules.length === 0) return "";
  let out = section("路由规则");
  out += "rules:\n";
  for (const r of rules) {
    out += `  - ${r}\n`;
  }
  return out + "\n";
}

function renderRuleProviders(providers) {
  if (!providers || Object.keys(providers).length === 0) return "";

  // 提取公共行为模板作为锚点
  const behaviors = {};
  for (const [, def] of Object.entries(providers)) {
    const key = `${def.type}|${def.behavior}|${def.format}`;
    if (!behaviors[key]) behaviors[key] = { type: def.type, behavior: def.behavior, format: def.format, interval: def.interval };
  }

  // 生成 BehaviorDN / BehaviorIP 锚点
  const behaviorAnchors = {};
  for (const [key, val] of Object.entries(behaviors)) {
    if (val.behavior === "domain") behaviorAnchors["BehaviorDN"] = val;
    else if (val.behavior === "ipcidr") behaviorAnchors["BehaviorIP"] = val;
    else behaviorAnchors[`Behavior${Object.keys(behaviorAnchors).length}`] = val;
  }

  let out = section("规则集");

  // 输出行为锚点
  for (const [name, val] of Object.entries(behaviorAnchors)) {
    out += `${name}: &${name} ${flow(val)}\n`;
  }
  out += "\n";

  out += "rule-providers:\n";

  // 按 domain / ipcidr 分组输出
  const domainProviders = Object.entries(providers).filter(([, d]) => d.behavior !== "ipcidr");
  const ipProviders     = Object.entries(providers).filter(([, d]) => d.behavior === "ipcidr");

  if (domainProviders.length > 0) {
    out += `  # ── 域名规则\n`;
    for (const [name, def] of domainProviders) {
      const anchorName = Object.entries(behaviorAnchors).find(([, v]) =>
        v.type === def.type && v.behavior === def.behavior && v.format === def.format
      )?.[0];
      const url = def.url || def.path || "";
      const extra = Object.entries(def)
        .filter(([k]) => !["type","behavior","format","interval","url","path"].includes(k))
        .map(([k, v]) => `${k}: ${flow(v)}`).join(", ");
      if (anchorName) {
        out += `  ${name}: {<<: *${anchorName}, url: ${scalarStr(url)}${extra ? ", " + extra : ""}}\n`;
      } else {
        out += `  ${name}: ${flow(def)}\n`;
      }
    }
  }

  if (ipProviders.length > 0) {
    out += `  # ── IP 规则\n`;
    for (const [name, def] of ipProviders) {
      const anchorName = Object.entries(behaviorAnchors).find(([, v]) =>
        v.type === def.type && v.behavior === def.behavior && v.format === def.format
      )?.[0];
      const url = def.url || def.path || "";
      const extra = Object.entries(def)
        .filter(([k]) => !["type","behavior","format","interval","url","path"].includes(k))
        .map(([k, v]) => `${k}: ${flow(v)}`).join(", ");
      if (anchorName) {
        out += `  ${name}: {<<: *${anchorName}, url: ${scalarStr(url)}${extra ? ", " + extra : ""}}\n`;
      } else {
        out += `  ${name}: ${flow(def)}\n`;
      }
    }
  }

  return out + "\n# ==================== EOF ====================\n";
}

// ─── 主导出函数 ───────────────────────────────────────────────

/**
 * 把 Mihomo 配置对象渲染为格式化 YAML 字符串
 * @param {object} result  - 完整 Mihomo 配置
 * @param {object} meta    - { name, url, description, generatedAt }
 */
function renderMihomoYaml(result, meta = {}) {
  const { name = "", url = "", description = "", generatedAt = new Date().toISOString() } = meta;

  // 提取锚点
  const groups = result["proxy-groups"] || [];
  const { anchors, filterMap } = extractAnchors(groups);

  let out = "";

  // 文件头注释
  out += `# ==================== 文件信息 ====================\n`;
  out += `# 名称: ${name}\n`;
  out += `# 来源: ${url}\n`;
  out += `# 说明: ${description}\n`;
  out += `# 生成: ${generatedAt}\n`;
  out += `# ⚠  proxy-providers 中的 url 请替换为真实订阅地址\n`;
  out += `# ====================================================\n`;

  // 锚点区块
  out += renderAnchors(anchors);

  // 代理提供者
  out += renderProxyProviders(result["proxy-providers"]);

  // 核心配置
  out += renderCoreConfig(result);

  // 嗅探
  if (result.sniffer) out += renderSniffer(result.sniffer);

  // TUN
  if (result.tun) out += renderTun(result.tun);

  // DNS
  if (result.dns) out += renderDns(result.dns);

  // 静态节点
  if (result.proxies && result.proxies.length > 0) out += renderProxies(result.proxies);

  // 策略组
  out += renderProxyGroups(groups, anchors, filterMap);

  // 规则
  out += renderRules(result.rules);

  // 规则集
  out += renderRuleProviders(result["rule-providers"]);

  return out;
}

module.exports = { renderMihomoYaml };
