import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { Sparkles, History, RefreshCw } from "lucide-react";

export const DashboardView: React.FC = () => {
  const { t } = useTranslation();
  const d = t.dashboard;

  const nickname = localStorage.getItem("qiyun_nickname") || "";

  const hour = new Date().getHours();
  let greetKey: string;
  let greetEmoji: string;
  if (hour >= 5 && hour < 12) {
    greetKey = "morning";
    greetEmoji = "🌤";
  } else if (hour >= 12 && hour < 14) {
    greetKey = "noon";
    greetEmoji = "☀️";
  } else if (hour >= 14 && hour < 18) {
    greetKey = "afternoon";
    greetEmoji = "🌤";
  } else {
    greetKey = "evening";
    greetEmoji = "🌙";
  }

  const greeting = `${d[greetKey]}${nickname ? `, ${nickname}` : ""}!`;

  const [hitokoto, setHitokoto] = useState<{ text: string; from: string } | null>(null);
  const [historyEvents, setHistoryEvents] = useState<string[]>([]);
  const [loadingHitokoto, setLoadingHitokoto] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHitokoto = async () => {
    setLoadingHitokoto(true);
    try {
      const res = await fetch("https://v1.hitokoto.cn/");
      const data = await res.json();
      setHitokoto({
        text: data.hitokoto,
        from: data.from_who ? `${data.from_who} · ${data.from}` : data.from,
      });
    } catch {
      setHitokoto({ text: d.quoteFallback, from: "" });
    }
    setLoadingHitokoto(false);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("https://v1.nsuuu.com/api/history");
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data)) {
        setHistoryEvents(data.data.slice(0, 5));
      } else {
        setHistoryEvents([]);
      }
    } catch {
      setHistoryEvents([]);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchHitokoto();
    fetchHistory();
  }, []);

  return (
    <div className="animate-fade-in-up flex flex-col gap-6 flex-grow z-10 relative select-none max-w-3xl mx-auto w-full pt-4">
      {/* 问候区 */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-[#2D323A] tracking-tight">
          {greetEmoji} {greeting}
        </h1>
        <p className="text-sm text-[#8B6E3C] font-bold mt-2 tracking-wide">
          {d.cheerfulDay} ✨
        </p>
      </div>

      {/* 一言卡片 */}
      <div className="rounded-2xl bg-white/80 border border-[#EFEBE4] p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#4D7C5D] mt-0.5 shrink-0" />
          <div className="flex-grow min-w-0">
            {hitokoto ? (
              <>
                <p className="text-sm text-[#2D323A] leading-relaxed font-medium italic">
                  "{hitokoto.text}"
                </p>
                <p className="text-xs text-slate-400 font-bold mt-2">
                  — {hitokoto.from}
                </p>
              </>
            ) : (
              <div className="h-10 flex items-center">
                <span className="text-xs text-slate-400">{loadingHitokoto ? d.loading : ""}</span>
              </div>
            )}
          </div>
          <button
            onClick={fetchHitokoto}
            className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-slate-400 hover:text-[#4D7C5D] transition-all cursor-pointer shrink-0"
            title={d.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${loadingHitokoto ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 历史上的今天 */}
      <div className="rounded-2xl bg-white/80 border border-[#EFEBE4] p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-[#8B6E3C]" />
          <h3 className="text-xs font-extrabold text-[#8B6E3C] tracking-wide">
            {d.todayInHistory}
          </h3>
          <button
            onClick={fetchHistory}
            className="ml-auto p-1 rounded-lg hover:bg-[#FAF8F5] text-slate-400 hover:text-[#4D7C5D] transition-all cursor-pointer"
            title={d.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="space-y-2.5">
          {historyEvents.length > 0 ? (
            historyEvents.map((evt, idx) => {
              const match = evt.match(/^(\d{4})年/);
              const year = match ? match[1] : "";
              const text = match ? evt.slice(match[0].length) : evt;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-[#FAF8F5]/60 border border-[#EFEBE4]/50"
                >
                  {year && (
                    <span className="text-[10px] font-extrabold text-[#4D7C5D] bg-[#F0F5F1] px-2 py-0.5 rounded shrink-0 mt-0.5">
                      {year}
                    </span>
                  )}
                  <span className="text-xs text-slate-600 font-medium leading-relaxed">
                    {text}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 font-bold text-center py-8">
              {loadingHistory ? d.loading : d.noEvents}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
