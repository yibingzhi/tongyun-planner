import React from "react";
import { Plus } from "lucide-react";
import type { Task } from "../types";
import { PRIORITY_OPTIONS } from "../constants";
import { CustomSelect } from "./CustomSelect";

interface QuickAddTaskProps {
  handleAddTask: (e: React.FormEvent) => void;
  newTitle: string;
  setNewTitle: (t: string) => void;
  newDesc: string;
  setNewDesc: (d: string) => void;
  newNotes: string;
  setNewNotes: (n: string) => void;
  newDueDate: string;
  setNewDueDate: (d: string) => void;
  newCategory: Task["category"];
  setNewCategory: (c: Task["category"]) => void;
}

export const QuickAddTask: React.FC<QuickAddTaskProps> = React.memo(({
  handleAddTask,
  newTitle,
  setNewTitle,
  newDesc,
  setNewDesc,
  newNotes,
  setNewNotes,
  newDueDate,
  setNewDueDate,
  newCategory,
  setNewCategory,
}) => {
  return (
    <form
      onSubmit={handleAddTask}
      className="rounded-2xl bg-white/75 border border-[#EFEBE4] p-5 flex flex-col gap-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-md select-none"
    >
      <div className="flex items-center justify-between border-b border-[#EFEBE4]/60 pb-2">
        <div className="flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#8B6E3C]" />
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wider uppercase">
            添加新的待办任务
          </h3>
        </div>
        <span className="text-[9px] text-[#8B6E3C] font-extrabold bg-[#FAF5ED] border border-[#EFE5D3] px-2 py-0.5 rounded-lg">
          今日规划
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <input
          id="main-add-title-input"
          type="text"
          placeholder="想做些什么呢..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full bg-[#FAF8F5] border border-[#EFEBE4] px-4 py-3 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors font-semibold shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="详情说明 (可选)..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EFEBE4] px-4 py-2.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors"
          />
          <input
            type="text"
            placeholder="备忘备注 (可选)..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-full bg-[#FAF8F5] border border-[#EFEBE4] px-4 py-2.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors"
          />
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="bg-white border border-[#EFEBE4] px-3.5 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#4D7C5D] font-semibold cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              title="截止日期"
            />
            <CustomSelect
              value={newCategory}
              onChange={setNewCategory}
              options={PRIORITY_OPTIONS}
              className="w-48"
              dropdownAlign="top"
            />
          </div>
          <button
            type="submit"
            className="bg-[#4D7C5D] hover:bg-[#3F684C] text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_2px_4px_rgba(77,124,93,0.15)] cursor-pointer hover:scale-101 active:scale-99"
          >
            <Plus className="w-3.5 h-3.5" />
            添加任务
          </button>
        </div>
      </div>
    </form>
  );
});
