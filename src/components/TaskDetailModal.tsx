import React, { useState } from "react";
import { X, Check, Plus, ListTodo, Calendar, Flag, Repeat, Tag } from "lucide-react";
import type { Task } from "../types";
import { useTranslation } from "../i18n/LanguageContext";

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onSaveNotes: (taskId: string, notes: string) => void;
  onUpdateTags: (taskId: string, tags: string[]) => void;
  onEditTask: (taskId: string, updates: Partial<Task>) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = React.memo(({
  task,
  onClose,
  onToggleSubtask,
  onAddSubtask,
  onSaveNotes,
  onUpdateTags,
  onEditTask,
}) => {
  const { t } = useTranslation();
  const tc = t.taskCard;
  const [notes, setNotes] = useState(task.notes || "");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [tags, setTags] = useState<string[]>(task.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [editDueDate, setEditDueDate] = useState(task.dueDate || "");
  const [editDueTime, setEditDueTime] = useState(task.dueTime || "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-[#EFEBE4] w-full max-w-md mx-4 max-h-[80vh] flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFEBE4]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-slate-800 truncate">{task.title}</span>
            {task.repeat && task.repeat !== "none" && (
              <span className="text-[8.5px] px-1.5 py-0.5 rounded-lg border bg-[#F0F5F1] border-[#DEEAE2] text-[#4D7C5D] font-bold flex items-center gap-1 flex-shrink-0">
                <Repeat className="w-2.5 h-2.5" />
                <span>{tc["repeat" + task.repeat.charAt(0).toUpperCase() + task.repeat.slice(1)]}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {/* Tags */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{tc.tags}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#F0F5F1] border border-[#DEEAE2] text-[#4D7C5D] font-bold flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => {
                    const next = tags.filter((_, j) => j !== i);
                    setTags(next);
                    onUpdateTags(task.id, next);
                  }} className="cursor-pointer hover:text-red-500">×</button>
                </span>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                    const next = [...tags, tagInput.trim()];
                    setTags(next);
                    onUpdateTags(task.id, next);
                  }
                  setTagInput("");
                }}
                className="flex items-center bg-[#FAF8F5] border border-[#EFEBE4] px-2 rounded-xl"
              >
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={tc.tagPlaceholder}
                  className="w-20 bg-transparent border-none text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none font-medium py-1"
                />
              </form>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EFEBE4]">
              <Flag className="w-3 h-3" />
              <span>{
                task.category === "urgent-important" ? t.matrix.urgentImportant :
                task.category === "important-not-urgent" ? t.matrix.importantNotUrgent :
                task.category === "urgent-not-important" ? t.matrix.urgentNotImportant :
                t.matrix.notUrgentNotImportant
              }</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EFEBE4]">
              <Calendar className="w-3 h-3" />
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => { setEditDueDate(e.target.value); onEditTask(task.id, { dueDate: e.target.value || undefined }); }}
                className="bg-transparent border-none text-[10px] text-slate-700 font-bold focus:outline-none cursor-pointer w-24"
                title={t.taskCard.dueDate}
              />
              <input
                type="time"
                value={editDueTime}
                onChange={(e) => { setEditDueTime(e.target.value); onEditTask(task.id, { dueTime: e.target.value || undefined }); }}
                className="bg-transparent border-none text-[10px] text-slate-700 font-bold focus:outline-none cursor-pointer w-16"
              />
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ListTodo className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                {tc.subtasks}
              </span>
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="text-[9px] text-slate-400 font-medium">
                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                </span>
              )}
            </div>
            <div className="space-y-1.5 mb-2">
              {(task.subtasks || []).map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => onToggleSubtask(task.id, sub.id)}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                      sub.completed
                        ? "bg-[#4D7C5D] border-[#4D7C5D]"
                        : "border-slate-300 hover:border-[#4D7C5D]"
                    }`}
                  >
                    {sub.completed && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <span className={`text-xs font-medium ${sub.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newSubtaskTitle.trim()) {
                  onAddSubtask(task.id, newSubtaskTitle.trim());
                  setNewSubtaskTitle("");
                }
              }}
              className="flex items-center gap-2 bg-[#FAF8F5] border border-[#EFEBE4] px-3 py-1.5 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder={tc.subtaskPlaceholder}
                className="w-full bg-transparent border-none text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none font-medium"
              />
            </form>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-[#8B6E3C] uppercase tracking-wider block mb-1.5">
              {tc.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.listView.notesPlaceholder}
              className="w-full bg-[#FAF8F5]/60 border border-[#EFEBE4] px-3 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-all resize-none h-20 custom-scrollbar font-medium"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => onSaveNotes(task.id, notes)}
                className="text-[10px] text-white bg-[#4D7C5D] hover:bg-[#3F684C] px-4 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
              >
                {t.listView.saveNotes}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
