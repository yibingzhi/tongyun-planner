import React, { useMemo } from "react";
import { Clock, CheckCircle2, Heart, Coffee, BarChart3 } from "lucide-react";
import type { Task, PomodoroLog } from "../types";

interface AnalyticsViewProps {
  pomodoroLogs: PomodoroLog[];
  tasks: Task[];
  completedTasks: Task[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = React.memo(({
  pomodoroLogs,
  tasks,
  completedTasks,
}) => {
  // Memoize top metrics cards
  const { totalHours, totalMinutes, todayPomodoros, avgDuration } = useMemo(() => {
    const totalDur = pomodoroLogs.reduce((acc, curr) => acc + curr.duration, 0);
    const hours = Math.floor(totalDur / 60);
    const minutes = totalDur % 60;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const todayPomos = pomodoroLogs.filter((log) => {
      const logDate = new Date(log.timestamp).toISOString().split("T")[0];
      return logDate === todayStr;
    }).length;

    const avgDur = pomodoroLogs.length > 0 ? Math.round(totalDur / pomodoroLogs.length) : 0;
    
    return {
      totalHours: hours,
      totalMinutes: minutes,
      todayPomodoros: todayPomos,
      avgDuration: avgDur,
    };
  }, [pomodoroLogs]);

  // Memoize pomodoro counts by date for the heatmap (converts O(N) lookups to O(1))
  const pomodoroCountsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    pomodoroLogs.forEach((log) => {
      const logDate = new Date(log.timestamp).toISOString().split("T")[0];
      counts[logDate] = (counts[logDate] || 0) + 1;
    });
    return counts;
  }, [pomodoroLogs]);

  // Memoize task focus statistics
  const { taskStatsList, maxDuration } = useMemo(() => {
    interface TaskStats {
      taskId: string;
      taskTitle: string;
      tomatoCount: number;
      totalDuration: number;
    }

    const taskStatsMap: { [key: string]: TaskStats } = {};

    pomodoroLogs.forEach((log) => {
      const tId = log.taskId || "general";
      const tTitle = log.taskTitle || "自主专注 / 其它未关联任务";

      if (!taskStatsMap[tId]) {
        taskStatsMap[tId] = {
          taskId: tId,
          taskTitle: tTitle,
          tomatoCount: 0,
          totalDuration: 0,
        };
      }
      taskStatsMap[tId].tomatoCount += 1;
      taskStatsMap[tId].totalDuration += log.duration;
    });

    const sortedList = Object.values(taskStatsMap).sort((a, b) => b.totalDuration - a.totalDuration);
    const maxDur = sortedList.length > 0 ? sortedList[0].totalDuration : 1;
    
    return {
      taskStatsList: sortedList,
      maxDuration: maxDur,
    };
  }, [pomodoroLogs]);

  // Heatmap rendering function using memoized map
  const renderHeatmap = () => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const startOfGrid = new Date();
    // 往前推17周的周日
    startOfGrid.setDate(today.getDate() - currentDayOfWeek - 17 * 7);

    const weeks = [];
    for (let w = 0; w < 18; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startOfGrid.getTime());
        cellDate.setDate(startOfGrid.getDate() + (w * 7 + d));
        const dateStr = cellDate.toISOString().split("T")[0];

        // O(1) Map Lookup instead of O(N) Filter
        const count = pomodoroCountsByDate[dateStr] || 0;

        // 软糯粉绿颜色阶梯
        let colorClass = "bg-white/50 border border-[#EFEBE4]/60";
        if (count === 1) colorClass = "bg-[#C4D7B2]/40 border border-[#C4D7B2]/20";
        else if (count === 2) colorClass = "bg-[#C4D7B2]/70 border border-[#C4D7B2]/40";
        else if (count === 3) colorClass = "bg-[#4D7C5D]/70";
        else if (count >= 4) colorClass = "bg-[#3F684C]";

        const isFuture = cellDate.getTime() > today.getTime();
        if (isFuture) {
          colorClass =
            "bg-[#FAF8F5]/20 border border-dashed border-slate-200/40 opacity-40 cursor-not-allowed";
        }

        days.push({
          dateStr,
          count,
          colorClass,
          isToday: dateStr === today.toISOString().split("T")[0],
          isFuture,
        });
      }
      weeks.push(days);
    }

    return (
      <div className="flex gap-1.5 overflow-x-auto py-2 custom-scrollbar justify-center">
        <div className="flex flex-col justify-between text-[8px] font-extrabold text-slate-400 py-1.5 pr-2">
          <span>周日</span>
          <span>周二</span>
          <span>周四</span>
          <span>周六</span>
        </div>
        <div className="flex gap-1.5">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  title={
                    day.isFuture ? "未到来的日子" : `${day.dateStr} : 完成了 ${day.count} 个番茄钟`
                  }
                  className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 ${day.colorClass} ${
                    day.isToday ? "ring-1 ring-[#A34E36] ring-offset-1" : ""
                  } ${day.isFuture ? "" : "cursor-pointer hover:scale-115 hover:shadow-xs"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const categories = [
    {
      id: "urgent-important",
      label: "I. 重要且紧急",
      color: "bg-[#E8A0BF]",
      textColor: "text-[#A34E36]",
      bgClass: "bg-[#FCF2F0]",
    },
    {
      id: "important-not-urgent",
      label: "II. 重要不紧急",
      color: "bg-[#C4D7B2]",
      textColor: "text-[#4D7C5D]",
      bgClass: "bg-[#F0F5F1]",
    },
    {
      id: "urgent-not-important",
      label: "III. 紧急不重要",
      color: "bg-[#B2C8DF]",
      textColor: "text-[#5C528B]",
      bgClass: "bg-[#F3F2F7]",
    },
    {
      id: "not-urgent-not-important",
      label: "IV. 不重要不紧急",
      color: "bg-[#FAF5ED]/80",
      textColor: "text-[#8B6E3C]",
      bgClass: "bg-[#FAF5ED]",
    },
  ] as const;

  const allTotalCount = tasks.length + completedTasks.length;

  return (
    <div className="animate-fade-in-up flex flex-col gap-4 flex-grow z-10 relative select-none">
      {/* Top Metrics Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Focus Time */}
        <div className="p-4 rounded-2xl bg-[#FCF2F0]/80 border border-[#F5DFDB] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#A34E36] shadow-sm">
            <Clock className="w-5 h-5 text-[#A34E36]" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold text-[#A34E36]/80 uppercase tracking-wider block">
              累计专注时长
            </span>
            <span className="text-xs font-bold text-[#2D323A] block truncate">
              {totalHours} 小时 {totalMinutes} 分钟
            </span>
          </div>
        </div>

        {/* Card 2: Total Focus Sessions */}
        <div className="p-4 rounded-2xl bg-[#F0F5F1]/80 border border-[#DEEAE2] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#4D7C5D] shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-[#4D7C5D]" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold text-[#4D7C5D]/80 uppercase tracking-wider block">
              完成番茄钟数
            </span>
            <span className="text-xs font-bold text-[#2D323A] block truncate">
              {pomodoroLogs.length} 个番茄
            </span>
          </div>
        </div>

        {/* Card 3: Today's Focus Sessions */}
        <div className="p-4 rounded-2xl bg-[#F3F2F7]/80 border border-[#E5E2EE] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#5C528B] shadow-sm">
            <Heart className="w-5 h-5 text-[#5C528B] fill-[#E8A0BF]/10" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold text-[#5C528B]/80 uppercase tracking-wider block">
              今日专注完成
            </span>
            <span className="text-xs font-bold text-[#2D323A] block truncate">
              {todayPomodoros} 个
            </span>
          </div>
        </div>

        {/* Card 4: Average Duration */}
        <div className="p-4 rounded-2xl bg-[#FAF5ED]/80 border border-[#EFE5D3] shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#8B6E3C] shadow-sm">
            <Coffee className="w-5 h-5 text-[#8B6E3C]" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-extrabold text-[#8B6E3C]/80 uppercase tracking-wider block">
              单次平均时间
            </span>
            <span className="text-xs font-bold text-[#2D323A] block truncate">{avgDuration} 分钟</span>
          </div>
        </div>
      </div>

      {/* Heatmap & Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* GitHub Style Heatmap Grid */}
        <div className="lg:col-span-2 rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#EFEBE4] mb-4">
            <h3 className="text-xs font-bold text-[#2D323A] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#4D7C5D]" />
              <span>番茄专注热力图 (最近 18 周)</span>
            </h3>
            <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
              <span>少</span>
              <div className="w-2.5 h-2.5 rounded bg-white/50 border border-slate-200" />
              <div className="w-2.5 h-2.5 rounded bg-[#C4D7B2]/40" />
              <div className="w-2.5 h-2.5 rounded bg-[#C4D7B2]/70" />
              <div className="w-2.5 h-2.5 rounded bg-[#4D7C5D]/70" />
              <div className="w-2.5 h-2.5 rounded bg-[#3F684C]" />
              <span>多</span>
            </div>
          </div>
          {renderHeatmap()}
        </div>

        {/* Task Categories Ratios */}
        <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col justify-between shadow-sm backdrop-blur-sm">
          <div className="pb-3 border-b border-[#EFEBE4] mb-3">
            <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide">四象限任务分布比例</h3>
          </div>
          <div className="space-y-3.5 flex-grow flex flex-col justify-center">
            {categories.map((cat) => {
              const total =
                tasks.filter((t) => t.category === cat.id).length +
                completedTasks.filter((t) => t.category === cat.id).length;
              const completed = completedTasks.filter((t) => t.category === cat.id).length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              const distPct = allTotalCount > 0 ? Math.round((total / allTotalCount) * 100) : 0;

              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className={cat.textColor}>{cat.label}</span>
                    <span className="text-slate-500 font-extrabold uppercase">
                      {completed}/{total} ({pct}%) • 分布 {distPct}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-2.5 rounded-full overflow-hidden relative border border-slate-200/40 ${cat.bgClass}`}
                  >
                    <div
                      className={`h-full opacity-35 ${cat.color} absolute left-0 top-0 transition-all duration-500`}
                      style={{ width: `${distPct}%` }}
                    />
                    <div
                      className={`h-full ${cat.color} absolute left-0 top-0 transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 任务维度专注排行 */}
      <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col shadow-sm backdrop-blur-sm">
        <div className="pb-3.5 border-b border-[#EFEBE4] mb-4">
          <h3 className="text-xs font-bold text-[#2D323A] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#A34E36]" />
            <span>任务维度专注时间分布 (Tomato Focus Breakdown)</span>
          </h3>
        </div>
        <div className="space-y-4">
          {taskStatsList.length > 0 ? (
            taskStatsList.map((stat) => {
              const percentage = Math.round((stat.totalDuration / maxDuration) * 100);
              return (
                <div key={stat.taskId} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="md:w-1/4 text-xs font-bold text-slate-700 truncate" title={stat.taskTitle}>
                    {stat.taskTitle}
                  </div>
                  <div className="flex-grow flex items-center gap-3">
                    <div className="flex-grow h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/40">
                      <div
                        className="h-full bg-gradient-to-r from-[#B2C8DF] to-[#C4D7B2] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-500 min-w-[80px] text-right">
                      {stat.tomatoCount} 番茄 • {stat.totalDuration} 分钟
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs font-semibold">
              暂无专注数据，在待办任务上点击 ⏱️ 开始你的第一个番茄钟吧！
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
