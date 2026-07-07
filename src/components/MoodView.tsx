import React, { useState, useMemo } from "react";
import { SmilePlus, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { getLocalDateString } from "../utils/date";

interface MoodViewProps {
  moods: Record<string, number>; // date "YYYY-MM-DD" → mood 1-5
  moodNotes: Record<string, string>; // date → one-line note
  onSetMood: (date: string, mood: number) => void;
  onSetMoodNote: (date: string, note: string) => void;
}

const MOOD_EMOJIS: { value: number; emoji: string; label: string; labelEn: string; color: string }[] = [
  { value: 1, emoji: "😞", label: "很差", labelEn: "Awful", color: "#E57373" },
  { value: 2, emoji: "😔", label: "不好", labelEn: "Bad", color: "#FFB74D" },
  { value: 3, emoji: "😐", label: "一般", labelEn: "Okay", color: "#FFD54F" },
  { value: 4, emoji: "😊", label: "不错", labelEn: "Good", color: "#AED581" },
  { value: 5, emoji: "😄", label: "很棒", labelEn: "Great", color: "#81C784" },
];

function getMoodColor(value: number | undefined): string {
  if (!value) return "transparent";
  const entry = MOOD_EMOJIS.find((m) => m.value === value);
  return entry ? entry.color : "transparent";
}

function getMoodEmoji(value: number | undefined): string {
  if (!value) return "";
  const entry = MOOD_EMOJIS.find((m) => m.value === value);
  return entry ? entry.emoji : "";
}

export const MoodView: React.FC<MoodViewProps> = React.memo(({ moods, moodNotes, onSetMood, onSetMoodNote }) => {
  const today = getLocalDateString();
  const todayMood = moods[today];
  const todayNote = moodNotes[today] || "";
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(todayNote);

  // Calendar navigation
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDay = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(date);
    }
    return cells;
  }, [viewYear, viewMonth]);

  // Stats for current month
  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const entries = Object.entries(moods).filter(([k]) => k.startsWith(prefix));
    if (entries.length === 0) return null;
    const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
    const dist = [0, 0, 0, 0, 0];
    entries.forEach(([, v]) => { dist[v - 1]++; });
    return { count: entries.length, avg, dist };
  }, [moods, viewYear, viewMonth]);

  // Streak: consecutive days with mood logged
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    while (true) {
      const dateStr = getLocalDateString(d);
      if (moods[dateStr] !== undefined) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  }, [moods]);

  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

  const handleSaveNote = () => {
    onSetMoodNote(today, noteText.trim());
    setEditingNote(false);
  };

  return (
    <div className="animate-fade-in-up flex flex-col gap-5 flex-grow z-10 relative select-none max-w-4xl mx-auto w-full">
      {/* Today's Mood Picker */}
      <div className="bg-white/70 border border-[#EFEBE4] rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <SmilePlus className="w-4 h-4 text-[#E8A0BF]" />
          <span className="text-sm font-bold text-[#2D323A]">今日心情</span>
          {streak > 1 && (
            <span className="ml-auto text-[10px] font-bold text-[#E8A0BF] bg-[#E8A0BF]/10 px-2 py-0.5 rounded-full">
              🔥 连续 {streak} 天
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
          {MOOD_EMOJIS.map((m) => (
            <button
              key={m.value}
              onClick={() => onSetMood(today, m.value)}
              className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all cursor-pointer border-2 ${
                todayMood === m.value
                  ? "border-[#4D7C5D] bg-[#F0F5F1] shadow-sm scale-110"
                  : "border-transparent hover:bg-[#FAF8F5] hover:scale-105"
              }`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className={`text-[10px] font-bold ${todayMood === m.value ? "text-[#4D7C5D]" : "text-slate-400"}`}>
                {m.label}
              </span>
            </button>
          ))}
        </div>

        {/* One-line journal */}
        <div className="flex items-center gap-2">
          {editingNote ? (
            <div className="flex gap-2 flex-grow">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveNote(); if (e.key === "Escape") setEditingNote(false); }}
                placeholder="记一句话，给今天留个标记..."
                className="flex-grow bg-white border border-[#EFEBE4] px-3 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                autoFocus
                maxLength={100}
              />
              <button onClick={handleSaveNote} className="text-[10px] px-3 py-1.5 rounded-lg bg-[#4D7C5D] text-white font-bold hover:bg-[#3F684C] transition-all cursor-pointer">保存</button>
              <button onClick={() => { setEditingNote(false); setNoteText(todayNote); }} className="text-[10px] px-3 py-1.5 rounded-lg border border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] transition-all cursor-pointer">取消</button>
            </div>
          ) : (
            <button
              onClick={() => { setNoteText(todayNote); setEditingNote(true); }}
              className="flex-grow text-left text-xs text-slate-400 hover:text-slate-600 bg-[#FAF8F5] border border-[#EFEBE4] px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              {todayNote || "记一句话，给今天留个标记..."}
            </button>
          )}
        </div>
      </div>

      {/* Heatmap Calendar */}
      <div className="bg-white/70 border border-[#EFEBE4] rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#4D7C5D]" />
            <span className="text-sm font-bold text-[#2D323A]">心情趋势</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-[#FAF8F5] transition-all cursor-pointer text-slate-400 hover:text-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-600 min-w-[80px] text-center">
              {viewYear} · {MONTH_NAMES[viewMonth]}
            </span>
            <button onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-[#FAF8F5] transition-all cursor-pointer text-slate-400 hover:text-slate-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">{w}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
            const day = parseInt(date.split("-")[2], 10);
            const moodVal = moods[date];
            const moodColor = getMoodColor(moodVal);
            const emoji = getMoodEmoji(moodVal);
            const isToday = date === today;
            const note = moodNotes[date];
            const isFuture = date > today;

            return (
              <div
                key={date}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all group ${
                  isToday ? "ring-2 ring-[#4D7C5D]/30" : ""
                } ${isFuture ? "opacity-30" : ""}`}
                style={{
                  backgroundColor: moodVal ? `${moodColor}30` : "#FAF8F5",
                  borderWidth: 1,
                  borderColor: moodVal ? `${moodColor}50` : "#EFEBE4",
                }}
                title={note ? `${date}: ${emoji} ${note}` : date}
              >
                <span className="text-[10px] font-bold text-slate-500">{day}</span>
                {moodVal && <span className="text-sm leading-none">{emoji}</span>}

                {/* Tooltip on hover */}
                {note && (
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#2D323A] text-white text-[9px] font-medium px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 max-w-[160px] truncate">
                    {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-[#EFEBE4]">
          {MOOD_EMOJIS.map((m) => (
            <div key={m.value} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: `${m.color}60` }} />
              <span className="text-[9px] text-slate-400 font-medium">{m.emoji} {m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary */}
      {monthStats && (
        <div className="bg-white/70 border border-[#EFEBE4] rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold text-[#2D323A]">本月统计</span>
            <span className="text-[10px] text-slate-400 font-medium">共 {monthStats.count} 天有记录</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Average mood */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">{getMoodEmoji(Math.round(monthStats.avg))}</span>
              <span className="text-xs font-bold text-[#2D323A]">{monthStats.avg.toFixed(1)}</span>
              <span className="text-[9px] text-slate-400 font-medium">平均心情</span>
            </div>

            {/* Distribution bars */}
            <div className="flex-grow flex items-end gap-2 h-16">
              {MOOD_EMOJIS.map((m, i) => {
                const count = monthStats.dist[i];
                const maxCount = Math.max(...monthStats.dist, 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={m.value} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500">{count}</span>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max(height, 4)}%`,
                        backgroundColor: `${m.color}80`,
                        minHeight: "4px",
                      }}
                    />
                    <span className="text-xs">{m.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent mood entries */}
      {(() => {
        const recentEntries = Object.entries(moods)
          .filter(([date]) => !!moodNotes[date])
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 10);

        if (recentEntries.length === 0) return null;

        return (
          <div className="bg-white/70 border border-[#EFEBE4] rounded-2xl p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-[#2D323A]">心情日记</span>
            </div>
            <div className="space-y-2">
              {recentEntries.map(([date, value]) => (
                <div key={date} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EFEBE4]">
                  <span className="text-lg">{getMoodEmoji(value)}</span>
                  <div className="flex-grow">
                    <span className="text-[10px] text-slate-400 font-medium">{date}</span>
                    <p className="text-xs text-slate-700 font-medium">{moodNotes[date]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
});
