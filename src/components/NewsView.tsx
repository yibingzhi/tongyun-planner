import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Bookmark,
  BookmarkCheck,
  Clock,
  Search,
  Star,
  ChevronRight,
  ArrowLeft,
  Feather,
  Heart,
  RefreshCcw,
  Quote,
} from "lucide-react";
import { callAI } from "../utils/aiEngine";
import type { CustomizationConfig } from "../types";
import { safeJsonParse } from "../utils/json";
import { invoke } from "@tauri-apps/api/core";

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
  feedId?: string;
  feedName?: string;
}

interface BookmarkedArticle extends Article {
  bookmarkedAt: number;
}

interface ReadHistoryEntry {
  title: string;
  link: string;
  feedName?: string;
  readAt: number;
}

const isTauri = () =>
  typeof window !== "undefined" &&
  (window as any).__TAURI_INTERNALS__ !== undefined;

// 默认高保真本地 Mock 数据（仅在非 Tauri 环境或网络失败时使用）
const MOCK_TRENDING_NEWS = [
  {
    title: "硅谷传奇：人工智慧的下一幕「实体具身智能」正在全速走来",
    source: "科技新知",
    hotValue: "99万",
    summary:
      "在经历了大型语言模型（LLM）的狂飙突进之后，行业焦点正快速向「具身智能（Embodied AI）」汇聚。机器视觉、触觉传感器与高精度电机的软硬件深度融合，正让AI走出屏幕、触碰物理世界，开辟出前所未有的全新生产力疆域。",
    time: "10分钟前",
    rank: 1,
  },
  {
    title: "重读经典：博尔赫斯逝世四十周年，我们在他的迷宫里寻找什么？",
    source: "人文读书",
    hotValue: "85万",
    summary:
      "时间、镜子、迷宫与无限。博尔赫斯用他那精微如钟表、宏大如星系的文字，构建了一个不依赖于物质实体却无比真实的哲学殿堂。",
    time: "45分钟前",
    rank: 2,
  },
  {
    title:
      "低延时与极简美学：为什么「纯文本局域网同步」依然是最优雅的解决方案？",
    source: "极客之声",
    hotValue: "78万",
    summary:
      "在云计算和重客户端大行其道的今天，一部分极客却在回归本质。基于 UDP 广播或最轻量级 WebSockets 实现的局域网文本同步机制，是对用户数据主权和 Local-First 哲学的最高致敬。",
    time: "1小时前",
    rank: 3,
  },
  {
    title: "手冲咖啡的慢艺术：如何在忙碌日程中寻回25分钟的专注仪式感",
    source: "每日漫笔",
    hotValue: "62万",
    summary:
      "研磨、闷蒸、旋转注水。水流穿过粉层的微妙香气，与番茄工作法的25分钟黄金专注机制不谋而合——在紧绷的思维竞赛里，我们需要这样一处有尊严的留白。",
    time: "2小时前",
    rank: 4,
  },
  {
    title: "Tauri 2.0 时代全面来临：轻量级跨平台桌面开发迎来Rust革新",
    source: "极客之声",
    hotValue: "55万",
    summary:
      "凭借体积小巧、内存占用低以及 Rust 的强悍底层支撑，Tauri 正逐步动摇 Electron 的统治。全新的移动端原生插件支持，更让开发者能以极佳的体验构建跨平台生态。",
    time: "3小时前",
    rank: 5,
  },
];

const DEFAULT_FEEDS: RSSFeed[] = [
  {
    id: "sspai",
    name: "少数派 · 极客利器",
    url: "https://sspai.com/feed",
    category: "tech",
  },
  {
    id: "hn",
    name: "Hacker News · Top",
    url: "https://hnrss.org/frontpage",
    category: "tech",
  },
  {
    id: "ruanyifeng",
    name: "阮一峰的网络日志",
    url: "https://www.ruanyifeng.com/blog/atom.xml",
    category: "tech",
  },
  {
    id: "zhihu-daily",
    name: "知乎每日精选",
    url: "https://www.zhihu.com/rss",
    category: "daily",
  },
];

const FEED_CATEGORY_LABELS: Record<RSSFeed["category"], string> = {
  tech: "科技",
  reading: "阅读",
  daily: "日常",
  custom: "自定义",
};

const FEED_CATEGORY_COLORS: Record<RSSFeed["category"], string> = {
  tech: "bg-blue-50 text-blue-600 border-blue-100",
  reading: "bg-amber-50 text-amber-700 border-amber-100",
  daily: "bg-emerald-50 text-emerald-600 border-emerald-100",
  custom: "bg-purple-50 text-purple-600 border-purple-100",
};

// ─── 每日一言：诗词 & 名言数据库 ───

interface DailyQuote {
  text: string;
  author: string;
  source?: string;
  category: "poetry" | "prose" | "quote";
}

const QUOTES_DB: DailyQuote[] = [
  { text: "采菊东篱下，悠然见南山。", author: "陶渊明", source: "饮酒·其五", category: "poetry" },
  { text: "人生天地之间，若白驹之过隙，忽然而已。", author: "庄子", source: "知北游", category: "prose" },
  { text: "落霞与孤鹜齐飞，秋水共长天一色。", author: "王勃", source: "滕王阁序", category: "poetry" },
  { text: "山不在高，有仙则名。水不在深，有龙则灵。", author: "刘禹锡", source: "陋室铭", category: "prose" },
  { text: "众里寻他千百度，蓦然回首，那人却在灯火阑珊处。", author: "辛弃疾", source: "青玉案·元夕", category: "poetry" },
  { text: "人生如逆旅，我亦是行人。", author: "苏轼", source: "临江仙·送钱穆父", category: "poetry" },
  { text: "大漠孤烟直，长河落日圆。", author: "王维", source: "使至塞上", category: "poetry" },
  { text: "行到水穷处，坐看云起时。", author: "王维", source: "终南别业", category: "poetry" },
  { text: "世事洞明皆学问，人情练达即文章。", author: "曹雪芹", source: "红楼梦", category: "prose" },
  { text: "知人者智，自知者明。", author: "老子", source: "道德经", category: "prose" },
  { text: "海内存知己，天涯若比邻。", author: "王勃", source: "送杜少府之任蜀州", category: "poetry" },
  { text: "不畏浮云遮望眼，自缘身在最高层。", author: "王安石", source: "登飞来峰", category: "poetry" },
  { text: "但愿人长久，千里共婵娟。", author: "苏轼", source: "水调歌头", category: "poetry" },
  { text: "路漫漫其修远兮，吾将上下而求索。", author: "屈原", source: "离骚", category: "poetry" },
  { text: "人间有味是清欢。", author: "苏轼", source: "浣溪沙", category: "poetry" },
  { text: "晚来天欲雪，能饮一杯无？", author: "白居易", source: "问刘十九", category: "poetry" },
  { text: "明月松间照，清泉石上流。", author: "王维", source: "山居秋暝", category: "poetry" },
  { text: "此中有真意，欲辨已忘言。", author: "陶渊明", source: "饮酒·其五", category: "poetry" },
  { text: "粗缯大布裹生涯，腹有诗书气自华。", author: "苏轼", source: "和董传留别", category: "poetry" },
  { text: "浮生若梦，为欢几何。", author: "李白", source: "春夜宴桃李园序", category: "prose" },
  { text: "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", author: "苏轼", source: "定风波", category: "poetry" },
  { text: "山重水复疑无路，柳暗花明又一村。", author: "陆游", source: "游山西村", category: "poetry" },
  { text: "少年不识愁滋味，爱上层楼。", author: "辛弃疾", source: "丑奴儿", category: "poetry" },
  { text: "醉后不知天在水，满船清梦压星河。", author: "唐温如", source: "题龙阳县青草湖", category: "poetry" },
  { text: "春风得意马蹄疾，一日看尽长安花。", author: "孟郊", source: "登科后", category: "poetry" },
  { text: "天生我材必有用，千金散尽还复来。", author: "李白", source: "将进酒", category: "poetry" },
  { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游", source: "冬夜读书示子聿", category: "poetry" },
  { text: "一万年太久，只争朝夕。", author: "毛泽东", source: "满江红·和郭沫若同志", category: "poetry" },
  { text: "吾生也有涯，而知也无涯。", author: "庄子", source: "养生主", category: "prose" },
  { text: "回首向来萧瑟处，归去，也无风雨也无晴。", author: "苏轼", source: "定风波", category: "poetry" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "quote" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", category: "quote" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu", source: "Tao Te Ching", category: "quote" },
  { text: "It is not the strongest that survive, but the most adaptable.", author: "Charles Darwin", category: "quote" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle", category: "quote" },
];

/** Get today's quote using a stable daily seed */
function getDailyQuote(): DailyQuote {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return QUOTES_DB[seed % QUOTES_DB.length];
}

/** Get a random quote different from the current one */
function getRandomQuote(current: DailyQuote): DailyQuote {
  let next: DailyQuote;
  let attempts = 0;
  do {
    next = QUOTES_DB[Math.floor(Math.random() * QUOTES_DB.length)];
    attempts++;
  } while (next.text === current.text && attempts < 10);
  return next;
}

// Parse RSS/Atom XML
function parseRSSXML(xmlText: string): Article[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");

    // Try RSS 2.0 first
    let items = doc.querySelectorAll("item");
    if (items && items.length > 0) {
      return Array.from(items)
        .slice(0, 20)
        .map((item) => {
          const title = item.querySelector("title")?.textContent || "无题";
          const link = item.querySelector("link")?.textContent || "";
          const pubDateRaw =
            item.querySelector("pubDate")?.textContent || "";
          const author =
            item.querySelector("author")?.textContent ||
            item.querySelector("creator")?.textContent ||
            "";
          let description =
            item.querySelector("description")?.textContent || "";
          description =
            description.replace(/<[^>]*>/g, "").slice(0, 200) +
            (description.length > 200 ? "..." : "");
          const content =
            item.querySelector("encoded")?.textContent ||
            item.querySelector("description")?.textContent ||
            "";

          return {
            title,
            link,
            pubDate: pubDateRaw
              ? new Date(pubDateRaw).toLocaleDateString("zh-CN")
              : "",
            author,
            description,
            content: content.replace(/<[^>]*>/g, ""),
          };
        });
    }

    // Try Atom format
    const entries = doc.querySelectorAll("entry");
    if (entries && entries.length > 0) {
      return Array.from(entries)
        .slice(0, 20)
        .map((entry) => {
          const title = entry.querySelector("title")?.textContent || "无题";
          const linkEl = entry.querySelector("link");
          const link = linkEl?.getAttribute("href") || linkEl?.textContent || "";
          const pubDateRaw =
            entry.querySelector("published")?.textContent ||
            entry.querySelector("updated")?.textContent ||
            "";
          const author =
            entry.querySelector("author name")?.textContent || "";
          const summary =
            entry.querySelector("summary")?.textContent || "";
          const content =
            entry.querySelector("content")?.textContent || summary;

          return {
            title,
            link,
            pubDate: pubDateRaw
              ? new Date(pubDateRaw).toLocaleDateString("zh-CN")
              : "",
            author,
            description: summary.replace(/<[^>]*>/g, "").slice(0, 200),
            content: content.replace(/<[^>]*>/g, ""),
          };
        });
    }

    return [];
  } catch (e) {
    console.error("RSS parsing error", e);
    return [];
  }
}

export const NewsView: React.FC<NewsViewProps> = ({ config }) => {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<
    "trending" | "rss" | "bookmarks" | "daily" | "manage"
  >("trending");

  // State
  const [feeds, setFeeds] = useState<RSSFeed[]>(() => {
    const saved = localStorage.getItem("qiyun_rss_feeds");
    return saved ? safeJsonParse(saved, DEFAULT_FEEDS) : DEFAULT_FEEDS;
  });

  const [selectedFeed, setSelectedFeed] = useState<RSSFeed>(
    feeds[0] || DEFAULT_FEEDS[0]
  );
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
  const [newFeedCategory, setNewFeedCategory] =
    useState<RSSFeed["category"]>("custom");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>(() => {
    return safeJsonParse(
      localStorage.getItem("qiyun_news_bookmarks") || "[]",
      []
    );
  });

  // Reading History
  const [readHistory, setReadHistory] = useState<ReadHistoryEntry[]>(() => {
    return safeJsonParse(
      localStorage.getItem("qiyun_news_history") || "[]",
      []
    );
  });

  // Daily Quote
  const [currentQuote, setCurrentQuote] = useState<DailyQuote>(() => getDailyQuote());
  const [savedQuotes, setSavedQuotes] = useState<DailyQuote[]>(() => {
    return safeJsonParse(
      localStorage.getItem("qiyun_saved_quotes") || "[]",
      []
    );
  });
  const [quoteAiComment, setQuoteAiComment] = useState<string | null>(null);
  const [quoteAiLoading, setQuoteAiLoading] = useState(false);

  // Persist saved quotes
  useEffect(() => {
    localStorage.setItem("qiyun_saved_quotes", JSON.stringify(savedQuotes));
  }, [savedQuotes]);

  const isQuoteSaved = useCallback(
    (q: DailyQuote) => savedQuotes.some((s) => s.text === q.text),
    [savedQuotes]
  );

  const toggleSaveQuote = useCallback((q: DailyQuote) => {
    setSavedQuotes((prev) => {
      if (prev.some((s) => s.text === q.text)) {
        return prev.filter((s) => s.text !== q.text);
      }
      return [q, ...prev];
    });
  }, []);

  const handleQuoteAI = async (q: DailyQuote) => {
    if (!config.aiApiKey) {
      setQuoteAiLoading(true);
      setTimeout(() => {
        setQuoteAiComment("【演示模式】请在设置中配置 AI API 密钥以启用智能赏析。");
        setQuoteAiLoading(false);
      }, 600);
      return;
    }
    setQuoteAiLoading(true);
    setQuoteAiComment(null);
    const systemPrompt = "你是一位学识渊博的文学评论家。请对以下诗句或名言写一段 80 字以内的精炼赏析，文风优雅克制，启发读者深思。";
    const userPrompt = "「" + q.text + "」—— " + q.author + (q.source ? "《" + q.source + "》" : "");
    try {
      const result = await callAI(config, systemPrompt, userPrompt);
      setQuoteAiComment(result);
    } catch (e: any) {
      setQuoteAiComment("赏析生成失败: " + (e.message || e));
    } finally {
      setQuoteAiLoading(false);
    }
  };

  const shuffleQuote = useCallback(() => {
    setCurrentQuote((prev) => getRandomQuote(prev));
    setQuoteAiComment(null);
  }, []);

  // Reader settings
  const [readerFontSize, setReaderFontSize] = useState<
    "sm" | "md" | "lg" | "xl"
  >(() => {
    return (
      (localStorage.getItem("qiyun_news_font_size") as any) || "md"
    );
  });
  const [readerFontFamily, setReaderFontFamily] = useState<"serif" | "sans">(
    () => {
      return (
        (localStorage.getItem("qiyun_news_font_family") as any) || "serif"
      );
    }
  );
  const [readerColumns, setReaderColumns] = useState<"single" | "double">(
    () => {
      return (
        (localStorage.getItem("qiyun_news_columns") as any) || "single"
      );
    }
  );

  // Persist bookmarks
  useEffect(() => {
    localStorage.setItem("qiyun_news_bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Persist history (keep latest 100)
  useEffect(() => {
    const trimmed = readHistory.slice(0, 100);
    localStorage.setItem("qiyun_news_history", JSON.stringify(trimmed));
  }, [readHistory]);

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

  // Bookmark helpers
  const isBookmarked = useCallback(
    (article: Article) =>
      bookmarks.some(
        (b) => b.title === article.title && b.link === article.link
      ),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (article: Article) => {
      setBookmarks((prev) => {
        const exists = prev.some(
          (b) => b.title === article.title && b.link === article.link
        );
        if (exists) {
          return prev.filter(
            (b) =>
              !(b.title === article.title && b.link === article.link)
          );
        }
        return [{ ...article, bookmarkedAt: Date.now() }, ...prev];
      });
    },
    []
  );

  // Add to read history
  const addToHistory = useCallback((article: Article) => {
    setReadHistory((prev) => {
      const filtered = prev.filter(
        (h) =>
          !(h.title === article.title && h.link === article.link)
      );
      return [
        {
          title: article.title,
          link: article.link,
          feedName: article.feedName,
          readAt: Date.now(),
        },
        ...filtered,
      ];
    });
  }, []);

  // Fetch articles via Rust proxy or direct
  const loadFeedArticles = useCallback(
    async (feed: RSSFeed) => {
      setLoading(true);
      setErrorMessage(null);
      setArticles([]);

      try {
        let xmlText: string | null = null;

        // 1. Try Tauri invoke (Rust side, no CORS)
        if (isTauri()) {
          try {
            xmlText = await invoke<string>("fetch_rss", {
              url: feed.url,
            });
          } catch (e: any) {
            console.warn("Tauri fetch_rss failed:", e);
          }
        }

        // 2. Fallback: direct fetch (might work for some feeds)
        if (!xmlText) {
          try {
            const res = await fetch(feed.url);
            if (res.ok) xmlText = await res.text();
          } catch (e: any) {
            console.warn("Direct fetch failed:", e);
          }
        }

        // 3. Parse XML
        if (xmlText) {
          const parsed = parseRSSXML(xmlText);
          if (parsed.length > 0) {
            setArticles(
              parsed.map((a) => ({
                ...a,
                feedId: feed.id,
                feedName: feed.name,
              }))
            );
            setLoading(false);
            return;
          }
        }

        // 4. If all fails, show error instead of mock
        setErrorMessage(
          "无法拉取该订阅源。请确认 URL 正确且网络通畅，或在「订阅管理」中更换源。"
        );
      } catch (e: any) {
        setErrorMessage("加载失败: " + (e?.message || e));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load on feed select
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
    const updated = feeds.filter((f) => f.id !== id);
    setFeeds(updated);
    localStorage.setItem("qiyun_rss_feeds", JSON.stringify(updated));
    if (selectedFeed.id === id && updated.length > 0) {
      setSelectedFeed(updated[0]);
    }
  };

  // AI Summary
  const handleGenerateAISummary = async (article: Article) => {
    if (!config.aiApiKey) {
      setAiLoading(true);
      setTimeout(() => {
        setAiSummary(
          "【演示模式】请在设置中配置 AI API 密钥以启用智能摘要功能。"
        );
        setAiLoading(false);
      }, 600);
      return;
    }

    setAiLoading(true);
    setAiSummary(null);
    const systemPrompt =
      "你是一位严谨而学识渊博的报纸社论主笔。请阅读以下文章，用编者按的风格，撰写一段 150 字以内极富洞察力的导读摘要。使用优雅、克制的中文。";
    const userPrompt =
      "文章标题: " +
      article.title +
      "\n作者: " +
      (article.author || "未知") +
      "\n文章内容: " +
      article.content.slice(0, 1800);

    try {
      const summary = await callAI(config, systemPrompt, userPrompt);
      setAiSummary(summary);
    } catch (e: any) {
      setAiSummary("摘要生成失败: " + (e.message || e));
    } finally {
      setAiLoading(false);
    }
  };

  // Date info
  const paperDate = useMemo(() => {
    const today = new Date();
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("zh-CN", opts);
  }, []);

  const paperIssue = useMemo(() => {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = Date.now() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return new Date().getFullYear() + " 卷 · 第 " + dayOfYear + " 期";
  }, []);

  // Filtered articles for search
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.author || "").toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  // Filtered bookmarks for search
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery.trim()) return bookmarks;
    const q = searchQuery.toLowerCase();
    return bookmarks.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [bookmarks, searchQuery]);

  // Open article handler
  const openArticle = useCallback(
    (article: Article) => {
      setSelectedArticle(article);
      setAiSummary(null);
      addToHistory(article);
    },
    [addToHistory]
  );

  return (
    <div className="flex flex-col gap-4 flex-grow z-10 relative">
      {/* ─── 报头区域 ─── */}
      <div className="bg-gradient-to-b from-[#FAF8F5] to-[#F5F1EA] border border-[#E8E0D0] px-6 py-5 rounded-2xl shadow-sm relative overflow-hidden">
        {/* 装饰纹理 */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg, #8B6E3C 0, #8B6E3C 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />

        <div className="relative z-10">
          {/* 报头 */}
          <div className="border-b-[3px] border-double border-[#2D323A] pb-3 flex flex-col items-center justify-center text-center">
            <span className="text-[8px] text-[#8B6E3C]/60 font-extrabold tracking-[0.3em] uppercase mb-1.5">
              QIYUN DAILY PRESS · EST. 2026
            </span>
            <h1 className="text-[28px] font-serif font-black tracking-[0.15em] text-[#2D323A] flex items-center gap-3">
              <Newspaper className="w-6 h-6 text-[#8B6E3C] stroke-[1.5]" />
              <span>朝花夕拾</span>
            </h1>
            <span className="text-[10px] text-slate-400 italic mt-1 tracking-wide">
              "Read slow, write deep, plan wise." · 晨兴理荒秽，带月荷锄归
            </span>
          </div>

          {/* 信息条 */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 py-2 px-1">
            <span>{paperDate}</span>
            <span className="hidden sm:block">第 {paperIssue}</span>
            <span className="text-[#8B6E3C]/50">定价：开卷有益</span>
          </div>

          {/* 导航标签 */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-[#E8E0D0]">
            {(
              [
                { key: "trending" as const, icon: TrendingUp, label: "今日热议" },
                { key: "daily" as const, icon: Feather, label: "每日一言" },
                { key: "rss" as const, icon: Rss, label: "RSS 阅览室" },
                { key: "bookmarks" as const, icon: Bookmark, label: "收藏夹" },
                { key: "manage" as const, icon: PlusCircle, label: "订阅管理" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer " +
                  (activeSubTab === tab.key
                    ? "bg-[#2D323A] text-[#F5F1EA] shadow-sm"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-700")
                }
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.key === "bookmarks" && bookmarks.length > 0 && (
                  <span className="bg-[#8B6E3C] text-white text-[8px] px-1.5 py-0.5 rounded-full ml-0.5 font-extrabold">
                    {bookmarks.length}
                  </span>
                )}
              </button>
            ))}

            {/* 搜索框 */}
            <div className="ml-auto relative">
              <Search className="w-3 h-3 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="搜索文章..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 bg-white/60 border border-[#E8E0D0] pl-7 pr-2.5 py-1.5 rounded-lg text-[10px] text-slate-700 placeholder-slate-300 focus:outline-none focus:border-[#8B6E3C]/40 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 主体区域 ─── */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* RSS 左侧边栏 */}
        {activeSubTab === "rss" && (
          <div className="w-full md:w-[220px] flex-shrink-0 flex flex-col gap-3 self-start md:sticky md:top-4">
            <div className="bg-white/80 border border-[#E8E0D0] rounded-2xl p-3.5 backdrop-blur-sm">
              <span className="text-[9px] font-extrabold text-slate-300 uppercase tracking-[0.15em] block mb-2">
                订阅源
              </span>
              <div className="flex flex-col gap-1">
                {feeds.map((feed) => (
                  <button
                    key={feed.id}
                    onClick={() => setSelectedFeed(feed)}
                    className={
                      "w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all truncate flex items-center gap-2 cursor-pointer " +
                      (selectedFeed.id === feed.id
                        ? "bg-[#2D323A] text-[#F5F1EA] shadow-sm"
                        : "text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700")
                    }
                  >
                    <BookOpen
                      className={
                        "w-3 h-3 flex-shrink-0 " +
                        (selectedFeed.id === feed.id
                          ? "text-[#E8E0D0]"
                          : "text-slate-300")
                      }
                    />
                    <span className="truncate">{feed.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab("manage")}
              className="bg-white/60 hover:bg-white border border-dashed border-[#E8E0D0] text-slate-400 hover:text-[#8B6E3C] text-[10px] font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              添加订阅源
            </button>
          </div>
        )}

        {/* ─── 正文版面 ─── */}
        <div className="flex-grow bg-[#FCFAF4] border border-[#E8E0D0] rounded-2xl p-6 shadow-sm relative flex flex-col min-h-[400px]">
          {/* ═══ Trending ═══ */}
          {activeSubTab === "trending" && (
            <div className="space-y-6 flex-grow animate-[fadeIn_0.3s_ease-out]">
              {/* 头条 */}
              <div className="border-b-2 border-[#2D323A] pb-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-3 border-r-0 lg:border-r border-slate-200 lg:pr-6">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#A34E36] text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase">
                        特稿
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {MOCK_TRENDING_NEWS[0].time}
                      </span>
                    </div>
                    <h2
                      onClick={() =>
                        openArticle({
                          title: MOCK_TRENDING_NEWS[0].title,
                          link: "",
                          pubDate: MOCK_TRENDING_NEWS[0].time,
                          author: "本报首席主笔",
                          description: MOCK_TRENDING_NEWS[0].summary,
                          content: MOCK_TRENDING_NEWS[0].summary,
                          feedName: MOCK_TRENDING_NEWS[0].source,
                        })
                      }
                      className="text-xl md:text-2xl font-serif font-black tracking-tight text-[#2D323A] leading-snug cursor-pointer hover:text-[#A34E36] transition-colors"
                    >
                      {MOCK_TRENDING_NEWS[0].title}
                    </h2>
                    <p className="text-sm text-slate-600 font-serif leading-relaxed text-justify first-letter:text-4xl first-letter:font-serif first-letter:font-black first-letter:mr-2 first-letter:float-left first-letter:text-[#A34E36] first-letter:leading-none">
                      {MOCK_TRENDING_NEWS[0].summary}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium pt-1">
                      <span>{MOCK_TRENDING_NEWS[0].source}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>热议 {MOCK_TRENDING_NEWS[0].hotValue}</span>
                    </div>
                  </div>

                  {/* 编者按 */}
                  <div className="bg-gradient-to-br from-[#FAF5ED] to-[#F5EFE3] border border-[#EFE5D3] p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-14 h-14 bg-[#8B6E3C]/[0.04] rounded-bl-[40px]" />
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#8B6E3C]/40" />
                        <span className="text-[9px] text-[#8B6E3C]/60 font-extrabold tracking-[0.15em] uppercase">
                          编者今日按
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B6E3C]/80 leading-relaxed font-serif italic text-justify">
                        "在一切提速的时代，我们反而更需要慢的承载。文字是心流的锚，有节奏的阅读则是心境的过滤器。本栏致力于在日程屏幕一角开辟片刻静谧。"
                      </p>
                    </div>
                    <div className="text-[9px] text-[#8B6E3C]/30 text-right font-bold mt-3">
                      —— 朝花夕拾编辑部
                    </div>
                  </div>
                </div>
              </div>

              {/* 副版面 */}
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em] block border-b border-slate-200 pb-2">
                  今日议题
                </span>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {MOCK_TRENDING_NEWS.slice(1).map((news) => (
                    <div
                      key={news.rank}
                      onClick={() =>
                        openArticle({
                          title: news.title,
                          link: "",
                          pubDate: news.time,
                          author: "本报主笔",
                          description: news.summary,
                          content: news.summary,
                          feedName: news.source,
                        })
                      }
                      className="border border-transparent hover:border-[#E8E0D0] pb-3 flex gap-3 cursor-pointer group p-3 rounded-xl hover:bg-white/60 transition-all duration-200"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 text-xs font-serif font-black text-slate-300 group-hover:bg-[#2D323A] group-hover:text-white transition-all">
                        {news.rank}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm font-serif font-bold text-[#2D323A] leading-snug group-hover:text-[#A34E36] transition-colors line-clamp-2">
                          {news.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {news.summary}
                        </p>
                        <div className="flex gap-2 text-[10px] text-slate-300 font-medium">
                          <span>{news.source}</span>
                          <span>{news.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center pt-4 border-t border-dashed border-slate-200">
                <p className="text-[10px] text-slate-300 font-medium italic">
                  以上为示例内容，切换到「RSS 阅览室」以获取真实订阅数据
                </p>
              </div>
            </div>
          )}

          {/* ═══ RSS Feed ═══ */}
          {activeSubTab === "rss" && (
            <div className="space-y-4 flex-grow flex flex-col min-h-0 animate-[fadeIn_0.3s_ease-out]">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-black text-[#2D323A] flex items-center gap-1.5">
                    <Rss className="w-4 h-4 text-[#8B6E3C]" />
                    {selectedFeed.name}
                  </h2>
                  <span className="text-[9px] text-slate-300 font-medium truncate block max-w-xs">
                    {selectedFeed.url}
                  </span>
                </div>
                <button
                  onClick={() => loadFeedArticles(selectedFeed)}
                  className="bg-white hover:bg-slate-50 text-slate-500 border border-[#E8E0D0] px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  disabled={loading}
                >
                  <RefreshCw
                    className={
                      "w-3 h-3 " + (loading ? "animate-spin" : "")
                    }
                  />
                  刷新
                </button>
              </div>

              {loading ? (
                <div className="flex-grow flex flex-col items-center justify-center py-16 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#8B6E3C]/40" />
                  <span className="text-[10px] text-slate-300 font-medium">
                    正在加载订阅内容...
                  </span>
                </div>
              ) : errorMessage ? (
                <div className="flex-grow flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Newspaper className="w-8 h-8 text-slate-200" />
                  <p className="text-[11px] text-slate-400 font-medium max-w-xs leading-relaxed">
                    {errorMessage}
                  </p>
                  <button
                    onClick={() => loadFeedArticles(selectedFeed)}
                    className="text-[10px] text-[#8B6E3C] font-bold hover:underline cursor-pointer mt-1"
                  >
                    重试
                  </button>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center py-16 text-center text-slate-300">
                  <BookOpen className="w-8 h-8 mb-2" />
                  <p className="text-[11px] font-medium">
                    {searchQuery ? "无匹配文章" : "暂无文章"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                  {filteredArticles.map((article, idx) => (
                    <div
                      key={idx}
                      className="group p-4 bg-white/60 hover:bg-white border border-[#E8E0D0]/60 hover:border-[#E8E0D0] rounded-xl flex flex-col justify-between gap-3 hover:shadow-sm transition-all duration-200 cursor-pointer relative"
                    >
                      {/* Bookmark button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(article);
                        }}
                        className={
                          "absolute top-3 right-3 p-1.5 rounded-lg transition-all cursor-pointer " +
                          (isBookmarked(article)
                            ? "text-[#8B6E3C] bg-[#FAF5ED]"
                            : "text-slate-200 hover:text-[#8B6E3C] hover:bg-[#FAF5ED]/50")
                        }
                        title={
                          isBookmarked(article) ? "取消收藏" : "收藏"
                        }
                      >
                        {isBookmarked(article) ? (
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div
                        className="space-y-2"
                        onClick={() => openArticle(article)}
                      >
                        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium pr-8">
                          {article.author && (
                            <span className="truncate max-w-[120px]">
                              {article.author}
                            </span>
                          )}
                          {article.pubDate && (
                            <>
                              <span className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                              <span>{article.pubDate}</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-sm font-serif font-bold text-[#2D323A] leading-snug group-hover:text-[#A34E36] transition-colors line-clamp-2 pr-6">
                          {article.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {article.description}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1 text-[10px] font-bold text-[#8B6E3C]/60 group-hover:text-[#8B6E3C] transition-colors"
                        onClick={() => openArticle(article)}
                      >
                        <span>阅读全文</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ 每日一言 ═══ */}
          {activeSubTab === "daily" && (
            <div className="flex-grow flex flex-col items-center justify-center animate-[fadeIn_0.3s_ease-out] py-6">
              {/* 诗词主卡片 */}
              <div className="w-full max-w-lg mx-auto">
                <div className="bg-gradient-to-br from-[#FAF7EE] to-[#F3EDE0] border border-[#E8E0D0] rounded-2xl p-8 md:p-10 shadow-sm relative overflow-hidden">
                  {/* 装饰性引号 */}
                  <div className="absolute top-4 left-5 opacity-[0.06]">
                    <Quote className="w-16 h-16 text-[#8B6E3C]" />
                  </div>
                  <div className="absolute bottom-4 right-5 opacity-[0.06] rotate-180">
                    <Quote className="w-12 h-12 text-[#8B6E3C]" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center text-center">
                    {/* 分类标签 */}
                    <span className={"text-[8px] font-extrabold tracking-[0.2em] uppercase mb-5 px-2 py-0.5 rounded " + (currentQuote.category === "poetry" ? "text-[#8B6E3C]/50 bg-[#8B6E3C]/[0.06]" : currentQuote.category === "prose" ? "text-emerald-500/50 bg-emerald-50" : "text-blue-500/50 bg-blue-50")}>
                      {currentQuote.category === "poetry" ? "诗词" : currentQuote.category === "prose" ? "散文" : "名言"}
                    </span>

                    {/* 正文 */}
                    <p className="text-xl md:text-2xl font-serif font-black text-[#2D323A] leading-relaxed tracking-wide max-w-md">
                      {currentQuote.text}
                    </p>

                    {/* 作者 */}
                    <div className="mt-5 flex items-center gap-2">
                      <span className="w-8 h-px bg-[#8B6E3C]/20" />
                      <span className="text-xs text-[#8B6E3C]/60 font-bold">
                        {currentQuote.author}
                        {currentQuote.source && (
                          <span className="font-normal ml-1 text-[#8B6E3C]/40">
                            {"《" + currentQuote.source + "》"}
                          </span>
                        )}
                      </span>
                      <span className="w-8 h-px bg-[#8B6E3C]/20" />
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={shuffleQuote}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-[#8B6E3C] bg-white/60 hover:bg-white border border-[#E8E0D0] transition-all cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    换一句
                  </button>
                  <button
                    onClick={() => toggleSaveQuote(currentQuote)}
                    className={"flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer " + (isQuoteSaved(currentQuote) ? "text-red-400 bg-red-50/60 border-red-100" : "text-slate-400 hover:text-red-400 bg-white/60 hover:bg-red-50/30 border-[#E8E0D0]")}
                  >
                    <Heart className={"w-3 h-3 " + (isQuoteSaved(currentQuote) ? "fill-current" : "")} />
                    {isQuoteSaved(currentQuote) ? "已收藏" : "收藏"}
                  </button>
                  <button
                    onClick={() => handleQuoteAI(currentQuote)}
                    disabled={quoteAiLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold text-[#8B6E3C] bg-[#FAF5ED] hover:bg-[#EFE5D3]/60 border border-[#EFE5D3] transition-all cursor-pointer"
                  >
                    {quoteAiLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {quoteAiLoading ? "赏析中..." : "AI 赏析"}
                  </button>
                </div>

                {/* AI 赏析结果 */}
                {quoteAiComment && (
                  <div className="mt-4 bg-[#FAF5ED] border border-[#EFE5D3] rounded-xl p-4 text-[11px] text-slate-600 leading-relaxed font-serif italic text-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B6E3C]/40 mx-auto mb-2" />
                    {quoteAiComment}
                  </div>
                )}

                {/* 已收藏列表 */}
                {savedQuotes.length > 0 && (
                  <div className="mt-8 pt-5 border-t border-dashed border-[#E8E0D0]">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Heart className="w-3 h-3 text-red-300" />
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em]">
                        收藏的句子 ({savedQuotes.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {savedQuotes.map((q, idx) => (
                        <div
                          key={idx}
                          className="group flex items-start gap-3 p-3 rounded-xl hover:bg-white/60 border border-transparent hover:border-[#E8E0D0] transition-all cursor-pointer"
                          onClick={() => { setCurrentQuote(q); setQuoteAiComment(null); }}
                        >
                          <Quote className="w-3 h-3 text-[#8B6E3C]/20 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-grow">
                            <p className="text-[11px] font-serif text-[#2D323A] leading-relaxed group-hover:text-[#A34E36] transition-colors">
                              {q.text}
                            </p>
                            <span className="text-[9px] text-slate-300 font-medium mt-0.5 block">
                              {q.author}{q.source ? " · " + q.source : ""}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSaveQuote(q); }}
                            className="p-1 rounded text-slate-200 hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Bookmarks ═══ */}
          {activeSubTab === "bookmarks" && (
            <div className="space-y-4 flex-grow animate-[fadeIn_0.3s_ease-out]">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <h2 className="text-lg font-serif font-black text-[#2D323A] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-[#8B6E3C]" />
                  收藏夹
                  <span className="text-sm font-sans font-normal text-slate-300 ml-1">
                    ({filteredBookmarks.length})
                  </span>
                </h2>
              </div>

              {filteredBookmarks.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center py-16 text-center text-slate-300">
                  <Bookmark className="w-8 h-8 mb-2" />
                  <p className="text-[11px] font-medium">
                    {searchQuery
                      ? "无匹配收藏"
                      : "还没有收藏文章，在阅读时点击书签图标即可收藏"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBookmarks.map((article, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 border border-transparent hover:border-[#E8E0D0] cursor-pointer transition-all"
                    >
                      <div
                        className="flex-grow min-w-0"
                        onClick={() => openArticle(article)}
                      >
                        <h4 className="text-sm font-serif font-bold text-[#2D323A] group-hover:text-[#A34E36] transition-colors truncate">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium mt-0.5">
                          {article.feedName && (
                            <span>{article.feedName}</span>
                          )}
                          <span>
                            收藏于{" "}
                            {new Date(
                              article.bookmarkedAt
                            ).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleBookmark(article)}
                        className="p-1.5 rounded-lg text-[#8B6E3C] hover:bg-red-50 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0"
                        title="取消收藏"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 阅读历史 */}
              {readHistory.length > 0 && (
                <div className="mt-6 pt-4 border-t border-dashed border-slate-200">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em]">
                      最近阅读
                    </span>
                  </div>
                  <div className="space-y-1">
                    {readHistory.slice(0, 10).map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 py-1.5 text-[11px] text-slate-400"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                        <span className="truncate font-medium">
                          {entry.title}
                        </span>
                        <span className="text-slate-200 text-[9px] ml-auto flex-shrink-0">
                          {new Date(entry.readAt).toLocaleDateString(
                            "zh-CN"
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ Manage Subscriptions ═══ */}
          {activeSubTab === "manage" && (
            <div className="space-y-5 flex-grow animate-[fadeIn_0.3s_ease-out] max-w-xl mx-auto py-2">
              <div className="bg-gradient-to-r from-[#FAF5ED] to-[#F5F1EA] border border-[#EFE5D3] p-4 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-[#8B6E3C] tracking-wider">
                  订阅管理
                </span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  添加符合 RSS 2.0 或 Atom 规范的订阅源。应用通过 Rust
                  后端代理拉取，无需担心跨域限制。
                </p>
              </div>

              {/* Add Feed Form */}
              <div className="space-y-3 bg-white/70 border border-[#E8E0D0] p-4 rounded-xl">
                <h3 className="text-[11px] font-bold text-slate-600">
                  添加新订阅
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">
                      名称
                    </label>
                    <input
                      type="text"
                      placeholder="如：阮一峰的网络日志"
                      value={newFeedName}
                      onChange={(e) => setNewFeedName(e.target.value)}
                      className="w-full bg-white border border-[#E8E0D0] px-2.5 py-1.5 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:border-[#8B6E3C]/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">
                      分类
                    </label>
                    <select
                      value={newFeedCategory}
                      onChange={(e) =>
                        setNewFeedCategory(
                          e.target.value as RSSFeed["category"]
                        )
                      }
                      className="w-full bg-white border border-[#E8E0D0] px-2 py-1.5 rounded-lg text-[11px] text-slate-600 font-medium focus:outline-none focus:border-[#8B6E3C]/40"
                    >
                      <option value="tech">科技</option>
                      <option value="reading">阅读</option>
                      <option value="daily">日常</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">
                    RSS URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/feed"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    className="w-full bg-white border border-[#E8E0D0] px-2.5 py-1.5 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:border-[#8B6E3C]/40 transition-colors"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddFeed as any}
                    className="bg-[#2D323A] hover:bg-[#1a1e24] text-white px-4 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    确认添加
                  </button>
                </div>
              </div>

              {/* Feed List */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.15em] block">
                  已订阅列表
                </span>
                <div className="space-y-1.5">
                  {feeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="bg-white/60 border border-[#E8E0D0]/60 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-600 block truncate">
                          {feed.name}
                        </span>
                        <span className="text-[9px] text-slate-300 font-medium truncate block max-w-sm">
                          {feed.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={
                            "text-[8px] font-extrabold px-1.5 py-0.5 rounded border " +
                            FEED_CATEGORY_COLORS[feed.category]
                          }
                        >
                          {FEED_CATEGORY_LABELS[feed.category]}
                        </span>
                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="p-1 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
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

      {/* ─── 阅读弹窗 ─── */}
      {selectedArticle &&
        (() => {
          const sizeMap = {
            sm: { title: "text-lg md:text-xl", body: "text-xs md:text-sm leading-relaxed" },
            md: { title: "text-xl md:text-2xl", body: "text-sm md:text-base leading-relaxed" },
            lg: { title: "text-2xl md:text-3xl", body: "text-base md:text-lg leading-loose" },
            xl: { title: "text-3xl md:text-4xl", body: "text-lg md:text-xl leading-loose" },
          };
          const { title: titleCls, body: bodyCls } = sizeMap[readerFontSize];
          const fontCls = readerFontFamily === "serif" ? "font-serif" : "font-sans";
          const colCls = readerColumns === "double" ? "lg:columns-2 lg:gap-8" : "";

          return (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
              <div
                className={
                  "bg-[#FAF7EE] border border-[#E8E0D0] rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl relative animate-[fadeIn_0.2s_ease-out] " +
                  fontCls
                }
              >
                {/* 头部工具栏 */}
                <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-[#E8E0D0]">
                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      setAiSummary(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* 排版控制 */}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 ml-auto">
                    <div className="flex items-center gap-0.5">
                      {(["sm", "md", "lg", "xl"] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => handleFontSizeChange(sz)}
                          className={
                            "w-5 h-5 rounded flex items-center justify-center text-[9px] transition-all cursor-pointer " +
                            (readerFontSize === sz
                              ? "bg-[#2D323A] text-white"
                              : "text-slate-400 hover:bg-slate-100")
                          }
                        >
                          {sz === "sm" ? "A" : sz === "md" ? "A" : sz === "lg" ? "A" : "A"}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleFontFamilyChange(readerFontFamily === "serif" ? "sans" : "serif")}
                      className={"px-2 py-0.5 rounded text-[9px] transition-all cursor-pointer " + (readerFontFamily === "serif" ? "bg-[#2D323A] text-white" : "text-slate-400 hover:bg-slate-100")}
                    >
                      {readerFontFamily === "serif" ? "宋" : "黑"}
                    </button>
                    <button
                      onClick={() => handleColumnsChange(readerColumns === "double" ? "single" : "double")}
                      className={"px-2 py-0.5 rounded text-[9px] transition-all cursor-pointer " + (readerColumns === "double" ? "bg-[#2D323A] text-white" : "text-slate-400 hover:bg-slate-100")}
                    >
                      {readerColumns === "double" ? "双栏" : "单栏"}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedArticle(null);
                      setAiSummary(null);
                    }}
                    className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 文章正文 */}
                <div className="flex-grow overflow-y-auto px-6 md:px-10 py-6 custom-scrollbar">
                  <div className="max-w-2xl mx-auto">
                    <h2 className={titleCls + " font-black text-[#2D323A] mb-4"}>
                      {selectedArticle.title}
                    </h2>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium mb-6 border-b border-[#E8E0D0] pb-4">
                      <span className="font-bold text-[#8B6E3C]">
                        {selectedArticle.feedName || "未知来源"}
                      </span>
                      <span>{selectedArticle.pubDate}</span>
                      {selectedArticle.link && (
                        <a
                          href={selectedArticle.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#8B6E3C] hover:underline ml-auto"
                        >
                          原文 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className={colCls + " " + bodyCls + " text-slate-700 whitespace-pre-wrap"}>
                      {selectedArticle.content || selectedArticle.description || "暂无正文内容，请点击上方「原文」链接阅读完整文章。"}
                    </div>
                  </div>
                </div>

                {/* 底部工具栏 */}
                <div className="border-t border-[#E8E0D0] px-6 py-3 flex items-center gap-3">
                  <button
                    onClick={() => toggleBookmark(selectedArticle)}
                    className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer " + (isBookmarked(selectedArticle) ? "bg-[#FAF5ED] text-[#8B6E3C] border border-[#EFE5D3]" : "text-slate-400 hover:text-[#8B6E3C] border border-transparent hover:border-[#EFE5D3]")}
                  >
                    {isBookmarked(selectedArticle) ? (
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                    {isBookmarked(selectedArticle) ? "已收藏" : "收藏"}
                  </button>
                  <button
                    onClick={() => handleGenerateAISummary(selectedArticle)}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#8B6E3C] bg-[#FAF5ED] hover:bg-[#EFE5D3]/60 border border-[#EFE5D3] transition-all cursor-pointer"
                  >
                    {aiLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {aiLoading ? "生成中..." : "AI 速览"}
                  </button>
                  {aiSummary && (
                    <div className="flex-grow text-[10px] text-slate-500 leading-relaxed font-medium truncate ml-2">
                      {aiSummary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
