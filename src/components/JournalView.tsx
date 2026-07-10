import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react";
import { BookOpen, CalendarDays, StickyNote as NoteIcon, Plus, Trash2, Search, Link2, ListChecks, Image as ImageIcon, X, SmilePlus, Heading2, Bold, Italic, List, CheckSquare, Code, Link as LinkIcon, Sparkles } from "lucide-react";
import type { JournalEntry, Task, Attachment, CustomizationConfig } from "../types";
import { JOURNAL_TEMPLATES, extractJournalTags, contentLinksTo } from "../constants";
import { JournalMarkdown } from "../utils/journalMarkdown";
import { createId } from "../utils/id";
import { getLocalDateString } from "../utils/date";
import { useTranslation } from "../i18n/LanguageContext";
import { storageManager, getAttachmentPath } from "../utils/storage";
import { callAI } from "../utils/aiEngine";

const MOOD_EMOJIS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "很差" },
  { value: 2, emoji: "😔", label: "不好" },
  { value: 3, emoji: "😐", label: "一般" },
  { value: 4, emoji: "😊", label: "不错" },
  { value: 5, emoji: "😄", label: "很棒" },
];

interface MoodPanelProps {
  date: string;
  mood?: number;
  note: string;
  attachments: Attachment[];
  moods: Record<string, number>;
  onSetMood: (date: string, mood: number) => void;
  onSetMoodNote: (date: string, note: string) => void;
  onSetMoodAttachments: (date: string, attachments: Attachment[]) => void;
}

/** 与心情记录共享同一份按日期的数据，日记里可直接记录/查看 */
function MoodPanel({ date, mood, note, attachments, moods, onSetMood, onSetMoodNote, onSetMoodAttachments }: MoodPanelProps) {
  const { t } = useTranslation();
  const j = t.journal as Record<string, string>;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const blobUrls = useRef<string[]>([]);

  useEffect(() => { setDraft(note); }, [note, date]);
  useEffect(() => {
    blobUrls.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrls.current = [];
    const load = async () => {
      const map: Record<string, string> = {};
      for (const att of attachments) {
        if (!att.type.startsWith("image/")) continue;
        try {
          const url = await storageManager.getFileUrl(att.path, att.type);
          map[att.id] = url;
          blobUrls.current.push(url);
        } catch { /* ignore */ }
      }
      setImgUrls(map);
    };
    load();
    return () => { blobUrls.current.forEach((u) => URL.revokeObjectURL(u)); };
  }, [attachments]);

  const trend = useMemo(() => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const ds = getLocalDateString(d);
      if (moods[ds] !== undefined) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const entries = Object.entries(moods).filter(([k]) => k.startsWith(prefix));
    if (entries.length === 0) return { streak, count: 0, avg: 0, dist: [0, 0, 0, 0, 0] as number[] };
    const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
    const dist = [0, 0, 0, 0, 0];
    entries.forEach(([, v]) => { dist[v - 1]++; });
    return { streak, count: entries.length, avg, dist };
  }, [moods]);

  const saveNote = () => { onSetMoodNote(date, draft); setEditing(false); };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const attId = createId("mood");
      const path = getAttachmentPath("diary-" + date, attId, file.name);
      const savedPath = await storageManager.uploadFile(path, bytes, file.type);
      const att: Attachment = { id: attId, name: file.name, path: savedPath, type: file.type, size: file.size, createdAt: new Date().toISOString() };
      onSetMoodAttachments(date, [...attachments, att]);
      if (file.type.startsWith("image/")) {
        const url = await storageManager.getFileUrl(att.path, att.type);
        setImgUrls((prev) => ({ ...prev, [att.id]: url }));
      }
    } catch (err: any) {
      setError(err?.message ? `上传失败：${err.message}` : "上传失败，请检查存储后端配置");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E8A0BF] mb-2">
        <SmilePlus className="w-3.5 h-3.5" />{j.moodTitle || "今日心情"}
        <span className="text-[9px] font-normal text-slate-400 ml-auto">{date}</span>
      </div>
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {MOOD_EMOJIS.map((m) => (
          <button
            key={m.value}
            onClick={() => onSetMood(date, m.value)}
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-all cursor-pointer border ${
              mood === m.value ? "border-[#E8A0BF] bg-[#FCEFF4] scale-110" : "border-transparent hover:bg-[#FAF8F5]"
            }`}
            title={m.label}
          >
            <span className="text-lg leading-none">{m.emoji}</span>
          </button>
        ))}
      </div>
      <div className="mb-2">
        {editing ? (
          <div className="space-y-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={j.moodPlaceholder || "今天心情如何？写点什么..."}
              className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] resize-y min-h-[52px]"
              autoFocus
            />
            <div className="flex gap-1.5">
              <button onClick={saveNote} className="text-[10px] px-2.5 py-1 rounded-lg bg-[#4D7C5D] text-white font-bold hover:bg-[#3F684C] transition-colors cursor-pointer">{j.save || "保存"}</button>
              <button onClick={() => { setEditing(false); setDraft(note); }} className="text-[10px] px-2.5 py-1 rounded-lg border border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] transition-colors cursor-pointer">{j.cancel || "取消"}</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(note); setEditing(true); }}
            className="w-full text-left text-[11px] text-slate-500 hover:text-slate-700 bg-[#FAF8F5] border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer min-h-[34px]"
          >
            {note || (j.moodPlaceholder || "今天心情如何？写点什么...")}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {attachments.filter((a) => a.type.startsWith("image/")).map((att) => (
          <div key={att.id} className="relative group">
            <button onClick={() => setPreview(imgUrls[att.id] || null)} className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
              {imgUrls[att.id] ? <img src={imgUrls[att.id]} alt={att.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100" />}
            </button>
            <button
              onClick={() => onSetMoodAttachments(date, attachments.filter((a) => a.id !== att.id))}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !storageManager.isConfigured()}
          className="w-12 h-12 rounded-lg border-2 border-dashed border-[#EFEBE4] flex items-center justify-center text-slate-300 hover:text-[#4D7C5D] hover:border-[#4D7C5D] transition-all cursor-pointer disabled:opacity-40"
        >
          {uploading ? <div className="w-3.5 h-3.5 border-2 border-[#4D7C5D] border-t-transparent rounded-full animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </button>
        {error && <p className="text-[9px] text-red-500 w-full">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      {(trend.streak > 0 || trend.count > 0) && (
        <div className="mt-2 pt-2 border-t border-[#FCEFF4] flex items-center gap-2 text-[9px] text-slate-400">
          <span className="text-[#E8A0BF] font-bold">🔥 {trend.streak}</span>
          <span>本月 {trend.count} 天</span>
          <span className="ml-auto flex items-center gap-0.5 opacity-70">
            {MOOD_EMOJIS.map((m) => <span key={m.value}>{m.emoji}</span>)}
          </span>
        </div>
      )}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-8" onClick={() => setPreview(null)}>
          <button onClick={() => setPreview(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer z-10"><X className="w-5 h-5" /></button>
          <img src={preview} alt="preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function ToolbarButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#EFEBE4] text-slate-500 hover:bg-[#F0F5F1] hover:text-[#4D7C5D] hover:border-[#C4D7B2] transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

interface JournalViewProps {
  journal: JournalEntry[];
  onUpsert: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  tasks: Task[];
  habits: { id: string; title: string; emoji: string }[];
  habitLogs: Record<string, string[]>;
  moods: Record<string, number>;
  moodNotes: Record<string, string>;
  moodAttachments: Record<string, Attachment[]>;
  pomodoroLogs: { id: string; timestamp: number; duration: number }[];
  aiConfig: CustomizationConfig;
  onSetMood: (date: string, mood: number) => void;
  onSetMoodNote: (date: string, note: string) => void;
  onSetMoodAttachments: (date: string, attachments: Attachment[]) => void;
}

export function JournalView({ journal, onUpsert, onDelete, tasks, habits, habitLogs, moods, moodNotes, moodAttachments, pomodoroLogs, aiConfig, onSetMood, onSetMoodNote, onSetMoodAttachments }: JournalViewProps) {
  const { t, locale } = useTranslation();
  const j = t.journal as Record<string, string>;
  const today = getLocalDateString();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = useMemo(
    () => journal.find((e) => e.id === selectedId) || null,
    [journal, selectedId]
  );
  const activeMoodDate = selected?.isDaily ? selected.date : today;

  // 本地草稿，避免每次按键都触发父级重渲染造成的光标跳动
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftTemplate, setDraftTemplate] = useState<string>("blank");

  useEffect(() => {
    if (selected) {
      setDraftTitle(selected.title);
      setDraftContent(selected.content);
      setDraftTemplate(selected.templateId || "blank");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const commit = useCallback((patch: Partial<JournalEntry>) => {
    const base = selected || ({
      id: createId("journal"),
      linkKey: today,
      title: today,
      content: "",
      date: today,
      isDaily: true,
      createdAt: Date.now(),
    } as JournalEntry);
    const next: JournalEntry = {
      ...base,
      ...patch,
      updatedAt: Date.now(),
    };
    onUpsert(next);
  }, [selected, onUpsert, today]);

  const handleContentChange = (v: string) => {
    setDraftContent(v);
    commit({ content: v });
  };
  const handleTitleChange = (v: string) => {
    setDraftTitle(v);
    const linkKey = selected?.isDaily ? selected.linkKey : v.trim() || createId("journal");
    commit({ title: v, linkKey });
  };
  const applyTemplate = (id: string) => {
    const tpl = JOURNAL_TEMPLATES.find((x) => x.id === id);
    if (!tpl) return;
    setDraftTemplate(id);
    setDraftContent(tpl.content);
    commit({ templateId: id, content: tpl.content });
  };

  const ensureEntry = useCallback((linkKey: string): JournalEntry => {
    const existing = journal.find((e) => e.linkKey === linkKey);
    if (existing) return existing;
    const isDaily = DATE_RE.test(linkKey);
    const entry: JournalEntry = {
      id: createId("journal"),
      linkKey,
      title: isDaily ? linkKey : linkKey,
      content: "",
      date: isDaily ? linkKey : today,
      isDaily,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpsert(entry);
    return entry;
  }, [journal, onUpsert, today]);

  const navigateToLink = (linkKey: string) => {
    const entry = ensureEntry(linkKey);
    setSelectedId(entry.id);
  };

  const newDaily = () => {
    const entry = ensureEntry(today);
    setSelectedId(entry.id);
  };
  const newNote = () => {
    const title = window.prompt(j.newNoteTitle || "笔记标题", "")?.trim();
    if (!title) return;
    const entry: JournalEntry = {
      id: createId("journal"),
      linkKey: title,
      title,
      content: `# ${title}\n\n`,
      date: today,
      isDaily: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpsert(entry);
    setSelectedId(entry.id);
  };

  const insertLine = (text: string) => {
    const next = draftContent ? `${draftContent}\n- ${text}` : `- ${text}`;
    handleContentChange(next);
  };

  // 工具栏：在光标处插入 markdown 语法
  const insertAtCursor = useCallback((before: string, after = "", placeholder = "") => {
    const ta = textareaRef.current;
    const full = draftContent;
    const start = ta ? ta.selectionStart : full.length;
    const end = ta ? ta.selectionEnd : full.length;
    const sel = full.slice(start, end) || placeholder;
    const next = full.slice(0, start) + before + sel + after + full.slice(end);
    handleContentChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      const pos = start + before.length + sel.length;
      ta.setSelectionRange(pos, pos);
    });
  }, [draftContent, handleContentChange]);

  // 预览里勾选待办 → 翻转源文本中第 idx 个 - [ ] / - [x]
  const handleToggleTodo = useCallback((idx: number) => {
    const lines = draftContent.split("\n");
    let count = -1;
    const next = lines.map((line) => {
      if (/^\s*[-*]\s+\[( |x|X)\]\s/.test(line)) {
        count++;
        if (count === idx) {
          return line.replace(/^(\s*[-*]\s+\[)( |x|X)(\])/, (_m, p1, p2, p3) => p1 + (p2 === " " ? "x" : " ") + p3);
        }
      }
      return line;
    });
    handleContentChange(next.join("\n"));
  }, [draftContent, handleContentChange]);

  const todaysFocus = useMemo(() => {
    const start = new Date(today + "T00:00:00").getTime();
    const end = start + 86400000;
    let minutes = 0;
    let count = 0;
    for (const log of pomodoroLogs) {
      if (log.timestamp >= start && log.timestamp < end) { minutes += log.duration || 0; count++; }
    }
    return { minutes, count };
  }, [pomodoroLogs, today]);

  // 温柔的 AI 评语
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const generateAiComment = useCallback(async () => {
    if (!aiConfig?.aiApiKey) { setAiError(j.needApiKey || "请先在设置中配置 AI API Key"); return; }
    if (!draftContent.trim()) { setAiError(j.emptyContent || "先写点什么，AI 才好回应你～"); return; }
    setAiLoading(true); setAiError(null);
    try {
      const lang = locale === "zh-CN" ? "简体中文" : "English";
      const system = `你是一个温柔、包容的日记伙伴。用户刚写完今天的日记，请认真读它，并用${lang}回复一段简短、温暖、共情的回应（3-5 句，不超过 90 字）。\n要求：\n- 像懂他的朋友，温和地看见他的情绪与努力，不评判、不说教\n- 肯定今天的微小进展；若日记里有疲惫或低落，给予轻轻的安慰与陪伴\n- 可以适当用 1 个 emoji，但不要堆砌\n- 只返回回应文本本身，不要任何前缀、引号或解释`;
      const result = await callAI(aiConfig, system, `这是用户今天的日记：\n${draftContent}`);
      if (result) commit({ aiComment: result });
    } catch (e: any) {
      setAiError(e?.message === "API_KEY_MISSING" ? (j.needApiKey || "请先配置 AI Key") : (j.aiError || "AI 回应失败，请稍后再试"));
    } finally {
      setAiLoading(false);
    }
  }, [aiConfig, draftContent, commit, locale, j]);


  const dailyNotes = useMemo(
    () => journal.filter((e) => e.isDaily).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [journal]
  );
  const notes = useMemo(
    () => journal.filter((e) => !e.isDaily).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [journal]
  );

  const filteredDaily = useMemo(() => {
    if (!search) return dailyNotes;
    const q = search.toLowerCase();
    return dailyNotes.filter((e) => e.content.toLowerCase().includes(q) || e.title.toLowerCase().includes(q));
  }, [dailyNotes, search]);
  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const q = search.toLowerCase();
    return notes.filter((e) => e.content.toLowerCase().includes(q) || e.title.toLowerCase().includes(q));
  }, [notes, search]);

  const backlinks = useMemo(() => {
    if (!selected) return [];
    return journal.filter((e) => e.id !== selected.id && contentLinksTo(e.content, selected.linkKey));
  }, [journal, selected]);

  const todaysTasks = useMemo(
    () => tasks.filter((task) => task.dueDate === today),
    [tasks, today]
  );
  const todaysHabits = habitLogs[today] || [];

  const tags = useMemo(() => extractJournalTags(draftContent), [draftContent]);

  return (
    <div className="flex flex-grow min-h-0 gap-4">
      {/* 左：日记/笔记列表 */}
      <aside className="w-60 flex-shrink-0 flex flex-col gap-3 border-r border-[#EFEBE4] pr-3">
        <div className="flex gap-2">
          <button
            onClick={newDaily}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-[#4D7C5D] hover:bg-[#3F684C] rounded-xl py-2 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />{j.newDaily}
          </button>
          <button
            onClick={newNote}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold text-[#4D7C5D] bg-[#F0F5F1] hover:bg-[#E4EEE6] border border-[#C4D7B2] rounded-xl py-2 cursor-pointer transition-colors"
          >
            <NoteIcon className="w-3.5 h-3.5" />{j.newNote}
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={j.search}
            className="w-full bg-white border border-[#EFEBE4] pl-8 pr-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
          />
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              <CalendarDays className="w-3.5 h-3.5" />{j.dailyNotes}
            </div>
            <div className="space-y-1">
              {filteredDaily.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors cursor-pointer ${
                    selectedId === e.id ? "bg-[#F0F5F1] text-[#4D7C5D] font-semibold" : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{e.title || e.date}</span>
                    {e.content.trim() && <span className="w-1.5 h-1.5 rounded-full bg-[#C4D7B2] flex-shrink-0" />}
                  </div>
                </button>
              ))}
              {filteredDaily.length === 0 && <div className="text-[11px] text-slate-300 px-1">{j.empty}</div>}
            </div>
          </div>

          {filteredNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                <NoteIcon className="w-3.5 h-3.5" />{j.notes}
              </div>
              <div className="space-y-1">
                {filteredNotes.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors cursor-pointer ${
                      selectedId === e.id ? "bg-[#F0F5F1] text-[#4D7C5D] font-semibold" : "text-slate-600 hover:bg-white/60"
                    }`}
                  >
                    <span className="truncate block">{e.title || "(无标题)"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 中：编辑器 */}
      <section className="flex-grow min-w-0 flex flex-col gap-3">
        {!selected ? (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400 gap-3 select-none">
            <BookOpen className="w-12 h-12 opacity-40" />
            <p className="text-sm font-medium">{j.noEntry}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.isDaily && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#F0F5F1] text-[#4D7C5D] flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />{selected.date}
                </span>
              )}
              <input
                value={draftTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={j.titlePlaceholder}
                className="flex-grow min-w-[160px] bg-transparent text-lg font-bold text-[#2D323A] focus:outline-none placeholder-slate-300 border-b border-transparent focus:border-[#EFEBE4] transition-colors"
              />
              <select
                value={draftTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="bg-white border border-[#EFEBE4] px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 focus:outline-none focus:border-[#4D7C5D]"
                title={j.template}
              >
                {JOURNAL_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowPreview((p) => !p)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#EFEBE4] text-slate-500 hover:bg-white cursor-pointer transition-colors"
              >
                {showPreview ? j.write : j.preview}
              </button>
              <button
                onClick={() => { onDelete(selected.id); setSelectedId(null); }}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-[#F5DFDB] text-[#A34E36] hover:bg-[#FCF2F0] cursor-pointer transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />{j.delete}
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-[#8B6E3C] bg-[#8B6E3C]/10 rounded-full px-2 py-0.5 font-medium">#{tag}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 flex-wrap">
              <ToolbarButton title={j.tbHeading || "标题"} onClick={() => insertAtCursor("## ", "", "标题")}><Heading2 className="w-3.5 h-3.5" /></ToolbarButton>
              <ToolbarButton title={j.tbBold || "加粗"} onClick={() => insertAtCursor("**", "**", "加粗")}><Bold className="w-3.5 h-3.5" /></ToolbarButton>
              <ToolbarButton title={j.tbItalic || "斜体"} onClick={() => insertAtCursor("*", "*", "斜体")}><Italic className="w-3.5 h-3.5" /></ToolbarButton>
              <ToolbarButton title={j.tbList || "列表"} onClick={() => insertAtCursor("\n- ", "", "项目")}><List className="w-3.5 h-3.5" /></ToolbarButton>
              <ToolbarButton title={j.tbTodo || "待办"} onClick={() => insertAtCursor("\n- [ ] ", "", "待办")}><CheckSquare className="w-3.5 h-3.5" /></ToolbarButton>
              <ToolbarButton title={j.tbCode || "代码"} onClick={() => insertAtCursor("`", "`", "代码")}><Code className="w-3.5 h-3.5" /></ToolbarButton>
              <ToolbarButton title={j.tbLink || "链接"} onClick={() => insertAtCursor("[[", "]]", "链接")}><LinkIcon className="w-3.5 h-3.5" /></ToolbarButton>
            </div>

            <div className={`flex-grow min-h-0 grid gap-3 ${showPreview ? "grid-cols-2" : "grid-cols-1"}`}>
              <textarea
                ref={textareaRef}
                value={draftContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={"# 标题\n\n- 支持 **加粗** *斜体* `代码`\n- 双向链接 [[2026-07-10]] 或 [[笔记标题]]\n- 标签 #灵感"}
                className="w-full h-full resize-none bg-white border border-[#EFEBE4] rounded-xl p-4 text-[13px] leading-relaxed text-slate-700 font-mono focus:outline-none focus:border-[#4D7C5D] custom-scrollbar"
                spellCheck={false}
              />
              {showPreview && (
                <div className="h-full overflow-y-auto custom-scrollbar bg-[#FAF8F5]/60 border border-[#EFEBE4] rounded-xl p-4">
                  <JournalMarkdown content={draftContent} onLink={navigateToLink} onToggleTodo={handleToggleTodo} />
                </div>
              )}
            </div>
            <div className="rounded-xl bg-gradient-to-br from-[#F0F5F1] to-[#FCEFF4] border border-[#E4EEE6] p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#E8A0BF] mb-2">
                <Sparkles className="w-3.5 h-3.5" />{j.aiCommentTitle || "AI 的温柔回应"}
              </div>
              {selected.aiComment ? (
                <>
                  <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap">{selected.aiComment}</p>
                  <button onClick={generateAiComment} disabled={aiLoading} className="mt-2 text-[10px] text-[#4D7C5D] hover:underline disabled:opacity-40 cursor-pointer">
                    {aiLoading ? "..." : (j.regenerate || "重新生成")}
                  </button>
                </>
              ) : (
                <button onClick={generateAiComment} disabled={aiLoading} className="text-[11px] font-semibold px-3 py-2 rounded-lg bg-white border border-[#E4EEE6] text-[#4D7C5D] hover:bg-[#EAF1EC] transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />{aiLoading ? (j.aiThinking || "正在温柔回应...") : (j.aiGenerate || "完成今天，听听 AI 的温柔回应")}
                </button>
              )}
              {aiError && <p className="text-[10px] text-red-500 mt-2">{aiError}</p>}
            </div>
            <div className="text-[10px] text-slate-400 text-right">
              {j.updatedAt} {new Date(selected.updatedAt).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </div>
          </>
        )}
      </section>

      {/* 右：今日关联 + 反向链接 */}
      <aside className="w-56 flex-shrink-0 flex flex-col gap-4 border-l border-[#EFEBE4] pl-3 overflow-y-auto custom-scrollbar">
        <MoodPanel
          date={activeMoodDate}
          mood={moods[activeMoodDate]}
          note={moodNotes[activeMoodDate] || ""}
          attachments={moodAttachments[activeMoodDate] || []}
          moods={moods}
          onSetMood={onSetMood}
          onSetMoodNote={onSetMoodNote}
          onSetMoodAttachments={onSetMoodAttachments}
        />
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4D7C5D] mb-2">
            <ListChecks className="w-3.5 h-3.5" />{j.todayLinks}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{j.todayTasks}</div>
          <div className="space-y-1 mb-3">
            {todaysTasks.length === 0 && <div className="text-[11px] text-slate-300">{j.noTasks}</div>}
            {todaysTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => insertLine(task.title)}
                className="w-full text-left text-[11px] text-slate-600 bg-white border border-[#EFEBE4] hover:border-[#4D7C5D] rounded-lg px-2 py-1.5 cursor-pointer transition-colors truncate"
                title={task.title}
              >
                {task.title}
              </button>
            ))}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{j.todayHabits}</div>
          <div className="space-y-1">
            {habits.length === 0 && <div className="text-[11px] text-slate-300">{j.noHabits}</div>}
            {habits.map((h) => {
              const done = todaysHabits.includes(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => insertLine(`${h.emoji} ${h.title}`)}
                  className={`w-full text-left text-[11px] rounded-lg px-2 py-1.5 cursor-pointer transition-colors border ${
                    done ? "bg-[#F0F5F1] border-[#C4D7B2] text-[#4D7C5D]" : "bg-white border-[#EFEBE4] text-slate-600 hover:border-[#4D7C5D]"
                  }`}
                >
                  {h.emoji} {h.title} {done && "✓"}
                </button>
              );
            })}
          </div>
          {todaysFocus.count > 0 && (
            <button
              onClick={() => insertLine(`🍅 专注 ${todaysFocus.minutes} 分钟（${todaysFocus.count} 个番茄）`)}
              className="w-full text-left text-[11px] text-[#A64424] bg-[#FBECE5] border border-[#F6DCD2] hover:border-[#E57C58] rounded-lg px-2 py-1.5 cursor-pointer transition-colors mt-2"
              title={j.insertFocus || "插入到日记"}
            >
              🍅 {j.todayFocus || "今日专注"}：{todaysFocus.minutes} 分钟 · {todaysFocus.count} 个番茄
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4D7C5D] mb-2">
            <Link2 className="w-3.5 h-3.5" />{j.backlinks}
          </div>
          <div className="space-y-1">
            {backlinks.length === 0 && <div className="text-[11px] text-slate-300">{j.noBacklinks}</div>}
            {backlinks.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className="w-full text-left text-[11px] text-slate-600 bg-white border border-[#EFEBE4] hover:border-[#4D7C5D] rounded-lg px-2 py-1.5 cursor-pointer transition-colors truncate"
                title={e.title}
              >
                {e.isDaily ? <CalendarDays className="w-3 h-3 inline mr-1" /> : <NoteIcon className="w-3 h-3 inline mr-1" />}
                {e.title || e.date}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
