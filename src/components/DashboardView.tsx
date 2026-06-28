import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { Sparkles, History, Circle, CheckCircle2, ListTodo, CloudSun } from "lucide-react";
import type { Task, RepeatType } from "../types";
import { QuickAddTask } from "./QuickAddTask";
import type { CustomizationConfig } from "../types";

interface DashboardViewProps {
  tasks: Task[];
  completedTasks: Task[];
  handleComplete: (id: string) => void;
  handleAddTask: (taskData: {
    title: string;
    description: string;
    notes: string;
    category: Task["category"];
    dueDate: string;
    repeat?: RepeatType;
    tags?: string[];
  }) => void;
  onTaskClick: (task: Task) => void;
  config: CustomizationConfig;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  completedTasks,
  handleComplete,
  handleAddTask,
  onTaskClick,
  config,
}) => {
  const { t } = useTranslation();
  const d = t.dashboard;

  const nickname = localStorage.getItem("qiyun_nickname") || "";
  const today = new Date().toISOString().split("T")[0];

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
        setHistoryEvents(data.data.slice(0, 3));
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
    <div className="animate-fade-in-up flex flex-col gap-4 flex-grow z-10 relative select-none max-w-3xl mx-auto w-full pt-2">
      {/* Greeting + Weather */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[#2D323A] tracking-tight">
            {greetEmoji} {greeting}
          </h1>
          <p className="text-sm text-[#8B6E3C] font-bold mt-0.5 tracking-wide">
            {d.cheerfulDay} ✨
          </p>
        </div>
        {weatherLoading ? (
          <div className="text-xs text-slate-400 font-bold animate-pulse bg-[#FAF8F5] px-4 py-2 rounded-full border border-[#EFEBE4]">
            {d.loading}
          </div>
        ) : weather ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-lg font-bold text-[#8B6E3C] bg-[#FAF8F5] px-4 py-1.5 rounded-full border border-[#EFEBE4] flex items-center gap-1.5 whitespace-nowrap">
              <CloudSun className="w-4 h-4" />
              <span>{weather.temp}°C</span>
              <span className="text-xs text-slate-500">{weather.weather}</span>
              <span className="text-[10px] text-slate-400 font-medium">{weather.city}</span>
            </span>
            {weather.alerts.length > 0 && (
              <div className="text-[10px] text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100 max-w-[240px] truncate">
                ⚠ {weather.alerts[0].title}
              </div>
            )}
          </div>
        ) : config.weatherCity ? null : null}
      </div>

      {/* Stats mini bar */}
      <div className="flex items-center gap-4 bg-white/70 border border-[#EFEBE4] px-4 py-2.5 rounded-2xl shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ListTodo className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.common.taskCount.replace("{count}", String(tasks.length))}</span>
        </div>
        <span className="text-[#EFEBE4]">|</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C4D7B2]" />
          <span>{t.common.completed.replace("{count}", String(completedTasks.length))}</span>
        </div>
        <span className="text-[#EFEBE4]">|</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A0BF]" />
          <span>{t.common.progress.replace("{pct}", String(progressPct))}</span>
        </div>
        {todayTasks.length > 0 && (
          <>
            <span className="text-[#EFEBE4]">|</span>
            <span className="text-xs font-bold text-[#4D7C5D]">
              📋 {d.todayTasks} {todayTasks.length}
            </span>
          </>
        )}
      </div>

      {/* Quote + History in 2-column on wide screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quote */}
        <div className="rounded-2xl bg-white/80 border border-[#EFEBE4] p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#4D7C5D] mt-0.5 shrink-0" />
            <div className="flex-grow min-w-0">
              {hitokoto ? (
                <>
                  <p className="text-xs text-[#2D323A] leading-relaxed font-medium italic">
                    "{hitokoto.text}"
                  </p>
                  {hitokoto.from && (
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                      — {hitokoto.from}
                    </p>
                  )}
                </>
              ) : (
                <span className="text-xs text-slate-400">{loadingHitokoto ? d.loading : ""}</span>
              )}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="rounded-2xl bg-white/80 border border-[#EFEBE4] p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-3.5 h-3.5 text-[#8B6E3C]" />
            <h3 className="text-[10px] font-extrabold text-[#8B6E3C] tracking-wide">
              {d.todayInHistory}
            </h3>
          </div>
          <div className="space-y-2">
            {historyEvents.length > 0 ? (
              historyEvents.map((evt, idx) => {
                const match = evt.match(/^(\d{4})年/);
                const year = match ? match[1] : "";
                const text = match ? evt.slice(match[0].length) : evt;
                return (
                  <div key={idx} className="flex items-start gap-2">
                    {year && (
                      <span className="text-[9px] font-extrabold text-[#4D7C5D] bg-[#F0F5F1] px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                        {year}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 font-medium leading-relaxed line-clamp-2">
                      {text}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-400 font-bold text-center py-4">
                {loadingHistory ? d.loading : d.noEvents}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add */}
      <div className="rounded-2xl bg-white/80 border border-[#EFEBE4] shadow-sm backdrop-blur-sm p-3">
        <QuickAddTask
          handleAddTask={handleAddTask}
          defaultDueDate={today}
          placeholder={tasks.length > 0 ? "再添加一个任务..." : "今天的第一件事是什么？"}
          compact={false}
        />
      </div>

      {/* Today's Tasks */}
      <div className="rounded-2xl bg-white/80 border border-[#EFEBE4] shadow-sm backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#EFEBE4]/60 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-[#8B6E3C] tracking-wide flex items-center gap-1.5">
            <ListTodo className="w-4 h-4" />
            {d.todayTasks}
          </h3>
          <span className="text-[10px] text-slate-400 font-bold bg-[#FAF8F5] px-2 py-0.5 rounded-full">
            {todayTasks.filter((t) => t.dueDate === today).length} / {tasks.length}
          </span>
        </div>
        <div className="p-3">
          {todayTasks.length > 0 ? (
            <div className="space-y-1">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
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
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-bold text-[#2D323A] truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{task.description}</p>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold bg-[#FAF8F5] px-2 py-0.5 rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.dueToday}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 font-bold">{d.noTasksToday}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
