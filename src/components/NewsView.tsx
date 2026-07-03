import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Newspaper,
  Rss,
  TrendingUp,
  Trash2,
  RefreshCw,
  BookOpen,
  ExternalLink,
  Sparkles,
  X,
  PlusCircle,
  Award,
} from "lucide-react";
import { callAI } from "../utils/aiEngine";
import type { CustomizationConfig } from "../types";
import { safeJsonParse } from "../utils/json";

interface NewsViewProps {
  config: CustomizationConfig;
}

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: "tech" | "reading" | "daily" | "custom";
}

interface Article {
  title: string;
  link: string;
  pubDate: string;
  author?: string;
  description: string;
  content: string;
}

// 默认高保真本地 Mock 数据，防止由于 CORS 阻碍网络拉取时造成空页面，同时也是完美的报纸风模板
const MOCK_TRENDING_NEWS = [
  {
    title: "硅谷传奇：人工智慧的下一幕「实体具身智能」正在全速走来",
    source: "科技新知",
    hotValue: "99万",
    summary: "在经历了大型语言模型（LLM）的狂飙突进之后，行业焦点正快速向「具身智能（Embodied AI）」汇聚。机器视觉、触觉传感器与高精度电机的软硬件深度融合，正让AI走出屏幕、触碰物理世界，开辟出前所未有的全新生产力疆域。",
    time: "10分钟前",
    rank: 1,
  },
  {
    title: "重读经典：博尔赫斯逝世四十周年，我们在他的迷宫里寻找什么？",
    source: "人文读书",
    hotValue: "85万",
    summary: "时间、镜子、迷宫与无限。博尔赫斯用他那精微如钟表、宏大如星系的文字，构建了一个不依赖于物质实体却无比真实的哲学殿堂。在信息泛滥的碎片化时代，重温博尔赫斯的克制与幽深，或许是一剂解毒良药。",
    time: "45分钟前",
    rank: 2,
  },
  {
    title: "低延时与极简美学：为什么「纯文本局域网同步」依然是最优雅的解决方案？",
    source: "极客之声",
    hotValue: "78万",
    summary: "在云计算、长轮询和重客户端大行其道的今天，一部分极客却在回归本质。基于 UDP 广播或最轻量级 WebSockets 实现的局域网文本同步机制，不仅在物理上实现了零摩擦的即时触感，更是对用户数据主权、隐私和本地优先（Local-First）哲学的最高致敬。",
    time: "1小时前",
    rank: 3,
  },
  {
    title: "手冲咖啡的慢艺术：如何在忙碌日程中寻回25分钟的专注仪式感",
    source: "每日漫笔",
    hotValue: "62万",
    summary: "研磨、闷蒸、旋转注水。水流穿过粉层的微妙香气，是一天中少有的、可以完全由触觉和视觉主导的沉浸体验。这与番茄工作法（Pomodoro Technique）的25分钟黄金专注机制不谋而合——在紧绷的思维竞赛里，我们需要这样一处有尊严的留白。",
    time: "2小时前",
    rank: 4,
  },
  {
    title: "Tauri 2.0 时代全面来临：轻量级跨平台桌面开发迎来Rust革新",
    source: "极客之声",
    hotValue: "55万",
    summary: "凭借着体积小巧、内存占用低以及 Rust 的强悍底层支撑，Tauri 正逐步动摇 Electron 坚固的统治。全新的移动端原生插件支持，更让开发者能以极佳的开发体验构建跨平台生态。",
    time: "3小时前",
    rank: 5,
  },
];

const MOCK_FEED_ARTICLES: Record<string, Article[]> = {
  douban: [
    {
      title: "《时间的秩序》：宇宙没有钟表，我们只有当下的河流",
      link: "https://book.douban.com/review/1",
      pubDate: "2026-07-03",
      author: "豆瓣金牌书评人 · 暮光",
      description: "物理学家卡洛·罗威利在这本小册子里摧毁了我们对「时间」的常识性认知。他告诉我们，在宇宙的底层，根本不存在一个统一流逝的时间。时间只是一种局部的、与熵增纠缠在一起的宏观幻觉。",
      content: "我们在日常生活中感知到的时间，如大江大河般滚滚向前，顺流而下。然而，现代物理学（特别是圈量子引力论）的研究表明，这只是一种由于人类处于特定“热力学限制”下产生的局部视角。在无垠的宇宙深处，每一个点都有其独特的时间流逝速度。重力越强的地方，时间流逝越慢；速度越快的地方，时间同样在变慢。甚至在量子尺度上，“过去、现在、未来”的边界彻底消融。\n\n这意味着，我们并非生活在时间的流逝中，我们本身就是时间。每一次记忆的留存、每一次计划的落笔，都是我们在无序的宇宙里，凭借微弱的认知刻度，为自己筑起的“秩序灯塔”。作为一款待办日程管理工具的陪伴者，当你规划任务时，不妨也抛开时间的焦虑——没有绝对的客观催促，只有你主观赋予这些事项的生命厚度。"
    },
    {
      title: "博尔赫斯的虚构集：在无限的分叉小径中寻找永恒",
      link: "https://book.douban.com/review/2",
      pubDate: "2026-06-30",
      author: "书海泛舟",
      description: "在博尔赫斯笔下，宇宙是一座无限的书馆。每一个入口都连接着无限分叉的选择。这不仅是文学的奇迹，更是关于选择与宿命的终极哲学隐喻。",
      content: "博尔赫斯的文字高度凝练，充满了迷宫、镜子、沙子和死后审判的意象。他最著名的短篇《分叉的小径》将时间描述为一个无限网状的整体，包含了所有的可能性。在这个网状的时间里，一个人的选择并不排除其他的可能性，而是同时存在于不同的平行宇宙中。这也是对待办管理极其诗意的隐喻：我们每一天的日程安排，其实就是在这无数分叉的小径里，小心翼翼地踩出一条属于我们自己的、清晰温热的现实足迹。"
    }
  ],
  sspai: [
    {
      title: "如何用 Markdown 搭建一套无摩擦的「数字极简第二大脑」？",
      link: "https://sspai.com/post/1",
      pubDate: "2026-07-02",
      author: "少数派资深作者 · 极客小强",
      description: "抛弃复杂的数据库与联动，回归纯粹的文本目录。本文介绍如何通过 Obsidian 或普通 md 编译器，配合快捷键，搭建一套秒开、永久保存、抗工具淘汰的个人知识体系。",
      content: "随着各种多功能笔记软件的不断推陈出新，许多人却陷入了无休止的“工具整理焦虑”中：花费了大量时间在配置属性、关联看板、折腾模板上，却唯独忘记了输入和思考。本文倡导一种「本地优先，纯文本至上」的记录哲学。Markdown 文件体积微乎其微，不依赖任何特定软件，即便三十年过去，任何简易的文本阅读器依然能够轻松读取。将日程规划、便签随笔、技术摘录用最直白的方式储存在本地硬盘，配合简单的全文本检索（如 ripgrep 级别的毫秒级搜索），才是最稳固、最无心理负担的“第二大脑”。"
    },
    {
      title: "番茄工作法的高阶进化：如何配合心流机制实现无痛专注",
      link: "https://sspai.com/post/2",
      pubDate: "2026-06-29",
      author: "效率学院",
      description: "25分钟不是圣旨，而是踏入专注之门的铺垫。通过引入心流判定区，合理安排白噪音，你可以在保留番茄钟无摩擦感的同时，享受数小时的极致创造快感。",
      content: "很多人在使用番茄钟时会感到被工具“奴役”了：当25分钟铃声响起，正处于灵感澎湃的心流状态却不得不强制中断休息，这无疑非常痛苦。高阶专注者应当将番茄钟视作一个“破冰船”。25分钟只是帮助你的大脑战胜启动拖延，一旦轻舟已过万重山，心流自然成型，就可以视情况适当延长该番茄钟，直到精力自然回落，再用白噪音和休息机制进行充能。"
    }
  ],
  hn: [
    {
      title: "Local-first software: You own your data, in spite of the cloud",
      link: "https://news.ycombinator.com/item?id=1",
      pubDate: "2026-07-01",
      author: "inkandswitch",
      description: "A detailed essay proposing 'local-first' as a new development paradigm that combines the collaboration benefits of the cloud with the ownership and performance benefits of offline-capable software.",
      content: "Cloud apps are convenient: you can access them anywhere, and real-time collaboration is seamless. However, cloud services frequently sunset, change pricing, or suffer from outages. Local-first software represents a movement back to storing your own files on your own device, while utilizing peer-to-peer technologies or end-to-end encrypted synchronization pipelines (like WebDAV or CRDTs) to reconcile states across devices. This app, QiYun List, embraces this exact philosophy by implementing Unified Storage on SQLite and backing up data gracefully."
    },
    {
      title: "Why I still use raw text files for my todo list in 2026",
      link: "https://news.ycombinator.com/item?id=2",
      pubDate: "2026-06-28",
      author: "text_fanatic",
      description: "The author shares their experience of managing major software engineering pipelines using a single plain text file, and why heavy database tools sometimes increase friction rather than output.",
      content: "No notifications, no sync delays, no interface animations. Just a single text file open in a vim buffer. The simpler the tool, the less cognitive load it introduces. When we design todo interfaces, we must remember to keep the friction of 'adding' and 'viewing' as close to zero as possible. This is why quick-add inputs, minimal matrixes, and physical card styles are so effective: they mimic the immediate tactile sensation of index cards on a physical desk, offering both productivity and peace of mind."
    }
  ],
  poetry: [
    {
      title: "小窗晨启：梅雨初晴，庭院幽篁里的一声清啼",
      link: "https://poetry.example.com/1",
      pubDate: "2026-07-03",
      author: "知更鸟",
      description: "清晨，阳光穿过微湿的绿帘，落在原木桌角。在开始一天的密密麻麻的任务规划之前，先让思想在露珠的颤动里静置片刻。",
      content: "晨光熹微，宿雨初干。庭前几竿修竹，叶尖上还挂着昨夜未散的露珠，在朝阳下折射出极细微的光芒。沏一盏淡淡的绿茶，茶烟袅袅，在空气中勾勒出慵懒的弧度。\n\n桌案上平铺着尚未落笔的日程，那是今天需要去奔跑、去迎击的世界。然而在此时此刻，万籁俱寂，唯有远处林间雀鸟的一声清啼，划破了空气的温润。我们总是行色匆匆，将“高效”与“卓越”刻在额头上。但请记住，生活不在那些最终打上的勾里，而是在勾与勾之间，那一呼一吸、一口热茶、一下竹香的宁静缝隙里。朝花夕拾，愿你在今天的繁忙旅途里，依然保有回首采撷落花的一份从容。"
    }
  ]
};

const DEFAULT_FEEDS: RSSFeed[] = [
  { id: "douban", name: "豆瓣书评 · 纸上观澜", url: "https://www.douban.com/feed/review/book", category: "reading" },
  { id: "sspai", name: "少数派 · 极客利器", url: "https://sspai.com/feed", category: "tech" },
  { id: "hn", name: "Hacker News · 硅谷晨风", url: "https://news.ycombinator.com/rss", category: "tech" },
  { id: "poetry", name: "每日散笔 · 晨窗静思", url: "https://poetry.example.com/feed", category: "daily" },
];

export const NewsView: React.FC<NewsViewProps> = ({ config }) => {

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"trending" | "rss" | "manage">("trending");

  // State
  const [feeds, setFeeds] = useState<RSSFeed[]>(() => {
    const saved = localStorage.getItem("qiyun_rss_feeds");
    return saved ? safeJsonParse(saved, DEFAULT_FEEDS) : DEFAULT_FEEDS;
  });

  const [selectedFeed, setSelectedFeed] = useState<RSSFeed>(feeds[0] || DEFAULT_FEEDS[0]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Reading Overlay
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // AI Summary
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Form
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedCategory, setNewFeedCategory] = useState<RSSFeed["category"]>("custom");

  // User reading settings
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "md" | "lg" | "xl">(() => {
    return (localStorage.getItem("qiyun_news_font_size") as any) || "md";
  });
  const [readerFontFamily, setReaderFontFamily] = useState<"serif" | "sans">(() => {
    return (localStorage.getItem("qiyun_news_font_family") as any) || "serif";
  });
  const [readerColumns, setReaderColumns] = useState<"single" | "double">(() => {
    return (localStorage.getItem("qiyun_news_columns") as any) || "single";
  });

  const handleFontSizeChange = (size: "sm" | "md" | "lg" | "xl") => {
    setReaderFontSize(size);
    localStorage.setItem("qiyun_news_font_size", size);
  };

  const handleFontFamilyChange = (family: "serif" | "sans") => {
    setReaderFontFamily(family);
    localStorage.setItem("qiyun_news_font_family", family);
  };

  const handleColumnsChange = (cols: "single" | "double") => {
    setReaderColumns(cols);
    localStorage.setItem("qiyun_news_columns", cols);
  };

  // Fetch articles from feed
  const loadFeedArticles = useCallback(async (feed: RSSFeed) => {
    setLoading(true);
    setErrorMessage(null);
    setArticles([]);

    try {
      // 1. 尝试直接 fetch
      const res = await fetch(feed.url);
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const xmlText = await res.text();
      
      const parsed = parseRSSXML(xmlText);
      if (parsed && parsed.length > 0) {
        setArticles(parsed);
        setLoading(false);
        return;
      }
    } catch (e: any) {
      console.warn(`Direct fetch failed for ${feed.name}, trying CORS proxy or local template fallback...`, e);
      
      // 2. 尝试公共 CORS Proxy 代理
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const xmlText = await res.text();
          const parsed = parseRSSXML(xmlText);
          if (parsed && parsed.length > 0) {
            setArticles(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (proxyErr) {
        console.warn(`Proxy fetch also failed for ${feed.name}`, proxyErr);
      }
    }

    // 3. Fallback 到我们预置的极致高保真 Mock 散文/文章
    // 这可以让软件在离线或 CORS 阻断下呈现极美的、可交互阅读的传统报纸排版
    const fallbackData = MOCK_FEED_ARTICLES[feed.id] || MOCK_FEED_ARTICLES.douban;
    setTimeout(() => {
      setArticles(fallbackData);
      setLoading(false);
    }, 400);
  }, []);

  // Parse Simple RSS XML Helper
  const parseRSSXML = (xmlText: string): Article[] => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      const items = doc.querySelectorAll("item");
      if (!items || items.length === 0) return [];

      return Array.from(items).slice(0, 10).map((item) => {
        const title = item.querySelector("title")?.textContent || "无题";
        const link = item.querySelector("link")?.textContent || "";
        const pubDateRaw = item.querySelector("pubDate")?.textContent || "";
        const author = item.querySelector("author")?.textContent || item.querySelector("creator")?.textContent || "匿名作者";
        
        let description = item.querySelector("description")?.textContent || "";
        // Clean HTML tags from description
        description = description.replace(/<[^>]*>/g, "").slice(0, 120) + (description.length > 120 ? "..." : "");

        const content = item.querySelector("encoded")?.textContent || item.querySelector("description")?.textContent || "";

        return {
          title,
          link,
          pubDate: pubDateRaw ? new Date(pubDateRaw).toLocaleDateString() : new Date().toLocaleDateString(),
          author,
          description,
          content,
        };
      });
    } catch (e) {
      console.error("RSS parsing error", e);
      return [];
    }
  };

  // Effect to load articles on feed selection or tab toggle
  useEffect(() => {
    if (activeSubTab === "rss" && selectedFeed) {
      loadFeedArticles(selectedFeed);
    }
  }, [activeSubTab, selectedFeed, loadFeedArticles]);

  // Manage Feeds
  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;

    const newFeed: RSSFeed = {
      id: "rss-" + Date.now().toString(36),
      name: newFeedName.trim(),
      url: newFeedUrl.trim(),
      category: newFeedCategory,
    };

    const updated = [...feeds, newFeed];
    setFeeds(updated);
    localStorage.setItem("qiyun_rss_feeds", JSON.stringify(updated));
    setSelectedFeed(newFeed);

    setNewFeedName("");
    setNewFeedUrl("");
    setActiveSubTab("rss");
  };

  const handleDeleteFeed = (id: string) => {
    if (["douban", "sspai", "hn", "poetry"].includes(id)) {
      alert("内置预设源无法删除，你可以点击‘管理’添加你自己的订阅。");
      return;
    }
    const updated = feeds.filter((f) => f.id !== id);
    setFeeds(updated);
    localStorage.setItem("qiyun_rss_feeds", JSON.stringify(updated));
    if (selectedFeed.id === id && updated.length > 0) {
      setSelectedFeed(updated[0]);
    }
  };

  // AI Summary Generation
  const handleGenerateAISummary = async (article: Article) => {
    if (!config.aiApiKey) {
      // 兜底本地 Mock AI 摘要：如果用户还没配 API Key，也呈现出完整交互
      setAiLoading(true);
      setTimeout(() => {
        setAiSummary(`【⚙️ 本地智能摘要（演示模式）】\n本文《${article.title}》的核心观点如下：\n\n1. 倡导物理世界、心理体验与技术工具之间的有机留白与克制。\n2. 反思信息过载对心流的侵蚀，并提供回归原子本质、关注「当下即唯一」的终极解法。\n\n💡 提示：在系统设置中配妥您的 AI API 密钥，即可解锁真实的大模型即时摘要分析！☕`);
        setAiLoading(false);
      }, 1000);
      return;
    }

    setAiLoading(true);
    setAiSummary(null);

    const systemPrompt = `你是一位严谨而学识渊博的报纸社论主笔。请阅读以下文章，用“编者按”或“智能摘录”的风格，撰写一段 150 字以内极富文学美感与洞察力的导读摘要。请使用优雅、克制的中文。`;
    const userPrompt = `文章标题: ${article.title}\n作者: ${article.author || "未知"}\n文章内容: ${article.content.slice(0, 1800)}`;

    try {
      const summary = await callAI(config, systemPrompt, userPrompt);
      setAiSummary(summary);
    } catch (e: any) {
      setAiSummary(`❌ 智能社论摘要生成失败: ${e.message || e}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Today Date & Metabar values
  const paperDate = useMemo(() => {
    const today = new Date();
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('zh-CN', opts);
  }, []);

  const paperIssue = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = Date.now() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return `第 ${new Date().getFullYear()} 卷 · 第 ${dayOfYear} 期`;
  }, []);

  return (
    <div className="flex flex-col gap-5 flex-grow z-10 relative">
      {/* Newspaper Top Header Section */}
      <div className="bg-[#FAF8F5]/80 border border-[#EFEBE4] px-6 py-4 rounded-2xl shadow-sm backdrop-blur-md flex flex-col gap-3">
        {/* Newspaper Flag / Nameplate (报头) */}
        <div className="border-b-4 border-double border-slate-700 pb-3 flex flex-col items-center justify-center text-center">
          <span className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase mb-1">
            {config.locale === "en" ? "QIYUN NEWSPAPER & RSS READER" : "待办人生随身雅读 · 朝花夕拾"}
          </span>
          <h1 className="text-3xl font-serif font-black tracking-widest text-[#2D323A] py-1 flex items-center gap-2">
            <Newspaper className="w-7 h-7 text-[#8B6E3C] stroke-[1.8]" />
            <span>朝 花 夕 拾</span>
          </h1>
          <span className="text-[10px] text-slate-500 italic mt-0.5">
            "Read slow, write deep, plan wise." · 晨兴理荒秽，带月荷锄归
          </span>
        </div>

        {/* Newspaper Metabar (报纸栏目属性条) */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-b border-dashed border-slate-300 pb-2 px-1">
          <div className="flex items-center gap-1">
            <span>📅 {paperDate}</span>
          </div>
          <div className="hidden sm:block">
            <span>📰 {paperIssue}</span>
          </div>
          <div>
            <span>🏷️ 定价：开卷有益 (免费)</span>
          </div>
        </div>

        {/* Subtab Navigation (栏目索引) */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <button
            onClick={() => setActiveSubTab("trending")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "trending"
                ? "bg-[#8B6E3C] text-white shadow-xs"
                : "bg-white border border-[#EFEBE4] text-slate-600 hover:bg-[#FAF8F5]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            今日热议 (Trending)
          </button>
          <button
            onClick={() => setActiveSubTab("rss")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "rss"
                ? "bg-[#8B6E3C] text-white shadow-xs"
                : "bg-white border border-[#EFEBE4] text-slate-600 hover:bg-[#FAF8F5]"
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            RSS 阅览室 (Feeds)
          </button>
          <button
            onClick={() => setActiveSubTab("manage")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === "manage"
                ? "bg-[#8B6E3C] text-white shadow-xs"
                : "bg-white border border-[#EFEBE4] text-slate-600 hover:bg-[#FAF8F5]"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            订阅管理 (Manage)
          </button>
        </div>
      </div>

      {/* Main Column Content Area */}
      <div className="flex flex-col md:flex-row gap-5">
        
        {/* Left Side Menu for Feed Selection in RSS view */}
        {activeSubTab === "rss" && (
          <div className="w-full md:w-[240px] flex-shrink-0 flex flex-col gap-3 self-start md:sticky md:top-6">
            <div className="bg-white/70 border border-[#EFEBE4] rounded-2xl p-4 shadow-sm backdrop-blur-md flex flex-col gap-2.5">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                已阅源 (Subscriptions)
              </span>
              <div className="flex flex-col gap-1.5">
                {feeds.map((feed) => (
                  <button
                    key={feed.id}
                    onClick={() => setSelectedFeed(feed)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all truncate border flex items-center gap-2 cursor-pointer ${
                      selectedFeed.id === feed.id
                        ? "bg-[#FAF5ED] text-[#8B6E3C] border-[#EFE5D3] shadow-2xs"
                        : "bg-white/40 border-transparent hover:bg-white text-slate-600"
                    }`}
                  >
                    <BookOpen className={`w-3.5 h-3.5 flex-shrink-0 ${selectedFeed.id === feed.id ? "text-[#8B6E3C]" : "text-slate-400"}`} />
                    <span className="truncate">{feed.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setActiveSubTab("manage")}
              className="bg-white hover:bg-[#FAF8F5] border border-[#EFEBE4] text-slate-600 text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#8B6E3C]" />
              订阅自定义 RSS
            </button>
          </div>
        )}

        {/* Newspaper Page (正文版面) */}
        <div className="flex-grow bg-[#FCFAF2] border-2 border-[#EADFC9] rounded-2xl p-7 shadow-md relative flex flex-col select-text">
          
          {/* Section 1: Trending Mockup Grid (头条与网格) */}
          {activeSubTab === "trending" && (
            <div className="space-y-8 flex-grow animate-fade-in">
              {/* Headline Story (报纸特稿头条) */}
              <div className="border-b-2 border-slate-700 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left big text column */}
                  <div className="lg:col-span-2 space-y-4 border-r-0 lg:border-r border-slate-300 lg:pr-8">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#A34E36] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-sm uppercase tracking-wider">
                        特稿 · HEADLINE
                      </span>
                      <span className="text-xs text-slate-400 font-bold">{MOCK_TRENDING_NEWS[0].time}</span>
                    </div>
                    <h2 
                      onClick={() => setSelectedArticle({
                        title: MOCK_TRENDING_NEWS[0].title,
                        link: "",
                        pubDate: MOCK_TRENDING_NEWS[0].time,
                        author: "本报首席主笔",
                        description: MOCK_TRENDING_NEWS[0].summary,
                        content: MOCK_TRENDING_NEWS[0].summary + "\n\n实体具身智能（Embodied AI）标志着人工智能进入了一个全新的物理进化阶段。传统AI被困在沙盒和局域网络中，只对符号、文本和二维图像做出反应；而具身智能在机械骨骼和仿生神经元的武装下，开始真正重塑物理世界。\n\n通过将大模型作为大脑，配合端到端强化学习以及基于高频传感器的自适应运动规划，现在的机器人能做出穿针引线、倒茶倒水、清扫房间甚至组装复杂仪器的灵活动作。这不仅是个效率问题，更是一场深刻的哲学和技术迁徙——当AI有了‘身体’，它就拥有了感知空间、阻力、惯性与材质的能力，从而能以类似人类婴儿的方式，在跌跌撞撞中学习物理世界的底层规则，迈向真正的通用人工智能（AGI）。"
                      })}
                      className="text-2xl md:text-3xl font-serif font-black tracking-tight text-slate-800 leading-tight cursor-pointer hover:text-[#A34E36] transition-colors"
                    >
                      {MOCK_TRENDING_NEWS[0].title}
                    </h2>
                    <p className="text-sm md:text-base text-slate-700 font-serif leading-relaxed text-justify first-letter:text-5xl first-letter:font-serif first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-[#A34E36] first-letter:leading-none">
                      {MOCK_TRENDING_NEWS[0].summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 font-bold pt-1">
                      <span>源自：{MOCK_TRENDING_NEWS[0].source}</span>
                      <span>•</span>
                      <span>热议度：🔥 {MOCK_TRENDING_NEWS[0].hotValue}</span>
                    </div>
                  </div>

                  {/* Right editor recommendation block */}
                  <div className="bg-[#FAF5ED] border border-[#EFE5D3] p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    {/* Background decor stripe */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#8B6E3C]/5 rounded-bl-full flex items-center justify-center">
                      <Award className="w-5 h-5 text-[#8B6E3C]/20" />
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs text-[#8B6E3C] font-extrabold tracking-widest uppercase block border-b border-[#8B6E3C]/10 pb-1">
                        🖋️ 编者今日按 (EDITORIAL)
                      </span>
                      <p className="text-xs md:text-sm text-[#8B6E3C] leading-relaxed font-serif italic text-justify">
                        “在一切提速的时代，我们反而更需要‘慢’的承载。文字是心流的锚，而有节奏的阅读则是心境的过滤器。本栏目致力于用传统报纸的素雅质感，在您的日程屏幕一角开辟片刻静谧的书斋，在繁复待办之外，留下一两片思想的落叶。”
                      </p>
                    </div>
                    <div className="text-xs text-[#8B6E3C]/60 text-right font-bold mt-2">
                      —— 朝花夕拾总编
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Column Feed Grid (副版面网格) */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-300 pb-2">
                  今日议题简报 (Columns & Stories)
                </span>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {MOCK_TRENDING_NEWS.slice(1).map((news) => (
                    <div 
                      key={news.rank} 
                      onClick={() => setSelectedArticle({
                        title: news.title,
                        link: "",
                        pubDate: news.time,
                        author: `本报主笔`,
                        description: news.summary,
                        content: `${news.summary}\n\n在信息流软件无休止地通过个性化推荐和短视频剥夺用户注意力的今天，高质量的深度主题聚合正重回人们的视野。朝花夕拾本期特刊与您共同探讨。`
                      })}
                      className="border-b border-[#EFEBE4] pb-4 flex gap-4 cursor-pointer group hover:bg-[#FAF8F5]/30 p-3 rounded-2xl transition-all duration-300"
                    >
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-sm font-serif font-black text-slate-400 group-hover:bg-[#8B6E3C]/10 group-hover:text-[#8B6E3C] transition-colors">
                        0{news.rank}
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm md:text-base font-serif font-bold text-slate-800 leading-snug group-hover:text-[#8B6E3C] transition-colors">
                          {news.title}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                          {news.summary}
                        </p>
                        <div className="flex gap-3 text-xs text-slate-400 font-bold pt-0.5">
                          <span>{news.source}</span>
                          <span>{news.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: RSS Feed List (RSS 列表排版) */}
          {activeSubTab === "rss" && (
            <div className="space-y-5 flex-grow flex flex-col min-h-0 animate-fade-in">
              <div className="border-b border-slate-300 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-black text-slate-800 flex items-center gap-1.5">
                    <Rss className="w-5 h-5 text-[#8B6E3C]" />
                    <span>{selectedFeed.name}</span>
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">地址: {selectedFeed.url}</span>
                </div>
                <button
                  onClick={() => loadFeedArticles(selectedFeed)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-[#EFEBE4] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  刷新订阅
                </button>
              </div>

              {loading ? (
                <div className="flex-grow flex flex-col items-center justify-center py-20 gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#8B6E3C]" />
                  <span className="text-xs text-slate-400 font-semibold tracking-wider">正在排版，墨香扑鼻 (Loading feed...)</span>
                </div>
              ) : errorMessage ? (
                <div className="flex-grow flex flex-col items-center justify-center py-20 text-center gap-1 text-slate-400">
                  <span className="text-xs font-bold">{errorMessage}</span>
                </div>
              ) : articles.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center py-20 text-center text-slate-400 font-semibold">
                  <p className="text-xs">暂无未读文章</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-4">
                  {articles.map((article, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedArticle(article);
                        setAiSummary(null);
                      }}
                      className="p-5 md:p-6 bg-white hover:bg-[#FAF8F5]/30 border border-[#EFEBE4] rounded-2xl flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs transition-all duration-300 cursor-pointer group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                          <span>👤 {article.author || "本报特稿"}</span>
                          <span>🕒 {article.pubDate}</span>
                        </div>
                        <h3 className="text-base md:text-lg font-serif font-black text-slate-800 leading-snug group-hover:text-[#8B6E3C] transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 leading-relaxed line-clamp-3 text-justify">
                          {article.description}
                        </p>
                      </div>
                      <div className="flex justify-end text-xs font-extrabold text-[#8B6E3C] tracking-wide gap-1 items-center">
                        <span>剪报阅读</span>
                        <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Manage Subscriptions Form (订阅配置管理) */}
          {activeSubTab === "manage" && (
            <div className="space-y-6 flex-grow animate-fade-in max-w-xl mx-auto py-4">
              <div className="bg-[#FAF5ED] border border-[#EFE5D3] p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-[#8B6E3C] tracking-wider block">✍️ 自定义您的信息源 (Newspaper Administration)</span>
                <p className="text-[10px] text-slate-500 leading-relaxed text-justify">
                  您可以在这里管理已订阅的报纸频道，或录入符合 RSS 2.0 规范的订阅源。本应用会尝试通过客户端发起拉取。如果遇到严格的安全网闸，本系统会自动回退到精美的本地每日人文摘录模板。
                </p>
              </div>

              {/* Add Feed Form */}
              <form onSubmit={handleAddFeed} className="space-y-4 bg-white/70 border border-[#EFEBE4] p-5 rounded-2xl shadow-2xs">
                <h3 className="text-xs font-bold text-slate-700">添加新订阅 (Add RSS Feed)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">源名称 (Name)</label>
                    <input
                      type="text"
                      placeholder="e.g. 阮一峰的网络日志"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#4D7C5D]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">订阅分类 (Category)</label>
                    <select
                      value={newFeedCategory}
                      onChange={(e) => setNewFeedCategory(e.target.value as RSSFeed["category"])}
                      className="w-full bg-white border border-[#EFEBE4] px-2 py-1.5 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#4D7C5D]"
                    >
                      <option value="tech">科技 (Tech)</option>
                      <option value="reading">阅读 (Reading)</option>
                      <option value="daily">日常 (Daily)</option>
                      <option value="custom">其他 (Custom)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RSS 订阅地址 URL (Feed URL)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/feed"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#4D7C5D]"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#4D7C5D] hover:bg-[#3F684C] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    确认订阅
                  </button>
                </div>
              </form>

              {/* Feed List Manager */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">已订阅列表 (Feeds Inventory)</span>
                <div className="space-y-1.5">
                  {feeds.map((feed) => (
                    <div key={feed.id} className="bg-white border border-[#EFEBE4] p-3 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">{feed.name}</span>
                        <span className="text-[9px] text-slate-400 font-medium truncate block max-w-md">{feed.url}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-500 uppercase">
                          {feed.category}
                        </span>
                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="取消订阅"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Retro Newspaper clipping overlay Reader (传统剪报阅读视窗) */}
      {selectedArticle && (() => {
        const modalTitleClass = {
          sm: "text-lg md:text-xl",
          md: "text-xl md:text-2xl",
          lg: "text-2xl md:text-3xl",
          xl: "text-3xl md:text-4xl",
        }[readerFontSize];

        const modalContentClass = {
          sm: "text-xs md:text-sm leading-relaxed",
          md: "text-sm md:text-base leading-relaxed",
          lg: "text-base md:text-lg leading-loose",
          xl: "text-lg md:text-xl leading-loose",
        }[readerFontSize];

        const modalFontClass = readerFontFamily === "serif" ? "font-serif" : "font-sans";
        const modalColumnsClass = readerColumns === "double" ? "lg:columns-2 lg:gap-8" : "columns-1";

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className={`bg-[#FAF7EE] border-4 border-[#8B6E3C] rounded-2xl w-full max-w-4xl h-[85vh] lg:h-[90vh] flex flex-col p-6 lg:p-8 shadow-2xl relative select-text animate-fade-in-up ${modalFontClass}`}>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedArticle(null);
                  setAiSummary(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Reading Preferences Toolbar (阅览排版控制) */}
              <div className="flex flex-wrap items-center gap-3.5 border-b border-[#EADFC9] pb-3 mb-4 text-xs font-bold text-slate-500 select-none pr-10">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mr-1">字号:</span>
                  {(["sm", "md", "lg", "xl"] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => handleFontSizeChange(sz)}
                      className={`w-6 h-6 rounded flex items-center justify-center border text-[10px] transition-all cursor-pointer ${
                        readerFontSize === sz
                          ? "bg-[#8B6E3C] text-white border-[#8B6E3C]"
                          : "bg-white text-slate-600 border-[#EFEBE4] hover:border-[#8B6E3C]"
                      }`}
                    >
                      {sz === "sm" ? "A-" : sz === "md" ? "A" : sz === "lg" ? "A+" : "A++"}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-[#EADFC9]" />

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mr-1">字体:</span>
                  <button
                    onClick={() => handleFontFamilyChange("serif")}
                    className={`px-2 py-0.5 rounded border text-[11px] transition-all cursor-pointer ${
                      readerFontFamily === "serif"
                        ? "bg-[#8B6E3C] text-white border-[#8B6E3C]"
                        : "bg-white text-slate-600 border-[#EFEBE4] hover:border-[#8B6E3C]"
                    }`}
                  >
                    古典
                  </button>
                  <button
                    onClick={() => handleFontFamilyChange("sans")}
                    className={`px-2 py-0.5 rounded border text-[11px] transition-all cursor-pointer ${
                      readerFontFamily === "sans"
                        ? "bg-[#8B6E3C] text-white border-[#8B6E3C]"
                        : "bg-white text-slate-600 border-[#EFEBE4] hover:border-[#8B6E3C]"
                    }`}
                  >
                    现代
                  </button>
                </div>

                <div className="h-4 w-px bg-[#EADFC9]" />

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest mr-1">排版:</span>
                  <button
                    onClick={() => handleColumnsChange("single")}
                    className={`px-2 py-0.5 rounded border text-[11px] transition-all cursor-pointer ${
                      readerColumns === "single"
                        ? "bg-[#8B6E3C] text-white border-[#8B6E3C]"
                        : "bg-white text-slate-600 border-[#EFEBE4] hover:border-[#8B6E3C]"
                    }`}
                  >
                    单栏
                  </button>
                  <button
                    onClick={() => handleColumnsChange("double")}
                    className={`px-2 py-0.5 rounded border text-[11px] transition-all cursor-pointer ${
                      readerColumns === "double"
                        ? "bg-[#8B6E3C] text-white border-[#8B6E3C]"
                        : "bg-white text-slate-600 border-[#EFEBE4] hover:border-[#8B6E3C]"
                    }`}
                  >
                    双栏
                  </button>
                </div>
              </div>

              {/* Clipping Header */}
              <div className="border-b-2 border-slate-700 pb-3 mb-4 text-center">
                <span className="text-[9px] text-[#8B6E3C] font-extrabold tracking-widest uppercase block mb-1">
                  朝花夕拾 · 剪报档案 (THE QIYUN ARCHIVE)
                </span>
                <h2 className={`font-serif font-black tracking-tight text-slate-800 px-6 leading-tight mt-1.5 ${modalTitleClass}`}>
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400 font-bold mt-2">
                  <span>👤 {selectedArticle.author || "本报特稿"}</span>
                  <span>•</span>
                  <span>🕒 发表时间: {selectedArticle.pubDate}</span>
                </div>
              </div>

              {/* AI Editorial Summary Box */}
              <div className="mb-4">
                {aiSummary ? (
                  <div className="bg-[#EADFC9]/30 border border-[#C4B5A0] p-4 rounded-xl text-xs text-slate-700 leading-relaxed font-serif relative">
                    <Sparkles className="w-4 h-4 text-[#8B6E3C] absolute top-3 right-3" />
                    <strong className="text-[10px] text-[#8B6E3C] block mb-1">✍️ AI 编者社论按 (EDITORIAL SUMMARY)</strong>
                    <p className="whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleGenerateAISummary(selectedArticle)}
                      disabled={aiLoading}
                      className="bg-[#FAF5ED] hover:bg-[#EADFC9]/40 text-[#8B6E3C] border border-[#EFE5D3] px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-102 animate-pulse"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>社论摘要分析中...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI 编者按 (AI Editorial)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Newspaper Column Content */}
              <div className="flex-grow overflow-y-auto pr-1.5 custom-scrollbar text-slate-700 text-justify pb-4">
                <div className={`space-y-5 ${modalColumnsClass} ${modalContentClass}`}>
                  {selectedArticle.content.split("\n\n").map((para, pIdx) => (
                    <p 
                      key={pIdx} 
                      className={`${pIdx === 0 && readerFontFamily === "serif" ? "first-letter:text-5xl first-letter:font-serif first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-[#A34E36] first-letter:leading-none" : ""}`}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* External original Link */}
              {selectedArticle.link && (
                <div className="mt-auto pt-3 border-t border-dashed border-slate-300 flex justify-between items-center text-xs text-slate-400 font-bold select-none">
                  <span>QiYun List Daily Press Reader</span>
                  <a
                    href={selectedArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8B6E3C] hover:underline flex items-center gap-1.5"
                  >
                    访问原文链接
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};
