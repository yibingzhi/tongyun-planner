import React from "react";
import { Calendar, Coffee } from "lucide-react";
import type { Task } from "../types";

interface CalendarViewProps {
  tasks: Task[];
  handleComplete: (id: string) => void;
  calendarYear: number;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  calendarMonth: number;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  selectedCalendarDate: string;
  setSelectedCalendarDate: (date: string) => void;
  setNewDueDate: (date: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  handleComplete,
  calendarYear,
  setCalendarYear,
  calendarMonth,
  setCalendarMonth,
  selectedCalendarDate,
  setSelectedCalendarDate,
  setNewDueDate,
}) => {
  const renderDayDots = (dateStr: string) => {
    const dayTasks = tasks.filter((t) => t.dueDate === dateStr);
    if (dayTasks.length === 0) return null;

    return dayTasks.slice(0, 3).map((t, idx) => (
      <span
        key={idx}
        className={`w-1 h-1 rounded-full ${
          t.category === "urgent-important"
            ? "bg-[#E8A0BF]"
            : t.category === "important-not-urgent"
            ? "bg-[#C4D7B2]"
            : t.category === "urgent-not-important"
            ? "bg-[#B2C8DF]"
            : "bg-[#F5EBEB]"
        }`}
      />
    ));
  };

  const renderCalendarDays = () => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate();

    const dayElements: React.ReactNode[] = [];

    // 1. 上月余留天数填充
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(
        dayNum
      ).padStart(2, "0")}`;
      dayElements.push(
        <button
          key={`prev-${dayNum}`}
          onClick={() => setSelectedCalendarDate(dateStr)}
          className={`h-11 rounded-xl text-[10px] font-bold text-slate-300 hover:bg-[#FAF8F5] transition-all flex flex-col items-center justify-between py-1 border border-transparent cursor-pointer ${
            selectedCalendarDate === dateStr ? "bg-[#FAF8F5] border-[#EFEBE4]" : ""
          }`}
        >
          <span>{dayNum}</span>
          <div className="flex gap-0.5 justify-center w-full min-h-[4px]">
            {renderDayDots(dateStr)}
          </div>
        </button>
      );
    }

    // 2. 本月天数渲染
    const todayStr = new Date().toISOString().split("T")[0];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(
        dayNum
      ).padStart(2, "0")}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedCalendarDate;

      dayElements.push(
        <button
          key={`curr-${dayNum}`}
          onClick={() => setSelectedCalendarDate(dateStr)}
          className={`h-11 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center justify-between py-1 border cursor-pointer ${
            isSelected
              ? "bg-[#FCF2F0]/80 border-[#F5DFDB] text-[#A34E36]"
              : isToday
              ? "bg-[#F0F5F1] border-[#C4D7B2] text-[#4D7C5D] font-extrabold"
              : "bg-white border-[#FAF8F5] hover:bg-[#FAF8F5] text-slate-700"
          }`}
        >
          <span>{dayNum}</span>
          <div className="flex gap-0.5 justify-center w-full min-h-[4px]">
            {renderDayDots(dateStr)}
          </div>
        </button>
      );
    }

    // 3. 下月起始填充
    const gridRemaining = 42 - dayElements.length;
    for (let dayNum = 1; dayNum <= gridRemaining; dayNum++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(
        dayNum
      ).padStart(2, "0")}`;
      dayElements.push(
        <button
          key={`next-${dayNum}`}
          onClick={() => setSelectedCalendarDate(dateStr)}
          className={`h-11 rounded-xl text-[10px] font-bold text-slate-300 hover:bg-[#FAF8F5] transition-all flex flex-col items-center justify-between py-1 border border-transparent cursor-pointer ${
            selectedCalendarDate === dateStr ? "bg-[#FAF8F5] border-[#EFEBE4]" : ""
          }`}
        >
          <span>{dayNum}</span>
          <div className="flex gap-0.5 justify-center w-full min-h-[4px]">
            {renderDayDots(dateStr)}
          </div>
        </button>
      );
    }

    return dayElements;
  };

  const selectedDayTasks = tasks.filter((t) => t.dueDate === selectedCalendarDate);

  return (
    <div className="animate-fade-in-up flex flex-col gap-4 flex-grow z-10 relative select-none">
      <div className="grid grid-cols-3 gap-6 flex-grow">
        {/* 月历网格页 */}
        <div className="col-span-2 rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col shadow-sm backdrop-blur-sm min-h-[420px]">
          {/* 日历导航 */}
          <div className="flex items-center justify-between pb-3 border-b border-[#EFEBE4] mb-4">
            <h3 className="text-sm font-bold text-[#2D323A] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#4D7C5D]" />
              <span>
                {calendarYear} 年 {calendarMonth + 1} 月
              </span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear((y) => y - 1);
                  } else {
                    setCalendarMonth((m) => m - 1);
                  }
                }}
                className="p-1.5 rounded-lg border border-[#EFEBE4] hover:bg-[#FAF8F5] text-slate-500 transition-colors cursor-pointer"
                title="上个月"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setCalendarYear(today.getFullYear());
                  setCalendarMonth(today.getMonth());
                  setSelectedCalendarDate(today.toISOString().split("T")[0]);
                }}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-[#EFEBE4] hover:bg-[#FAF8F5] text-slate-600 font-extrabold transition-all cursor-pointer"
              >
                回到今日
              </button>
              <button
                onClick={() => {
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear((y) => y + 1);
                  } else {
                    setCalendarMonth((m) => m + 1);
                  }
                }}
                className="p-1.5 rounded-lg border border-[#EFEBE4] hover:bg-[#FAF8F5] text-slate-500 transition-colors cursor-pointer"
                title="下个月"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 星期行标 */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            <span>周日</span>
            <span>周一</span>
            <span>周二</span>
            <span>周三</span>
            <span>周四</span>
            <span>周五</span>
            <span>周六</span>
          </div>

          {/* 日期格子容器 */}
          <div className="grid grid-cols-7 gap-2 flex-grow">{renderCalendarDays()}</div>
        </div>

        {/* 当日任务列表浮面 */}
        <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col shadow-sm backdrop-blur-sm max-h-[480px]">
          <div className="pb-2.5 border-b border-[#EFEBE4] mb-3">
            <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide flex items-center gap-1.5">
              <span>📅 {selectedCalendarDate} 待办任务</span>
            </h3>
          </div>

          {/* 单日列表循环 */}
          <div className="flex-grow overflow-y-auto space-y-2.5 pr-0.5 custom-scrollbar">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-[#FAF8F5]/60 border border-[#EFEBE4]/75 flex justify-between items-center gap-2 group hover:bg-[#FAF8F5] transition-all"
                >
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-xs font-bold text-[#2D323A] truncate">{task.title}</h4>
                    {task.description && (
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="text-[9px] flex-shrink-0 text-[#4D7C5D] hover:bg-[#4D7C5D] hover:text-white border border-[#DEEAE2] px-2 py-0.5 rounded bg-white transition-all font-bold cursor-pointer"
                  >
                    完成
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 gap-2">
                <Coffee className="w-8 h-8 text-[#8B6E3C]/30" />
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  本日无待办任务
                  <br />
                  享受轻松充实的一天吧 ☕
                </p>
              </div>
            )}
          </div>

          {/* 快捷挂载 */}
          <button
            onClick={() => {
              setNewDueDate(selectedCalendarDate);
              const el = document.getElementById("main-add-title-input");
              if (el) el.focus();
            }}
            className="mt-3 w-full bg-[#FAF5ED] hover:bg-[#FAF5ED]/85 text-[#8B6E3C] border border-[#EFE5D3] py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          >
            在本日快捷添加任务 +
          </button>
        </div>
      </div>
    </div>
  );
};
