import React, { useState, useEffect, useRef } from "react";
import { Plus, Calendar, Flag } from "lucide-react";
import type { Task } from "../types";
import { PRIORITY_OPTIONS } from "../constants";
import { CustomSelect } from "./CustomSelect";

interface QuickAddTaskProps {
  handleAddTask: (taskData: {
    title: string;
    description: string;
    notes: string;
    category: Task["category"];
    dueDate: string;
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => defaultDueDate || new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<Task["category"]>(defaultCategory);
  
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
    });

    // Reset fields except date and category for ease of adding multiple
    setTitle("");
    setDescription("");
    setNotes("");
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
                📅 {dueDate.split("-").slice(1).join("/")}
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
                placeholder="详情说明 (可选)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EFEBE4]/50 px-3 py-1.5 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#C4D7B2] transition-colors"
              />
              <input
                type="text"
                placeholder="备忘备注 (可选)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#EFEBE4]/50 px-3 py-1.5 rounded-xl text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#C4D7B2] transition-colors"
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
                    title="截止日期"
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
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFocused(false)}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-[#FAF8F5] transition-colors cursor-pointer border border-[#EFEBE4]/60"
                >
                  收起
                </button>
                <button
                  type="submit"
                  className="bg-[#4D7C5D] hover:bg-[#3F684C] text-white px-4 py-1.5 rounded-xl text-[10px] font-bold shadow-xs hover:scale-101 active:scale-99 transition-all cursor-pointer"
                >
                  保存待办
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
});
