import React from "react";
import { Search, Check, Trash2 } from "lucide-react";
import type { Task } from "../types";
import { FILTER_OPTIONS } from "../constants";
import { CustomSelect } from "./CustomSelect";

interface ListViewProps {
  tasks: Task[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  handleComplete: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  expandedNoteId: string | null;
  setExpandedNoteId: (id: string | null) => void;
  editingNotes: string;
  setEditingNotes: (notes: string) => void;
  handleSaveNotes: (id: string, notes: string) => void;
  handleStartFocus: (taskId: string, taskTitle: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  handleComplete,
  handleDeleteTask,
  expandedNoteId,
  setExpandedNoteId,
  editingNotes,
  setEditingNotes,
  handleSaveNotes,
  handleStartFocus,
}) => {
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.notes || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in-up rounded-2xl bg-white/70 border border-[#EFEBE4] p-6 flex flex-col gap-4 flex-grow overflow-y-auto max-h-[480px] custom-scrollbar select-none">
      {/* 筛选与搜索 */}
      <div className="flex gap-3 pb-3 border-b border-[#EFEBE4]">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索待办事项或任务说明..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#FAF8F5]/80 border border-[#EFEBE4] pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors font-medium"
          />
        </div>
        <CustomSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={FILTER_OPTIONS}
          className="w-48"
        />
      </div>

      {/* 列表渲染 */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-2.5 pr-1 custom-scrollbar">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl bg-white border border-[#EFEBE4] hover:border-[#C4D7B2] hover:bg-white/95 hover:shadow-sm transition-all"
            >
              <div className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="w-5 h-5 rounded-full border border-[#EFEBE4] hover:border-[#4D7C5D] hover:bg-[#F0F5F1] flex items-center justify-center transition-all flex-shrink-0 group/btn cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[#4D7C5D] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          task.category === "urgent-important"
                            ? "bg-[#E8A0BF]"
                            : task.category === "important-not-urgent"
                            ? "bg-[#C4D7B2]"
                            : task.category === "urgent-not-important"
                            ? "bg-[#B2C8DF]"
                            : "bg-[#F5EBEB]"
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.description && (
                        <p className="text-xs text-slate-400 font-medium">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          📅 {task.dueDate}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-[11px] text-[#8B6E3C] mt-1 font-semibold italic">
                        📝 {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartFocus(task.id, task.title)}
                    className="text-xs px-3 py-2 rounded-lg border border-[#EFEBE4] hover:bg-[#F0F5F1] hover:text-[#4D7C5D] hover:border-[#C4D7B2] bg-transparent text-slate-500 font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="开始专注于此待办"
                  >
                    ⏱️ 专注
                  </button>
                  <button
                    onClick={() => {
                      setExpandedNoteId(expandedNoteId === task.id ? null : task.id);
                      setEditingNotes(task.notes || "");
                    }}
                    className={`text-xs px-3.5 py-2 rounded-lg border transition-all cursor-pointer font-bold ${
                      expandedNoteId === task.id
                        ? "bg-[#FAF5ED] text-[#8B6E3C] border-[#EFE5D3]"
                        : "bg-transparent text-slate-400 border-[#EFEBE4] hover:bg-[#FAF8F5] hover:text-slate-600"
                    }`}
                  >
                    {task.notes ? "编辑备注" : "添加备注"}
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-xs hover:text-red-600 border border-[#EFEBE4] hover:border-red-100 hover:bg-red-50 p-2 rounded-lg bg-transparent text-slate-400 transition-all cursor-pointer"
                    title="删除任务"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 展开的备注编辑区 */}
              {expandedNoteId === task.id && (
                <div className="px-4 pb-4 pt-1 border-t border-[#EFEBE4] bg-[#FAF8F5]/30 rounded-b-xl">
                  <label className="text-[10px] font-bold text-[#8B6E3C] uppercase tracking-wider block mb-1">
                    📝 任务细节备注
                  </label>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="在此处添加任务备忘或备注细则..."
                    className="w-full bg-[#FAF8F5]/60 border border-[#EFEBE4] px-3 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-all resize-none h-24 custom-scrollbar"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      onClick={() => setExpandedNoteId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-3.5 py-1.5 rounded-lg border border-[#EFEBE4] transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveNotes(task.id, editingNotes)}
                      className="text-xs text-white bg-[#4D7C5D] hover:bg-[#3F684C] px-4 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
                    >
                      保存备注
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <Check className="w-12 h-12 text-[#EFEBE4]" />
          <p className="text-sm text-slate-400 font-bold">清单干净整洁</p>
        </div>
      )}
    </div>
  );
};
