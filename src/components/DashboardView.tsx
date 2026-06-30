import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { Sparkles, History, Circle, CheckCircle2, ListTodo, CloudSun, CalendarDays, Award, Clock } from "lucide-react";
import type { Task, CustomizationConfig } from "../types";
import { getLocalDateString } from "../utils/date";

interface DashboardViewProps {
  tasks: Task[];
  completedTasks: Task[];
  handleComplete: (id: string) => void;
  onTaskClick: (task: Task) => void;
  config: CustomizationConfig;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  completedTasks,
  handleComplete,
  onTaskClick,
  config,
}) => {
  const { t } = useTranslation();
  const d = t.dashboard;

  const [nickname] = useState(() => localStorage.getItem("qiyun_nickname") || "");
  const today = getLocalDateString();

  const hour = new Date().getHours();
  let greetKey: string;
  let greetEmoji: string;
  let greetGradientClass: string;
  
  if (hour >= 5 && hour < 12) {
    greetKey = "morning";
    greetEmoji = "🌤️";
    greetGradientClass = "gradient-text-morning";
  } else if (hour >= 12 && hour < 14) {
    greetKey = "noon";
    greetEmoji = "☀️";
    greetGradientClass = "gradient-text-noon";
  } else if (hour >= 14 && hour < 18) {
    greetKey = "afternoon";
    greetEmoji = "🌤️";
    greetGradientClass = "gradient-text-afternoon";
  } else {
    greetKey = "evening";
    greetEmoji = "🌙";
    greetGradientClass = "gradient-text-evening";
  }

  const greeting = `${d[greetKey]}${nickname ? `, ${nickname}` : ""}!`;

  const todayTasks = tasks.filter((t) => t.dueDate === today);
  const totalCount = tasks.length + completedTasks.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((completedTasks.length / totalCount) * 100);

  // Weather
  const [weather, setWeather] = useState<{
    temp: number;
    icon: string;
    city: string;
    weather: string;
    alerts: { title: string; level: string }[];
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    const city = config.weatherCity?.trim();
    if (!city) return;
    setWeatherLoading(true);
    (async () => {
      try {
        const res = await fetch(`https://uapis.cn/api/v1/misc/weather?city=${encodeURIComponent(city)}`);
        const data = await res.json();
        setWeather({
          temp: data.temperature,
          icon: data.weather_icon,
          city: data.city,
          weather: data.weather,
          alerts: data.alerts || [],
        });
      } catch {
        // weather unavailable
      }
      setWeatherLoading(false);
    })();
  }, [config.weatherCity]);

  // Quote
  const [hitokoto, setHitokoto] = useState<{ text: string; from: string } | null>(null);
  const [loadingHitokoto, setLoadingHitokoto] = useState(false);

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

  // History
  const [historyEvents, setHistoryEvents] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("https://v1.nsuuu.com/api/history");
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data)) {
        setHistoryEvents(data.data.slice(0, 10)); // Fetch up to 10 events for sliding
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

  // Format local date elegantly
  const localDateStr = new Date().toLocaleDateString(
    config.locale === "en" ? "en-US" : "zh-CN",
    {
      month: "short",
      day: "numeric",
      weekday: "long",
    }
  );

  // SVG circular progress parameters
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="animate-fade-in-up flex flex-col gap-5 flex-grow z-10 relative select-none max-w-3xl mx-auto w-full pt-2">
      
      {/* 问候与天气头部模块 */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white/40 border border-[#EFEBE4]/80 p-5 rounded-3xl shadow-xs backdrop-blur-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{greetEmoji}</span>
            <h1 className={`text-2xl font-black tracking-tight ${greetGradientClass}`}>
              {greeting}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <CalendarDays className="w-3.5 h-3.5 text-[#8B6E3C]" />
            <span>{localDateStr}</span>
            <span className="text-[#EFEBE4]">|</span>
            <span className="text-[#8B6E3C] font-semibold">{d.cheerfulDay} ✨</span>
          </div>
        </div>

        {/* Weather Box */}
        {weatherLoading ? (
          <div className="text-[11px] text-slate-400 font-bold animate-pulse bg-white/70 px-4 py-2.5 rounded-full border border-[#EFEBE4]">
            {d.loading}
          </div>
        ) : weather ? (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2 bg-white/80 border border-[#EFEBE4] px-4 py-2 rounded-2xl shadow-2xs">
              <CloudSun className="w-4 h-4 text-[#8B6E3C] animate-pulse-soft" />
              <span className="text-sm font-bold text-[#8B6E3C]">{weather.temp}°C</span>
              <span className="text-xs text-slate-500 font-semibold">{weather.weather}</span>
              <span className="text-[10px] text-slate-400 font-bold bg-[#FAF8F5] px-1.5 py-0.5 rounded">{weather.city}</span>
            </div>
            {weather.alerts.length > 0 && (
              <div className="text-[9px] text-red-500 font-black bg-red-50/80 px-3 py-1 rounded-full border border-red-100 max-w-[200px] truncate">
                ⚠ {weather.alerts[0].title}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 独立精致的 3 个统计小卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 卡片 1: 待办任务 */}
        <div className="stat-card-todo rounded-2xl border border-[#EFEBE4] p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.sidebar.remaining}</span>
            <div className="text-xl font-black text-slate-800 animate-count-up">{tasks.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EFEBE4] flex items-center justify-center shadow-3xs">
            <ListTodo className="w-4.5 h-4.5 text-[#5B99B0]" />
          </div>
        </div>

        {/* 卡片 2: 已完成任务 */}
        <div className="stat-card-done rounded-2xl border border-[#EFEBE4] p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.sidebar.completed}</span>
            <div className="text-xl font-black text-slate-800 animate-count-up">{completedTasks.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white border border-[#EFEBE4] flex items-center justify-center shadow-3xs">
            <Award className="w-4.5 h-4.5 text-[#4D7C5D]" />
          </div>
        </div>

        {/* 卡片 3: 今日进度率 */}
        <div className="stat-card-rate rounded-2xl border border-[#EFEBE4] p-3.5 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.sidebar.progress}</span>
            <div className="text-xl font-black text-slate-800 animate-count-up">{progressPct}%</div>
          </div>
          
          {/* Circular Progress Ring */}
          <div className="relative w-9 h-9 flex items-center justify-center">
            <svg className="progress-ring w-9 h-9">
              {/* Background circle */}
              <circle
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="18"
                cy="18"
              />
              {/* Progress circle */}
              <circle
                className="progress-ring-circle text-[#E8A0BF]"
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="18"
                cy="18"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Quote + History in 2-column on wide screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quote */}
        <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-4.5 shadow-2xs hover:shadow-xs card-hover-lift backdrop-blur-xs flex flex-col justify-between min-h-[150px]">
          <div className="quote-decoration space-y-2">
            {hitokoto ? (
              <>
                <p className="text-xs text-slate-700 leading-relaxed font-bold tracking-wide italic">
                  {hitokoto.text}
                </p>
                {hitokoto.from && (
                  <p className="text-[9px] text-[#8B6E3C] font-black tracking-wider text-right pr-2">
                    —— {hitokoto.from}
                  </p>
                )}
              </>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold">{loadingHitokoto ? d.loading : ""}</span>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100/60 mt-2">
            <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#4D7C5D]" /> Daily Inspiration
            </span>
            <button onClick={fetchHitokoto} className="text-[9px] font-black text-[#4D7C5D] hover:underline cursor-pointer">
              换一句
            </button>
          </div>
        </div>

        {/* History */}
        <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-3.5 shadow-2xs hover:shadow-xs card-hover-lift backdrop-blur-xs flex flex-col justify-between min-h-[130px]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 border-b border-slate-100/60 pb-1 mb-1">
              <History className="w-3 h-3 text-[#8B6E3C]" />
              <h3 className="text-[9px] font-black text-[#8B6E3C] tracking-widest uppercase">
                {d.todayInHistory}
              </h3>
            </div>
            
            {/* Scrollable list box */}
            <div className="space-y-2 max-h-[80px] overflow-y-auto scrollable-card pr-1">
              {historyEvents.length > 0 ? (
                historyEvents.map((evt, idx) => {
                  const match = evt.match(/^(\d{4})年/);
                  const year = match ? match[1] : "";
                  const text = match ? evt.slice(match[0].length) : evt;
                  return (
                    <div key={idx} className="timeline-dot flex items-start gap-2">
                      {year && (
                        <span className="text-[7px] font-black text-[#4D7C5D] bg-[#F0F5F1] px-1 py-0.5 rounded shrink-0">
                          {year}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-600 font-bold leading-relaxed">
                        {text}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-[9px] text-slate-400 font-black text-center py-3">
                  {loadingHistory ? d.loading : d.noEvents}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-0.5">
            <span className="text-[7px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-[#8B6E3C]" /> Timeline
            </span>
          </div>
        </div>
      </div>



      {/* Today's Tasks */}
      <div className="rounded-3xl bg-white/70 border border-[#EFEBE4] shadow-2xs backdrop-blur-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EFEBE4]/60 flex items-center justify-between">
          <h3 className="text-xs font-black text-[#8B6E3C] tracking-wider flex items-center gap-1.5 uppercase">
            <ListTodo className="w-4 h-4" />
            {d.todayTasks}
          </h3>
          <span className="text-[9px] text-[#8B6E3C] font-black bg-[#FAF8F5] border border-[#EFEBE4]/60 px-2.5 py-0.5 rounded-full">
            {todayTasks.length} / {tasks.length}
          </span>
        </div>
        <div className="p-3">
          {todayTasks.length > 0 ? (
            <div className="space-y-1.5">
              {todayTasks.map((task) => {
                // Determine priority bar color from category
                const priorityBarClass = `task-bar-${task.category || "urgent-important"}`;
                
                // Get quad number label
                let quadLabel = "I";
                let quadColor = "text-[#E8A0BF] bg-[#FCF2F0] border-[#F5DFDB]";
                if (task.category === "important-not-urgent") {
                  quadLabel = "II";
                  quadColor = "text-[#4D7C5D] bg-[#F0F5F1] border-[#DEEAE2]";
                } else if (task.category === "urgent-not-important") {
                  quadLabel = "III";
                  quadColor = "text-[#5B99B0] bg-[#EEF5F8] border-[#C5DEE8]";
                } else if (task.category === "not-urgent-not-important") {
                  quadLabel = "IV";
                  quadColor = "text-[#A08B30] bg-[#FBF8EC] border-[#EDE5C8]";
                }

                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/80 border border-[#EFEBE4]/40 hover:border-[#EFEBE4]/90 hover:bg-white hover:-translate-x-1 hover:shadow-2xs transition-all duration-300 cursor-pointer group ${priorityBarClass}`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComplete(task.id);
                      }}
                      className="shrink-0 text-slate-300 hover:text-[#4D7C5D] transition-colors cursor-pointer"
                      title={d.completed_task}
                    >
                      <Circle className="w-4 h-4 group-hover:hidden" />
                      <CheckCircle2 className="w-4 h-4 hidden group-hover:block text-[#4D7C5D]" />
                    </button>
                    
                    {/* Priority badge indicator */}
                    <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded-md ${quadColor} shrink-0`}>
                      {quadLabel}
                    </span>

                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-[#2D323A] truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">{task.description}</p>
                      )}
                    </div>

                    <span className="text-[8.5px] text-slate-400 font-black bg-[#FAF8F5] border border-[#EFEBE4]/60 px-2 py-0.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.dueToday}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <span className="text-3xl block filter saturate-50 animate-pulse-soft">🍃</span>
              <p className="text-xs text-slate-400 font-bold">{d.noTasksToday}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

