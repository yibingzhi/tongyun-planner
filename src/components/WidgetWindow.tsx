import React, { useState } from "react";
import {
  BookOpen,
  Unlock,
  Lock,
  Plus,
  ListTodo,
  Check,
  Heart,
  Clock,
  RotateCcw,
  Layers,
  StickyNote,
  Trash2,
  Coffee,
  Calendar,
} from "lucide-react";
import type { Task, StickyNote as StickyNoteType, CustomizationConfig } from "../types";
import { SwipeCard } from "./SwipeCard";
import { CustomSelect } from "./CustomSelect";
import { PRIORITY_OPTIONS, PLANNER_COLORS } from "../constants";
import { NOTE_COLORS } from "./StickyNotesView";
import { StickyPin } from "./StickyPin";

interface WidgetWindowProps {
  tasks: Task[];
  completedTasks: Task[];
  stickyNotes: StickyNoteType[];
  progressPercentage: number;
  isWidgetLocked: boolean;
  handleToggleWidgetLock: (forceState?: boolean) => Promise<void>;
  handleComplete: (id: string) => void;
  handleSnooze: (id: string) => void;
  handleToggleFavorite: (id: string) => void;

  // 便签控制
  handleAddNote: () => void;
  handleDeleteNote: (id: string) => void;
  handleEditNoteText: (id: string, text: string) => void;
  handleChangeNoteColor: (id: string, color: string) => void;

  // 番茄钟控制与同步
  pomodoroIsActive: boolean;
  setPomodoroIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  pomodoroTimeLeft: number;
  setPomodoroTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  pomodoroIsBreak: boolean;
  pomodoroSessionCount: number;
  focusDuration: number;
  setFocusDuration: React.Dispatch<React.SetStateAction<number>>;
  breakDuration: number;
  setBreakDuration: React.Dispatch<React.SetStateAction<number>>;
  syncPomodoro: (
    active: boolean,
    timeLeft: number,
    isBreak: boolean,
    fDur: number,
    bDur: number,
    session: number,
    tId?: string | null,
    tTitle?: string | null
  ) => void;

  // 状态同步
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  saveTasks: (tasks: Task[]) => Promise<void>;
  syncState: (
    taskId: string,
    action: string,
    title?: string,
    description?: string,
    category?: string,
    notes?: string,
    dueDate?: string
  ) => Promise<void>;
  customizationConfig?: CustomizationConfig;
  pomodoroTaskId: string | null;
  pomodoroTaskTitle: string | null;
  setPomodoroTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  setPomodoroTaskTitle: React.Dispatch<React.SetStateAction<string | null>>;
  handleStartFocus: (taskId: string, taskTitle: string) => void;
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({
  tasks,
  completedTasks,
  stickyNotes,
  progressPercentage,
  isWidgetLocked,
  handleToggleWidgetLock,
  handleComplete,
  handleSnooze,
  handleAddNote,
  handleDeleteNote,
  handleEditNoteText,
  handleChangeNoteColor,
  pomodoroIsActive,
  setPomodoroIsActive,
  pomodoroTimeLeft,
  setPomodoroTimeLeft,
  pomodoroIsBreak,
  pomodoroSessionCount,
  focusDuration,
  setFocusDuration,
  breakDuration,
  setBreakDuration,
  syncPomodoro,
  setTasks,
  saveTasks,
  syncState,
  customizationConfig,
  pomodoroTaskId,
  pomodoroTaskTitle,
  setPomodoroTaskId,
  setPomodoroTaskTitle,
  handleStartFocus,
  handleToggleFavorite,
}) => {
  const [widgetView, setWidgetView] = useState<"card" | "list" | "add" | "timer" | "notes">("card");
  const [selectedWidgetNoteId, setSelectedWidgetNoteId] = useState<string | null>(null);

  // 挂件内快捷新建任务的表单状态
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCategory, setNewCategory] = useState<Task["category"]>("urgent-important");
  const [newWidgetDueDate, setNewWidgetDueDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const handleWidgetAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc || undefined,
      notes: newNotes || undefined,
      category: newCategory,
      dueDate: newWidgetDueDate || undefined,
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });

    syncState(
      newTask.id,
      "add",
      newTask.title,
      newTask.description || "",
      newTask.category,
      newTask.notes || "",
      newTask.dueDate
    );
    setNewTitle("");
    setNewDesc("");
    setNewNotes("");
    setWidgetView("card");
  };

  const handleMouseDownDrag = (e: React.PointerEvent) => {
    // 允许按住非交互区拖拽窗口
    if (e.button === 0) {
      import("@tauri-apps/api/webviewWindow").then((m) => {
        m.getCurrentWebviewWindow().startDragging();
      });
    }
  };

  const urgentTasks = tasks.filter((t) => t.category === "urgent-important");
  const displayTask = urgentTasks[0] || tasks[0];

  return (
    <div
      onPointerDown={handleMouseDownDrag}
      className={`w-full h-full p-4 flex flex-col justify-between items-center rounded-2xl glassmorphism-dark text-[#2D323A] border border-[#EFEBE4] select-none overflow-hidden glow-card cursor-move transition-opacity duration-500 ${
        isWidgetLocked 
          ? "opacity-20 hover:opacity-60 theme-glass-solid" 
          : `theme-glass-${customizationConfig?.interfaceGlass || "matte"}`
      } theme-font-${customizationConfig?.fontFamily || "sans"}`}
    >
      {/* 顶部标题栏 */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-200 pointer-events-auto">
        <div data-tauri-drag-region className="flex items-center gap-1.5 flex-grow cursor-move">
          <BookOpen className="w-3.5 h-3.5 text-[#8B6E3C]" />
          <span
            data-tauri-drag-region
            className="text-[10px] font-extrabold tracking-wider text-slate-600 uppercase"
          >
            今日待办
          </span>
          <span
            data-tauri-drag-region
            className="text-[8px] bg-[#FCF2F0] text-[#A34E36] border border-[#F5DFDB] px-2 py-0.5 rounded-full font-bold ml-1"
          >
            {urgentTasks.length} 紧急
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleToggleWidgetLock()}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1 rounded-lg transition-all cursor-pointer ${
              isWidgetLocked
                ? "bg-[#FAF5ED] text-[#8B6E3C] border border-[#EFE5D3]"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
            title={isWidgetLocked ? "解锁挂件（恢复不透明）" : "锁住挂件（半透明幽灵模式）"}
          >
            {isWidgetLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 挂件内容区 */}
      <div className="flex-grow w-full flex flex-col min-h-0 overflow-hidden pointer-events-auto">
        {widgetView === "add" ? (
          /* 挂件内快捷创建任务表单 */
          <form
            onSubmit={handleWidgetAddTask}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-full flex flex-col justify-between py-2.5 px-0.5 text-slate-700"
          >
            <div className="space-y-2 overflow-y-auto pr-0.5 custom-scrollbar">
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
                  任务名称
                </label>
                <input
                  type="text"
                  placeholder="今天要做些什么呢..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors font-medium"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
                  详情描述 (可选)
                </label>
                <input
                  type="text"
                  placeholder="任务详情说明..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors font-medium"
                />
              </div>
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block mb-0.5">
                  截止日期
                </label>
                <input
                  type="date"
                  value={newWidgetDueDate}
                  onChange={(e) => setNewWidgetDueDate(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#4D7C5D] font-medium cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  优先级象限
                </label>
                <CustomSelect
                  value={newCategory}
                  onChange={setNewCategory}
                  options={PRIORITY_OPTIONS}
                  className="w-full"
                  dropdownAlign="top"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100 mt-1.5">
              <button
                type="button"
                onClick={() => setWidgetView("card")}
                className="flex-1 border border-slate-200 hover:bg-slate-50 py-1.5 rounded-lg text-xs font-bold text-slate-500 transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#4D7C5D] hover:bg-[#3F684C] text-white py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                添加任务
              </button>
            </div>
          </form>
        ) : widgetView === "list" ? (
          /* 挂件内紧凑列表视图 */
          <div className="w-full h-full flex flex-col py-2 overflow-hidden">
            <div className="flex-grow overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#FAF8F5]/65 border border-[#EFEBE4]/60 hover:bg-[#FAF8F5] hover:shadow-sm transition-all group"
                  >
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0 hover:border-[#4D7C5D] hover:bg-[#F0F5F1] transition-all flex items-center justify-center group/btn cursor-pointer"
                    >
                      <Check className="w-2.5 h-2.5 text-[#4D7C5D] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </button>
                    <div className="min-w-0 flex-grow">
                      <p className="text-[11px] font-bold text-[#2D323A] truncate leading-tight">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {task.description && (
                          <p className="text-[9px] text-slate-400 truncate font-medium">
                            {task.description}
                          </p>
                        )}
                        {task.dueDate && (
                          <span className="text-[8px] text-slate-400 font-bold flex items-center gap-0.5">
                            <Calendar className="w-2 h-2 text-slate-400" />
                            <span>{task.dueDate.split("-").slice(1).join("/")}</span>
                          </span>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-[9px] text-[#8B6E3C] truncate italic mt-0.5">
                          备注: {task.notes}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const colorKey = customizationConfig?.qColors?.[task.category];
                      const customColor = colorKey ? PLANNER_COLORS[colorKey] : null;
                      const dotClass = customColor ? customColor.dot : (
                        task.category === "urgent-important"
                          ? "bg-[#E8A0BF]"
                          : task.category === "important-not-urgent"
                          ? "bg-[#C4D7B2]"
                          : task.category === "urgent-not-important"
                          ? "bg-[#B2C8DF]"
                          : "bg-[#F5EBEB]"
                      );
                      return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />;
                    })()}
                  </div>
                ))
              ) : (
                <div
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-center py-10 flex flex-col items-center gap-2"
                >
                  <Heart className="w-8 h-8 text-[#E8A0BF]/50" />
                  <p className="text-xs text-slate-400 font-bold">所有待办均已收妥</p>
                </div>
              )}
            </div>
            {tasks.length > 0 && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pt-2 border-t border-slate-100 mt-1.5"
              >
                <div className="w-full h-1 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EFEBE4]">
                  <div
                    className="h-full shimmer-progress rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-slate-500 font-extrabold mt-1 uppercase tracking-wider">
                  <span>完成进度 {completedTasks.length}</span>
                  <span>{progressPercentage}%</span>
                </div>
              </div>
            )}
          </div>
        ) : widgetView === "timer" ? (
          /* 挂件内番茄钟视图 */
          <div
            data-task-id={pomodoroTaskId || ""}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-full flex flex-col items-center justify-center py-4 text-slate-700"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="text-[10px] font-extrabold text-[#A34E36] tracking-wider uppercase bg-[#FCF2F0]/80 border border-[#F5DFDB] px-3 py-1 rounded-full shadow-sm">
                {pomodoroIsBreak ? "休息模式" : "专注模式"}
              </div>

              {pomodoroTaskTitle && (
                <div className="text-[9px] font-bold text-slate-500 max-w-[130px] truncate text-center bg-slate-100/60 px-2.5 py-0.5 rounded border border-slate-200/50" title={pomodoroTaskTitle}>
                  专注中: {pomodoroTaskTitle}
                </div>
              )}

              {/* 倒计时圆圈 card */}
              <div className="w-32 h-32 rounded-full border-4 border-[#FAF8F5] flex flex-col items-center justify-center relative shadow-sm bg-white/60">
                {/* 进度环 background */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    className="stroke-[#EFEBE4]"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    className={`transition-all duration-1000 ease-linear ${
                      pomodoroIsBreak ? "stroke-[#C4D7B2]" : "stroke-[#E8A0BF]"
                    }`}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={(2 * Math.PI * 58).toString()}
                    strokeDashoffset={(
                      2 *
                      Math.PI *
                      58 *
                      (1 -
                        pomodoroTimeLeft /
                          (pomodoroIsBreak ? breakDuration * 60 : focusDuration * 60))
                    ).toString()}
                  />
                </svg>

                {/* 时间及调节控件 */}
                <div className="flex items-center gap-1.5 z-10">
                  {!pomodoroIsActive && (
                    <button
                      onClick={() => {
                        const currentMins = Math.floor(pomodoroTimeLeft / 60);
                        if (currentMins > 1) {
                          const newTime = (currentMins - 1) * 60;
                          setPomodoroTimeLeft(newTime);
                          if (pomodoroIsBreak) {
                            setBreakDuration(currentMins - 1);
                            localStorage.setItem("pomodoro_break_duration", String(currentMins - 1));
                            syncPomodoro(
                              false,
                              newTime,
                              true,
                              focusDuration,
                              currentMins - 1,
                              pomodoroSessionCount
                            );
                          } else {
                            setFocusDuration(currentMins - 1);
                            localStorage.setItem("pomodoro_focus_duration", String(currentMins - 1));
                            syncPomodoro(
                              false,
                              newTime,
                              false,
                              currentMins - 1,
                              breakDuration,
                              pomodoroSessionCount
                            );
                          }
                        }
                      }}
                      className="w-4 h-4 rounded-full bg-[#FAF8F5] hover:bg-slate-200 border border-[#EFEBE4] flex items-center justify-center text-slate-500 font-extrabold text-[10px] cursor-pointer transition-colors shadow-sm"
                      title="减少1分钟"
                    >
                      -
                    </button>
                  )}
                  <span className="text-2xl font-bold font-mono text-[#2D323A]">
                    {Math.floor(pomodoroTimeLeft / 60)
                      .toString()
                      .padStart(2, "0")}
                    :
                    {(pomodoroTimeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  {!pomodoroIsActive && (
                    <button
                      onClick={() => {
                        const currentMins = Math.floor(pomodoroTimeLeft / 60);
                        if (currentMins < 120) {
                          const newTime = (currentMins + 1) * 60;
                          setPomodoroTimeLeft(newTime);
                          if (pomodoroIsBreak) {
                            setBreakDuration(currentMins + 1);
                            localStorage.setItem("pomodoro_break_duration", String(currentMins + 1));
                            syncPomodoro(
                              false,
                              newTime,
                              true,
                              focusDuration,
                              currentMins + 1,
                              pomodoroSessionCount
                            );
                          } else {
                            setFocusDuration(currentMins + 1);
                            localStorage.setItem("pomodoro_focus_duration", String(currentMins + 1));
                            syncPomodoro(
                              false,
                              newTime,
                              false,
                              currentMins + 1,
                              breakDuration,
                              pomodoroSessionCount
                            );
                          }
                        }
                      }}
                      className="w-4 h-4 rounded-full bg-[#FAF8F5] hover:bg-slate-200 border border-[#EFEBE4] flex items-center justify-center text-slate-500 font-extrabold text-[10px] cursor-pointer transition-colors shadow-sm"
                      title="增加1分钟"
                    >
                      +
                    </button>
                  )}
                </div>
                <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1 z-10">
                  第 {pomodoroSessionCount} 个番茄
                </span>
              </div>

              {/* 按钮控制组 */}
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => {
                    const nextActive = !pomodoroIsActive;
                    setPomodoroIsActive(nextActive);
                    syncPomodoro(
                      nextActive,
                      pomodoroTimeLeft,
                      pomodoroIsBreak,
                      focusDuration,
                      breakDuration,
                      pomodoroSessionCount
                    );
                  }}
                  className="w-8 h-8 rounded-full border border-[#EFEBE4] hover:border-[#4D7C5D] bg-white flex items-center justify-center text-slate-700 hover:text-[#4D7C5D] transition-all shadow-sm cursor-pointer"
                  title={pomodoroIsActive ? "暂停" : "开始"}
                >
                  {pomodoroIsActive ? (
                    <svg className="w-3.5 h-3.5 text-[#A34E36]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[#4D7C5D]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setPomodoroIsActive(false);
                    const nextTime = pomodoroIsBreak ? breakDuration * 60 : focusDuration * 60;
                    setPomodoroTimeLeft(nextTime);
                    setPomodoroTaskId(null);
                    setPomodoroTaskTitle(null);
                    syncPomodoro(
                      false,
                      nextTime,
                      pomodoroIsBreak,
                      focusDuration,
                      breakDuration,
                      pomodoroSessionCount,
                      null,
                      null
                    );
                  }}
                  className="w-8 h-8 rounded-full border border-[#EFEBE4] hover:bg-slate-50 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : widgetView === "notes" ? (
          /* 挂件内便签视图 */
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-full flex flex-col overflow-hidden text-slate-700"
          >
            {selectedWidgetNoteId === null ? (
              /* 1. 便签列表子视图 */
              <div className="flex flex-col h-full overflow-hidden py-1">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-dashed border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-500 tracking-wider uppercase">
                    便签列表 ({stickyNotes.length})
                  </span>
                  <button
                    onClick={handleAddNote}
                    className="p-0.5 rounded hover:bg-slate-100 text-[#4D7C5D] cursor-pointer"
                    title="新建便签"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                  {stickyNotes.length > 0 ? (
                    stickyNotes.map((note) => {
                      const theme = NOTE_COLORS[note.color as keyof typeof NOTE_COLORS] || NOTE_COLORS.tea;
                      return (
                        <button
                          key={note.id}
                          onClick={() => setSelectedWidgetNoteId(note.id)}
                          className={`w-full text-left p-2.5 rounded-xl border ${theme.bg} ${theme.border} hover:shadow-xs transition-all flex items-center justify-between cursor-pointer group`}
                        >
                          <span className={`text-[10px] font-semibold truncate flex-grow pr-2 ${theme.text}`}>
                            {note.text.trim() || "(空便签)"}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 flex flex-col items-center gap-2">
                      <StickyNote className="w-8 h-8 text-[#FAF5ED]/60" />
                      <span className="text-[10px] text-slate-400 font-bold">
                        暂无便签，点击右上角 + 新增
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 2. 便签详情编辑子视图 */
              (() => {
                const note = stickyNotes.find((n) => n.id === selectedWidgetNoteId);
                if (!note) {
                  setSelectedWidgetNoteId(null);
                  return null;
                }
                const theme = NOTE_COLORS[note.color as keyof typeof NOTE_COLORS] || NOTE_COLORS.tea;
                return (
                  <div
                    className={`w-full h-full rounded-xl border ${theme.bg} ${theme.border} p-3 flex flex-col justify-between overflow-hidden relative pt-6`}
                  >
                    <StickyPin type={customizationConfig?.pinType || "pin"} />
                    {/* Back to list and Delete */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-200/50 mb-1.5">
                      <button
                        onClick={() => setSelectedWidgetNoteId(null)}
                        className={`text-[9px] font-bold flex items-center gap-0.5 hover:opacity-80 cursor-pointer ${theme.text}`}
                      >
                        ← 返回列表
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteNote(note.id);
                          setSelectedWidgetNoteId(null);
                        }}
                        className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                        title="删除便签"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={note.text}
                      onChange={(e) => handleEditNoteText(note.id, e.target.value)}
                      placeholder="输入便签备忘..."
                      className={`w-full bg-transparent resize-none focus:outline-none text-[10px] font-semibold leading-relaxed placeholder-slate-400/50 custom-scrollbar flex-grow ${theme.text}`}
                      style={{ minHeight: "65px" }}
                    />

                    {/* Color circle selectors */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-slate-200/40">
                      {Object.entries(NOTE_COLORS).map(([colorKey, t]) => (
                        <button
                          key={colorKey}
                          onClick={() => handleChangeNoteColor(note.id, colorKey)}
                          className={`w-3.5 h-3.5 rounded-full ${t.bg} border ${t.border} transition-all hover:scale-120 cursor-pointer ${
                            note.color === colorKey ? "ring-1 ring-slate-400 scale-110" : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        ) : displayTask ? (
          /* 挂件内卡片展示 */
          <div
            onPointerDown={handleMouseDownDrag}
            className="flex-grow flex items-center justify-center w-full cursor-move"
          >
            <SwipeCard
              key={displayTask.id}
              task={displayTask}
              onComplete={handleComplete}
              onSnooze={handleSnooze}
              progressPercentage={progressPercentage}
              qColors={customizationConfig?.qColors}
              cardBackground={customizationConfig?.cardBackground}
              onStartFocus={handleStartFocus}
              onToggleFavorite={handleToggleFavorite}
            />
          </div>
        ) : (
          /* 任务空状态 */
          <div
            onPointerDown={handleMouseDownDrag}
            className="flex-grow flex items-center justify-center w-full cursor-move"
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="text-center p-6 flex flex-col items-center gap-2"
            >
              <Coffee className="w-9 h-9 text-[#8B6E3C]/60" />
              <p className="text-xs text-slate-500 font-bold">今天所有的任务都做完了哦！</p>
              <button
                onClick={() => setWidgetView("add")}
                className="mt-2 text-[10px] text-[#4D7C5D] hover:bg-[#F0F5F1] border border-[#DEEAE2] px-3 py-1 rounded-lg transition-all font-bold uppercase tracking-wider bg-transparent cursor-pointer"
              >
                新建任务 +
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部 Tab 导航 */}
      <div className="w-full pt-2 border-t border-slate-200 flex items-center justify-between pointer-events-auto">
        <div
          data-tauri-drag-region
          className="text-[8px] text-slate-500 font-extrabold uppercase tracking-wider cursor-move py-1 pr-3"
        >
          待办任务: {tasks.length}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWidgetView("card")}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
              widgetView === "card"
                ? "bg-[#FCF2F0]/80 text-[#A34E36] border-[#F5DFDB]"
                : "text-slate-400 hover:text-slate-600 border-transparent"
            }`}
            title="卡片视图"
          >
            <Layers className="w-3 h-3" />
          </button>
          <button
            onClick={() => setWidgetView("list")}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
              widgetView === "list"
                ? "bg-[#FCF2F0]/80 text-[#A34E36] border-[#F5DFDB]"
                : "text-slate-400 hover:text-slate-600 border-transparent"
            }`}
            title="待办清单"
          >
            <ListTodo className="w-3 h-3" />
          </button>
          <button
            onClick={() => setWidgetView("timer")}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
              widgetView === "timer"
                ? "bg-[#FCF2F0]/80 text-[#A34E36] border-[#F5DFDB]"
                : "text-slate-400 hover:text-slate-600 border-transparent"
            }`}
            title="番茄时钟"
          >
            <Clock className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setWidgetView("notes");
              setSelectedWidgetNoteId(null);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
              widgetView === "notes"
                ? "bg-[#FCF2F0]/80 text-[#A34E36] border-[#F5DFDB]"
                : "text-slate-400 hover:text-slate-600 border-transparent"
            }`}
            title="随手便签"
          >
            <StickyNote className="w-3 h-3" />
          </button>
          <button
            onClick={() => setWidgetView("add")}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
              widgetView === "add"
                ? "bg-[#FCF2F0]/80 text-[#A34E36] border-[#F5DFDB]"
                : "text-slate-400 hover:text-slate-600 border-transparent"
            }`}
            title="新建任务"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div
          data-tauri-drag-region
          className="text-[8px] text-slate-500 font-extrabold cursor-move py-1 pl-3"
        >
          进度: {progressPercentage}%
        </div>
      </div>
    </div>
  );
};
