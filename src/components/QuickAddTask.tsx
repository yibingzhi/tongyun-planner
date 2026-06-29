import React, { useState, useEffect, useRef } from "react";
import { Plus, Calendar, Flag, Repeat } from "lucide-react";
import type { Task, RepeatType } from "../types";
import { PRIORITY_OPTIONS } from "../constants";
import { CustomSelect } from "./CustomSelect";
import { useTranslation } from "../i18n/LanguageContext";

interface QuickAddTaskProps {
  handleAddTask: (taskData: {
    title: string;
    description: string;
    notes: string;
    category: Task["category"];
    dueDate: string;
    dueTime?: string;
    repeat?: RepeatType;
    tags?: string[];
  }) => void;
  defaultDueDate?: string;
  defaultCategory?: Task["category"];
  placeholder?: string;
  compact?: boolean; // If true, hides description, notes, priority dropdown, etc., just a clean single-line bar
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = React.memo(({
  handleAddTask,
  defaultDueDate,
  defaultCategory = "urgent-important",
  placeholder = "添加任务，按回车保存...",
  compact = false,
}) => {
  const { t } = useTranslation();
  const q = t.quickAdd;
  const tc = t.taskCard;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => defaultDueDate || new Date().toISOString().split("T")[0]);
  const [dueTime, setDueTime] = useState("");
  const [category, setCategory] = useState<Task["category"]>(defaultCategory);
  const [repeat, setRepeat] = useState<RepeatType>("none");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // Track focus to expand extra options (date, priority, etc.) in non-compact mode
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync calendar selected date with local form state
  useEffect(() => {
    if (defaultDueDate) {
      setDueDate(defaultDueDate);
    }
  }, [defaultDueDate]);

  // Sync default category if it changes (useful for Matrix quadrants)
  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [defaultCategory]);

  // Click outside to collapse extra options
  useEffect(() => {
    if (compact) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [compact]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    handleAddTask({
      title: title.trim(),
      description: description.trim(),
      notes: notes.trim(),
      category,
      dueDate,
      dueTime: dueTime || undefined,
      repeat: repeat !== "none" ? repeat : undefined,
      tags: tags.length > 0 ? tags : undefined,
    });

    // Reset fields except date, category, and repeat for ease of adding multiple
    setTitle("");
    setDescription("");
    setNotes("");
    setDueTime("");
    setTags([]);
    setTagInput("");
    setIsFocused(false);
  };

  if (compact) {
    // Super-compact inline addition bar (ideal for MatrixView quadrants)
    return (
      <form
        onSubmit={onSubmit}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full flex items-center gap-2 bg-white/50 border border-[#EFEBE4] px-3 py-1.5 rounded-xl hover:bg-white hover:border-[#C4D7B2] hover:shadow-xs transition-all duration-300"
      >
        <Plus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder={placeholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent border-none text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none font-semibold"
          required
        />
        <button type="submit" className="hidden" />
      </form>
    );
  }

  // Standard inline quick add bar with inline expandable options
  return (
    <div 
      ref={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full select-none"
    >
      <form
        onSubmit={onSubmit}
        className={`w-full flex flex-col gap-2 bg-white border border-[#EFEBE4] rounded-2xl shadow-xs transition-all duration-300 ${
          isFocused ? "border-[#C4D7B2] shadow-sm ring-1 ring-[#C4D7B2]/30 p-3.5" : "px-4 py-2.5 hover:border-[#C4D7B2]"
        }`}
      >
        <div className="flex items-center gap-3 w-full">
          <Plus className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none font-semibold"
            required
          />
          
          {/* Collapsed view quick icons indicator */}
          {!isFocused && (
            <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
                <span className="text-[9px] font-bold bg-[#FAF8F5] border border-[#EFEBE4]/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            📅 {dueDate.split("-").slice(1).join("/")}{dueTime ? ` ${dueTime}` : ""}
                          </span>
            </div>
          )}
        </div>

        {/* Expanded options panel when focused */}
        {isFocused && (
          <div className="flex flex-col gap-2.5 pt-2.5 border-t border-[#FAF8F5] animate-fade-in-up">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={q.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EFEBE4]/50 px-3 py-1.5 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#C4D7B2] transition-colors"
              />
              <input
                type="text"
                placeholder={q.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EFEBE4]/50 px-3 py-1.5 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#C4D7B2] transition-colors"
              />
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#F0F5F1] border border-[#DEEAE2] text-[#4D7C5D] font-bold flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((_, j) => j !== i))} className="cursor-pointer hover:text-red-500">×</button>
                </span>
              ))}
              <input
                type="text"
                placeholder={tc.tagPlaceholder}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    if (!tags.includes(tagInput.trim())) {
                      setTags([...tags, tagInput.trim()]);
                    }
                    setTagInput("");
                  }
                }}
                className="bg-[#FAF8F5] border border-[#EFEBE4]/50 px-2 py-1 rounded-xl text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#C4D7B2] transition-colors w-28"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                {/* Due Date Input */}
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EFEBE4]/50 px-2.5 py-1 rounded-xl cursor-pointer">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-transparent border-none text-[10px] text-slate-700 font-bold focus:outline-none cursor-pointer"
                    title={q.dueDate}
                  />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="bg-transparent border-none text-[10px] text-slate-700 font-bold focus:outline-none cursor-pointer w-16"
                  />
                </div>
                
                {/* Category Selector */}
                <div className="flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-slate-400" />
                  <CustomSelect
                    value={category}
                    onChange={setCategory}
                    options={PRIORITY_OPTIONS}
                    className="w-40 text-[10px]"
                    dropdownAlign="top"
                  />
                </div>
                {/* Repeat Selector */}
                <div className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-slate-400" />
                  <CustomSelect
                    value={repeat}
                    onChange={(v) => setRepeat(v as RepeatType)}
                    options={[
                      { value: "none", label: tc.repeatNone },
                      { value: "daily", label: tc.repeatDaily },
                      { value: "weekly", label: tc.repeatWeekly },
                      { value: "monthly", label: tc.repeatMonthly },
                    ]}
                    className="w-28 text-[10px]"
                    dropdownAlign="top"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFocused(false)}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-[#FAF8F5] transition-colors cursor-pointer border border-[#EFEBE4]/60"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="bg-[#4D7C5D] hover:bg-[#3F684C] text-white px-4 py-1.5 rounded-xl text-[10px] font-bold shadow-xs hover:scale-101 active:scale-99 transition-all cursor-pointer"
                >
                  {q.add}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
});
