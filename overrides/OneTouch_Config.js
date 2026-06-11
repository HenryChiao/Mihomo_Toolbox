/**
 * 覆写脚本 — OneTouch_Config
 * 由 to-override.js 从 OneTouch_Config.yaml 自动生成
 * 生成时间: 2026-06-11T15:16:37.878Z
 *
 * 兼容客户端:
 *   FlClash v0.8.85+  /  Mihomo Party  /  Clash Party
 *   Clash Verge Rev   /  Sparkle
 *
 * 覆写内容:
 *   ✔ proxy-groups  — 完整分组结构（include-all/filter 原样保留）
 *   ✔ rules         — 完整路由规则
 *   ✔ rule-providers — 规则集定义
 *   ✔ dns           — DNS 配置
 *   ✔ sniffer       — 嗅探配置
 *   ✔ tun           — TUN 配置（enable 默认 false，由客户端界面控制）
 *   ✔ 其他非骨架字段
 *   ✔ 静态节点注入  — 无
 *
 * 不覆写的字段（由客户端/用户自己管理）:
 *   端口、allow-lan、mode、log-level、管理面板、GEO数据源、认证信息
 */

/** @param {Record<string, any>} config */
function main(config) {

  // ══════════════════════════════════════════════════════════════
  // § 1  注入静态节点
  //      源 YAML 里 proxies: 定义的节点（如 DNS劫持、直接连接）
  //      订阅里没有这些节点，需主动注入，否则分组引用会悬空
  // ══════════════════════════════════════════════════════════════

  const STATIC_PROXIES = [];

  if (STATIC_PROXIES.length > 0) {
    const existingNames = new Set((config.proxies || []).map(p => p.name));
    config.proxies = config.proxies || [];
    for (const p of STATIC_PROXIES) {
      if (!existingNames.has(p.name)) {
        config.proxies.push(p);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // § 2  覆写 proxy-groups
  //      原样替换，分组里的 include-all + filter 由 Mihomo 内核
  //      在运行时自动从 proxy-providers 填充节点，无需硬编码节点名
  // ══════════════════════════════════════════════════════════════

  config["proxy-groups"] = [
    {
        "name": "一键连",
        "type": "select",
        "proxies": [
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ],
        "icon": "https://github.com/666OS/YYDS/raw/main/mihomo/image/mihomo.png"
    },
    {
        "name": "人工智能",
        "type": "select",
        "proxies": [
            "美国自动",
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ],
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/AI.png"
    },
    {
        "name": "社交平台",
        "type": "select",
        "proxies": [
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ],
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/PBS.png"
    },
    {
        "name": "国际媒体",
        "type": "select",
        "proxies": [
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ],
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/DomesticMedia.png"
    },
    {
        "name": "国内流量",
        "type": "select",
        "proxies": [
            "直接连接",
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择"
        ],
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/China.png"
    },
    {
        "name": "手动选择",
        "type": "select",
        "include-all": true,
        "filter": "^(?!.*(DIRECT|直接连接|群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|无法|说明|使用|提示|特别|访问|支持|教程|关注|更新|作者|加入|USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author))",
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Clubhouse.png"
    },
    {
        "name": "直接连接",
        "type": "select",
        "proxies": [
            "DIRECT"
        ],
        "hidden": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Direct.png"
    },
    {
        "name": "香港自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(港|🇭🇰|HK|Hong|HKG))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Hong_Kong.png"
    },
    {
        "name": "台湾自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(台|🇼🇸|🇹🇼|TW|tai|TPE|TSA|KHH))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Taiwan.png"
    },
    {
        "name": "日本自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(日|🇯🇵|JP|Japan|NRT|HND|KIX|CTS|FUK))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Japan.png"
    },
    {
        "name": "狮城自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(坡|🇸🇬|SG|Sing|SIN|XSP))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Singapore.png"
    },
    {
        "name": "韩国自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(韩|🇰🇷|韓|首尔|南朝鲜|KR|KOR|Korea|South))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/Korea.png"
    },
    {
        "name": "美国自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(美|🇺🇸|US|USA|SJC|JFK|LAX|ORD|ATL|DFW|SFO|MIA|SEA|IAD))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/United_States.png"
    },
    {
        "name": "欧洲自动",
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true,
        "filter": "^(?=.*(?i)(奥|比|保|克罗地亚|塞|捷|丹|爱沙|芬|法|德|希|匈|爱尔|意|拉|立|卢|马其它|荷|波|葡|罗|斯洛伐|斯洛文|西|瑞|英|🇧🇪|🇨🇿|🇩🇰|🇫🇮|🇫🇷|🇩🇪|🇮🇪|🇮🇹|🇱🇹|🇱🇺|🇳🇱|🇵🇱|🇸🇪|🇬🇧|CDG|FRA|AMS|MAD|BCN|FCO|MUC|BRU))(?!.*(排除1|排除2|5x)).*$",
        "include-all": true,
        "icon": "https://github.com/Koolson/Qure/raw/master/IconSet/Color/European_Union.png"
    }
];

  // ══════════════════════════════════════════════════════════════
  // § 3  覆写其余字段（dns / rules / rule-providers / sniffer 等）
  // ══════════════════════════════════════════════════════════════

  const OVERRIDE = {
    "BaseProvider": {
        "type": "http",
        "interval": 86400,
        "proxy": "DIRECT",
        "health-check": {
            "enable": true,
            "url": "https://www.google.com/generate_204",
            "interval": 300
        },
        "filter": "^(?!.*(群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|无法|说明|使用|提示|特别|访问|支持|教程|关注|更新|作者|加入|USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author))"
    },
    "BaseUT": {
        "type": "url-test",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true
    },
    "BaseFB": {
        "type": "fallback",
        "interval": 200,
        "lazy": true,
        "empty-fallback": "REJECT",
        "url": "https://www.google.com/generate_204",
        "hidden": true
    },
    "FilterHK": "^(?=.*(?i)(港|🇭🇰|HK|Hong|HKG))(?!.*(排除1|排除2|5x)).*$",
    "FilterSG": "^(?=.*(?i)(坡|🇸🇬|SG|Sing|SIN|XSP))(?!.*(排除1|排除2|5x)).*$",
    "FilterJP": "^(?=.*(?i)(日|🇯🇵|JP|Japan|NRT|HND|KIX|CTS|FUK))(?!.*(排除1|排除2|5x)).*$",
    "FilterKR": "^(?=.*(?i)(韩|🇰🇷|韓|首尔|南朝鲜|KR|KOR|Korea|South))(?!.*(排除1|排除2|5x)).*$",
    "FilterUS": "^(?=.*(?i)(美|🇺🇸|US|USA|SJC|JFK|LAX|ORD|ATL|DFW|SFO|MIA|SEA|IAD))(?!.*(排除1|排除2|5x)).*$",
    "FilterTW": "^(?=.*(?i)(台|🇼🇸|🇹🇼|TW|tai|TPE|TSA|KHH))(?!.*(排除1|排除2|5x)).*$",
    "FilterEU": "^(?=.*(?i)(奥|比|保|克罗地亚|塞|捷|丹|爱沙|芬|法|德|希|匈|爱尔|意|拉|立|卢|马其它|荷|波|葡|罗|斯洛伐|斯洛文|西|瑞|英|🇧🇪|🇨🇿|🇩🇰|🇫🇮|🇫🇷|🇩🇪|🇮🇪|🇮🇹|🇱🇹|🇱🇺|🇳🇱|🇵🇱|🇸🇪|🇬🇧|CDG|FRA|AMS|MAD|BCN|FCO|MUC|BRU))(?!.*(排除1|排除2|5x)).*$",
    "FilterOT": "^(?!.*(DIRECT|直接连接|美|港|坡|台|新|日|韩|奥|比|保|克罗地亚|塞|捷|丹|爱沙|芬|法|德|希|匈|爱尔|意|拉|立|卢|马其它|荷|波|葡|罗|斯洛伐|斯洛文|西|瑞|英|🇭🇰|🇼🇸|🇹🇼|🇸🇬|🇯🇵|🇰🇷|🇺🇸|🇬🇧|🇦🇹|🇧🇪|🇨🇿|🇩🇰|🇫🇮|🇫🇷|🇩🇪|🇮🇪|🇮🇹|🇱🇹|🇱🇺|🇳🇱|🇵🇱|🇸🇪|HK|TW|SG|JP|KR|US|GB|CDG|FRA|AMS|MAD|BCN|FCO|MUC|BRU|HKG|TPE|TSA|KHH|SIN|XSP|NRT|HND|KIX|CTS|FUK|JFK|LAX|ORD|ATL|DFW|SFO|MIA|SEA|IAD|LHR|LGW))",
    "FilterAL": "^(?!.*(DIRECT|直接连接|群|邀请|返利|循环|官网|客服|网站|网址|获取|订阅|流量|到期|机场|下次|版本|官址|备用|过期|已用|联系|邮箱|工单|贩卖|通知|倒卖|防止|国内|地址|频道|无法|说明|使用|提示|特别|访问|支持|教程|关注|更新|作者|加入|USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author))",
    "SelectAL": {
        "type": "select",
        "proxies": [
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ]
    },
    "SelectOne": {
        "type": "select",
        "proxies": [
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ]
    },
    "SelectUS": {
        "type": "select",
        "proxies": [
            "美国自动",
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "欧洲自动",
            "手动选择",
            "直接连接"
        ]
    },
    "SelectDC": {
        "type": "select",
        "proxies": [
            "直接连接",
            "一键连",
            "香港自动",
            "台湾自动",
            "日本自动",
            "狮城自动",
            "韩国自动",
            "美国自动",
            "欧洲自动",
            "手动选择"
        ]
    },
    "unified-delay": true,
    "tcp-concurrent": true,
    "find-process-mode": "always",
    "keep-alive-interval": 15,
    "keep-alive-idle": 600,
    "experimental": {
        "quic-go-disable-gso": true
    },
    "profile": {
        "store-selected": true,
        "store-fake-ip": true
    },
    "sniffer": {
        "enable": true,
        "sniff": {
            "HTTP": {
                "ports": [
                    80,
                    "8080-8880"
                ],
                "override-destination": true
            },
            "TLS": {
                "ports": [
                    443,
                    8443
                ]
            },
            "QUIC": {
                "ports": [
                    443,
                    8443
                ]
            }
        },
        "skip-domain": [
            "Mijia Cloud",
            "+.push.apple.com"
        ]
    },
    "tun": {
        "enable": false,
        "stack": "mixed",
        "dns-hijack": [
            "any:53",
            "tcp://any:53"
        ],
        "auto-route": true,
        "auto-redirect": true,
        "auto-detect-interface": true
    },
    "dns": {
        "enable": true,
        "ipv6": false,
        "enhanced-mode": "fake-ip",
        "fake-ip-range": "198.18.0.1/16",
        "default-nameserver": [
            "119.29.29.29",
            "180.184.1.1",
            "223.5.5.5"
        ],
        "nameserver": [
            "https://dns.alidns.com/dns-query",
            "https://doh.pub/dns-query"
        ],
        "fake-ip-filter": [
            "rule-set:Direct",
            "rule-set:Private",
            "rule-set:China",
            "+.miwifi.com",
            "+.docker.io",
            "+.market.xiaomi.com",
            "+.push.apple.com"
        ]
    },
    "rules": [
        "AND,((DST-PORT,443),(NETWORK,UDP),(NOT,((GEOIP,CN,no-resolve)))),REJECT",
        "RULE-SET,Private,直接连接",
        "RULE-SET,Direct,直接连接",
        "RULE-SET,AppleCN,直接连接",
        "RULE-SET,Download,直接连接",
        "RULE-SET,XPTV,直接连接",
        "RULE-SET,AI,人工智能",
        "RULE-SET,Telegram,社交平台",
        "RULE-SET,SocialMedia,社交平台",
        "RULE-SET,YouTube,国际媒体",
        "RULE-SET,Spotify,国际媒体",
        "RULE-SET,Netflix,国际媒体",
        "RULE-SET,Disney,国际媒体",
        "RULE-SET,HBO,国际媒体",
        "RULE-SET,Proxy,一键连",
        "RULE-SET,China,国内流量",
        "RULE-SET,PrivateIP,直接连接,no-resolve",
        "RULE-SET,TelegramIP,社交平台,no-resolve",
        "RULE-SET,SocialMediaIP,社交平台,no-resolve",
        "RULE-SET,NetflixIP,国际媒体,no-resolve",
        "RULE-SET,ProxyIP,一键连,no-resolve",
        "RULE-SET,ChinaIP,国内流量,no-resolve",
        "MATCH,一键连"
    ],
    "BehaviorDN": {
        "type": "http",
        "behavior": "domain",
        "format": "mrs",
        "interval": 86400
    },
    "BehaviorIP": {
        "type": "http",
        "behavior": "ipcidr",
        "format": "mrs",
        "interval": 86400
    },
    "rule-providers": {
        "Private": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Private.mrs"
        },
        "Direct": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Direct.mrs"
        },
        "AppleCN": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/AppleCN.mrs"
        },
        "Download": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Download.mrs"
        },
        "XPTV": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/XPTV.mrs"
        },
        "AI": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/AI.mrs"
        },
        "Telegram": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Telegram.mrs"
        },
        "SocialMedia": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/SocialMedia.mrs"
        },
        "YouTube": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/YouTube.mrs"
        },
        "Spotify": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Spotify.mrs"
        },
        "Netflix": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Netflix.mrs"
        },
        "Disney": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Disney.mrs"
        },
        "HBO": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/HBO.mrs"
        },
        "Proxy": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/Proxy.mrs"
        },
        "China": {
            "type": "http",
            "behavior": "domain",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/domain/China.mrs"
        },
        "TelegramIP": {
            "type": "http",
            "behavior": "ipcidr",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/ip/Telegram.mrs"
        },
        "SocialMediaIP": {
            "type": "http",
            "behavior": "ipcidr",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/ip/SocialMedia.mrs"
        },
        "NetflixIP": {
            "type": "http",
            "behavior": "ipcidr",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/ip/Netflix.mrs"
        },
        "ProxyIP": {
            "type": "http",
            "behavior": "ipcidr",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/ip/Proxy.mrs"
        },
        "ChinaIP": {
            "type": "http",
            "behavior": "ipcidr",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/ip/China.mrs"
        },
        "PrivateIP": {
            "type": "http",
            "behavior": "ipcidr",
            "format": "mrs",
            "interval": 86400,
            "url": "https://github.com/666OS/rules/raw/release/mihomo/ip/Private.mrs"
        }
    }
};

  // tun: enable 强制 false，避免与客户端自身 TUN 管理冲突
  // 如需开启 TUN 请在客户端界面操作，或手动修改此脚本
  if (OVERRIDE.tun) {
    OVERRIDE.tun.enable = false;
  }

  Object.assign(config, OVERRIDE);

  return config;
}

if (typeof module !== "undefined") module.exports = main;
