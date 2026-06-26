import React from "react";
import { Heart, Calendar, Clock, Layers3 } from "lucide-react";
import type { Task } from "../types";
import { PLANNER_COLORS, getDueDateCountdown } from "../constants";

interface MatrixViewProps {
  tasks: Task[];
  handleComplete: (id: string) => void;
  qColors?: {
    "urgent-important": string;
    "important-not-urgent": string;
    "urgent-not-important": string;
    "not-urgent-not-important": string;
  };
}

export const MatrixView: React.FC<MatrixViewProps> = ({ tasks, handleComplete, qColors }) => {
  const quadrants = [
    {
      id: "urgent-important",
      label: "I. 重要且紧急",
      defaultBg: "bg-[#FCF2F0]",
      defaultBorder: "border-[#F5DFDB]",
      defaultText: "text-[#A34E36]",
      defaultDot: "bg-[#E8A0BF]",
      icon: <Heart className="w-3 h-3" />,
    },
    {
      id: "important-not-urgent",
      label: "II. 重要不紧急",
      defaultBg: "bg-[#F0F5F1]",
      defaultBorder: "border-[#DEEAE2]",
      defaultText: "text-[#4D7C5D]",
      defaultDot: "bg-[#C4D7B2]",
      icon: <Calendar className="w-3 h-3" />,
    },
    {
      id: "urgent-not-important",
      label: "III. 紧急不重要",
      defaultBg: "bg-[#F3F2F7]",
      defaultBorder: "border-[#E5E2EE]",
      defaultText: "text-[#5C528B]",
      defaultDot: "bg-[#B2C8DF]",
      icon: <Clock className="w-3 h-3" />,
    },
    {
      id: "not-urgent-not-important",
      label: "IV. 不紧急不重要",
      defaultBg: "bg-[#FAF5ED]",
      defaultBorder: "border-[#EFE5D3]",
      defaultText: "text-[#8B6E3C]",
      defaultDot: "bg-[#F5EBEB]",
      icon: <Layers3 className="w-3 h-3" />,
    },
  ] as const;

  return (
    <div className="animate-fade-in-up grid grid-cols-2 gap-4 flex-grow select-none">
      {quadrants.map((quad) => {
        const quadrantTasks = tasks.filter((t) => t.category === quad.id);

        const colorKey = qColors ? qColors[quad.id] : null;
        const customColor = colorKey ? PLANNER_COLORS[colorKey] : null;

        const bgClass = customColor ? customColor.bg : quad.defaultBg;
        const borderClass = customColor ? customColor.border : quad.defaultBorder;
        const textClass = customColor ? customColor.text : quad.defaultText;

        return (
          <div
            key={quad.id}
            className={`rounded-2xl border ${borderClass} ${bgClass} shadow-[0_8px_20px_-8px_rgba(154,142,128,0.08)] transition-all duration-300 p-5 flex flex-col gap-3.5 min-h-[220px] relative overflow-hidden backdrop-blur-sm hover:-translate-y-0.5`}
          >
            <div className={`flex items-center justify-between border-b ${borderClass} pb-2.5 z-10`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-md ${bgClass} flex items-center justify-center border ${borderClass} ${textClass}`}>
                  {quad.icon}
                </div>
                <span className={`text-xs font-bold ${textClass} tracking-wider`}>
                  {quad.label}
                </span>
              </div>
              <span className={`text-[9px] ${bgClass} border ${borderClass} ${textClass} px-2.5 py-0.5 rounded-full font-bold`}>
                {quadrantTasks.length} 待办
              </span>
            </div>
            <div className="flex-grow space-y-2.5 overflow-y-auto max-h-[190px] pr-1 z-10 custom-scrollbar">
              {quadrantTasks.length > 0 ? (
                quadrantTasks.map((task) => {
                const countdown = getDueDateCountdown(task.dueDate);
                const isOverdue = countdown?.isOverdue;
                const cardBg = isOverdue ? "bg-[#FCF2F0]/50" : "bg-white/70";
                const cardBorder = isOverdue ? "border-[#F5DFDB]" : borderClass;
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl ${cardBg} border ${cardBorder} hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all duration-300 flex justify-between items-center gap-3 relative overflow-hidden group`}
                  >
                    <div className="min-w-0 flex-grow">
                      <h4 className={`text-xs font-bold text-[#2D323A] group-hover:${textClass} transition-colors truncate`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {task.description && (
                          <p className="text-[10px] text-slate-500 truncate">{task.description}</p>
                        )}
                        {countdown && (
                          (() => {
                            const dateTextClass = countdown.isOverdue
                              ? "text-[#A34E36] font-extrabold"
                              : countdown.isToday
                              ? "text-[#A64424] font-extrabold"
                              : "text-slate-400 font-semibold";
                            return (
                              <span className={`text-[9px] flex items-center gap-1 ${dateTextClass}`}>
                                📅 {task.dueDate?.split("-").slice(1).join("/")}
                                <span className="opacity-80">({countdown.text})</span>
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleComplete(task.id)}
                      className={`text-[10px] flex-shrink-0 bg-white border ${borderClass} ${textClass} hover:${bgClass} px-2.5 py-1 rounded-lg transition-all font-bold cursor-pointer`}
                    >
                      完成
                    </button>
                  </div>
                );
              })
              ) : (
                <div className="h-full flex items-center justify-center py-8 text-slate-400 text-[10px] font-bold tracking-wider">
                  本象限暂无待办
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
