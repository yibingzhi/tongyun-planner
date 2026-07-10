import React, { useState, useMemo, useRef, useEffect } from "react";
import { SmilePlus, ChevronLeft, ChevronRight, TrendingUp, Image, X } from "lucide-react";
import { getLocalDateString } from "../utils/date";
import { storageManager, getAttachmentPath } from "../utils/storage";
import type { Attachment } from "../types";

interface MoodViewProps {
  moods: Record<string, number>;
  moodNotes: Record<string, string>;
  moodAttachments: Record<string, Attachment[]>;
  onSetMood: (date: string, mood: number) => void;
  onSetMoodNote: (date: string, note: string) => void;
  onSetMoodAttachments: (date: string, attachments: Attachment[]) => void;
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

export const MoodView: React.FC<MoodViewProps> = React.memo(({ moods, moodNotes, moodAttachments, onSetMood, onSetMoodNote, onSetMoodAttachments }) => {
  const today = getLocalDateString();
  const todayMood = moods[today];
  const todayNote = moodNotes[today] || "";
  const todayAttachments = moodAttachments[today] || [];
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(todayNote);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const blobUrls = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Load blob URLs for diary images across all dates
  useEffect(() => {
    blobUrls.current.forEach(url => URL.revokeObjectURL(url));
    blobUrls.current = [];
    const load = async () => {
      const map: Record<string, string> = {};
      const all = { ...moodAttachments };
      for (const atts of Object.values(all)) {
        for (const att of atts) {
          if (!att.type.startsWith("image/")) continue;
          try {
            const url = await storageManager.getFileUrl(att.path, att.type);
            map[att.id] = url;
            blobUrls.current.push(url);
          } catch { /* ignore */ }
        }
      }
      setImgUrls(map);
    };
    load();
    return () => { blobUrls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, [moodAttachments]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(date);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const entries = Object.entries(moods).filter(([k]) => k.startsWith(prefix));
    if (entries.length === 0) return null;
    const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
    const dist = [0, 0, 0, 0, 0];
    entries.forEach(([, v]) => { dist[v - 1]++; });
    return { count: entries.length, avg, dist };
  }, [moods, viewYear, viewMonth]);

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
    onSetMoodNote(today, noteText);
    setEditingNote(false);
  };

  // Diary entries with text or attachments
  const diaryEntries = useMemo(() => {
    const allDates = new Set([...Object.keys(moodNotes), ...Object.keys(moodAttachments)]);
    return Array.from(allDates)
      .filter(d => moodNotes[d] || (moodAttachments[d] && moodAttachments[d].length > 0))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 20);
  }, [moodNotes, moodAttachments]);

  return (
    <div className="animate-fade-in-up flex flex-col gap-5 flex-grow z-10 relative select-none max-w-4xl mx-auto w-full">
      {/* Today's Diary */}
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

        {/* Diary text */}
        <div className="mb-3">
          {editingNote ? (
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="今天过得怎么样？写写日记吧..."
                className="w-full bg-white border border-[#EFEBE4] px-3 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] resize-y min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSaveNote} className="text-[10px] px-3 py-1.5 rounded-lg bg-[#4D7C5D] text-white font-bold hover:bg-[#3F684C] transition-all cursor-pointer">保存</button>
                <button onClick={() => { setEditingNote(false); setNoteText(todayNote); }} className="text-[10px] px-3 py-1.5 rounded-lg border border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] transition-all cursor-pointer">取消</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setNoteText(todayNote); setEditingNote(true); }}
              className="w-full text-left text-xs text-slate-400 hover:text-slate-600 bg-[#FAF8F5] border border-[#EFEBE4] px-3 py-2 rounded-xl transition-all cursor-pointer min-h-[40px]"
            >
              {todayNote || "今天过得怎么样？写写日记吧..."}
            </button>
          )}
        </div>

        {/* Diary images */}
        <div className="flex flex-wrap gap-2 mb-2">
          {todayAttachments.map((att) => {
            const src = imgUrls[att.id];
            if (!src || !att.type.startsWith("image/")) return null;
            return (
              <div key={att.id} className="relative group">
                <button onClick={() => setPreviewUrl(src)} className="w-16 h-16 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  <img src={src} alt={att.name} className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={() => onSetMoodAttachments(today, todayAttachments.filter(a => a.id !== att.id))}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !storageManager.isConfigured()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-[#EFEBE4] flex items-center justify-center text-slate-300 hover:text-[#4D7C5D] hover:border-[#4D7C5D] transition-all cursor-pointer disabled:opacity-40"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-[#4D7C5D] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Image className="w-5 h-5" />
            )}
          </button>
          {uploadError && (
            <p className="text-[9px] text-red-500 mt-1 w-full">{uploadError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setUploadError(null);
              try {
                const buffer = await file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                const attId = crypto.randomUUID();
                const path = getAttachmentPath("diary-" + today, attId, file.name);
                const savedPath = await storageManager.uploadFile(path, bytes, file.type);
                const att: Attachment = { id: attId, name: file.name, path: savedPath, type: file.type, size: file.size, createdAt: new Date().toISOString() };
                onSetMoodAttachments(today, [...todayAttachments, att]);
                if (file.type.startsWith("image/")) {
                  const url = await storageManager.getFileUrl(att.path, att.type);
                  setImgUrls(prev => ({ ...prev, [att.id]: url }));
                }
              } catch (err: any) {
                console.error("Upload failed", err);
                setUploadError(err?.message ? `上传失败：${err.message}` : "上传失败，请检查存储后端配置");
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
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

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] font-bold text-slate-400 py-1">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
            const day = parseInt(date.split("-")[2], 10);
            const moodVal = moods[date];
            const moodColor = getMoodColor(moodVal);
            const emoji = getMoodEmoji(moodVal);
            const isToday = date === today;
            const note = moodNotes[date];
            const hasAttachments = moodAttachments[date] && moodAttachments[date].length > 0;
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
                {hasAttachments && (
                  <span className="text-[7px] text-slate-400 leading-none">📷</span>
                )}

                {note && (
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#2D323A] text-white text-[9px] font-medium px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 max-w-[160px] truncate">
                    {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl">{getMoodEmoji(Math.round(monthStats.avg))}</span>
              <span className="text-xs font-bold text-[#2D323A]">{monthStats.avg.toFixed(1)}</span>
              <span className="text-[9px] text-slate-400 font-medium">平均心情</span>
            </div>
            <div className="flex-grow flex items-end gap-2 h-16">
              {MOOD_EMOJIS.map((m, i) => {
                const count = monthStats.dist[i];
                const maxCount = Math.max(...monthStats.dist, 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={m.value} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500">{count}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(height, 4)}%`, backgroundColor: `${m.color}80`, minHeight: "4px" }} />
                    <span className="text-xs">{m.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Diary Timeline */}
      {diaryEntries.length > 0 && (
        <div className="bg-white/70 border border-[#EFEBE4] rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold text-[#2D323A]">📖 心情日记</span>
          </div>
          <div className="space-y-4">
            {diaryEntries.map((date) => {
              const value = moods[date];
              const note = moodNotes[date];
              const atts = moodAttachments[date] || [];
              const imageAtts = atts.filter(a => a.type.startsWith("image/"));
              return (
                <div key={date} className="px-3 py-3 rounded-xl bg-[#FAF8F5] border border-[#EFEBE4]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getMoodEmoji(value)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{date}</span>
                    {value && (
                      <span className="text-[9px] text-slate-500 px-1.5 py-0.5 rounded-full bg-white border border-[#EFEBE4]" style={{ color: getMoodColor(value) }}>
                        {MOOD_EMOJIS.find(m => m.value === value)?.label}
                      </span>
                    )}
                  </div>
                  {note && <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap mb-2">{note}</p>}
                  {imageAtts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {imageAtts.map((att) => {
                        const src = imgUrls[att.id];
                        if (!src) return null;
                        return (
                          <button key={att.id} onClick={() => setPreviewUrl(src)} className="w-14 h-14 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                            <img src={src} alt={att.name} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image preview lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-8" onClick={() => setPreviewUrl(null)}>
          <button onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer z-10">
            <X className="w-5 h-5" />
          </button>
          <img src={previewUrl} alt="preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
});
