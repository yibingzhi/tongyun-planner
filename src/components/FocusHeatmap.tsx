import React, { useMemo } from "react";
import { Flame } from "lucide-react";
import type { PomodoroLog } from "../types";
import { getLocalDateString } from "../utils/date";

interface FocusHeatmapProps {
  pomodoroLogs: PomodoroLog[];
  weeks?: number; // 显示最近多少周,默认 12 周 = 84 天
}

/**
 * 专注热力图
 * 类似 GitHub 贡献图:7 行(周一-周日) x N 列(周)
 * 每格颜色深浅代表当天完成的番茄钟数量
 */
export const FocusHeatmap: React.FC<FocusHeatmapProps> = ({ pomodoroLogs, weeks = 12 }) => {
  const { grid, stats, monthLabels } = useMemo(() => {
    // 1. 汇总每天的番茄数
    const perDay = new Map<string, number>();
    for (const log of pomodoroLogs) {
      if (log.taskId?.startsWith("break")) continue; // 排除休息记录
      const dateStr = getLocalDateString(new Date(log.timestamp));
      perDay.set(dateStr, (perDay.get(dateStr) || 0) + 1);
    }

    // 2. 从今天回退,找到最近周日作为右下角
    // 让每一列是一周,列头是周一,列尾是周日
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // 找到今天所在周的周日(周日 = 0)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const currentSunday = new Date(today);
    currentSunday.setDate(currentSunday.getDate() + daysToSunday);

    // 3. 生成 weeks 列 × 7 行的网格
    // grid[col][row]:col 是从最早到最近的第几周,row 0=周一 ... 6=周日
    const grid: { date: string; count: number; isFuture: boolean }[][] = [];
    const monthLabelSet = new Map<number, string>(); // colIndex -> "1月"

    for (let col = weeks - 1; col >= 0; col--) {
      // 该列的周日
      const colSunday = new Date(currentSunday);
      colSunday.setDate(colSunday.getDate() - col * 7);
      // 该列的周一 = 周日 - 6
      const colMonday = new Date(colSunday);
      colMonday.setDate(colMonday.getDate() - 6);

      const colIndex = weeks - 1 - col;

      const colData: { date: string; count: number; isFuture: boolean }[] = [];
      for (let row = 0; row < 7; row++) {
        const cellDate = new Date(colMonday);
        cellDate.setDate(cellDate.getDate() + row);
        cellDate.setHours(0, 0, 0, 0);
        const dateStr = getLocalDateString(cellDate);
        const count = perDay.get(dateStr) || 0;
        const isFuture = cellDate.getTime() > today.getTime();
        colData.push({ date: dateStr, count, isFuture });

        // 记录列的首行(周一)所在月份,用于列头标注
        if (row === 0) {
          const month = cellDate.getMonth() + 1;
          // 只在月份变化时记一次
          const prev = colIndex > 0 ? monthLabelSet.get(colIndex - 1) : null;
          const label = `${month}月`;
          if (label !== prev) {
            monthLabelSet.set(colIndex, label);
          }
        }
      }
      grid.push(colData);
    }

    // 4. 统计
    let total = 0;
    let activeDays = 0;
    let maxDay = 0;
    for (const col of grid) {
      for (const cell of col) {
        if (cell.isFuture) continue;
        total += cell.count;
        if (cell.count > 0) activeDays++;
        if (cell.count > maxDay) maxDay = cell.count;
      }
    }

    // 计算连续打卡天数(从今天回退)
    let streak = 0;
    const cursor = new Date(today);
    while (true) {
      const key = getLocalDateString(cursor);
      if ((perDay.get(key) || 0) > 0) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      grid,
      stats: { total, activeDays, maxDay, streak },
      monthLabels: monthLabelSet,
    };
  }, [pomodoroLogs, weeks]);

  // 颜色分级:0 / 1-2 / 3-4 / 5-6 / 7+
  const getCellClass = (count: number, isFuture: boolean): string => {
    if (isFuture) return "bg-transparent";
    if (count === 0) return "bg-[#F3EEE8]";
    if (count <= 2) return "bg-[#DEEAE2]";
    if (count <= 4) return "bg-[#B8D4C1]";
    if (count <= 6) return "bg-[#7FB08D]";
    return "bg-[#4D7C5D]";
  };

  const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-4 shadow-2xs backdrop-blur-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#A34E36]" />
          <span className="text-[10px] font-black text-[#8B6E3C] tracking-widest uppercase">
            专注热力图
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[9px] font-bold text-slate-500">
          <span>
            近 {weeks} 周 · <span className="text-[#4D7C5D]">{stats.total}</span> 个番茄
          </span>
          <span className="text-[#EFEBE4]">|</span>
          <span>
            活跃 <span className="text-[#4D7C5D]">{stats.activeDays}</span> 天
          </span>
          {stats.streak > 0 && (
            <>
              <span className="text-[#EFEBE4]">|</span>
              <span>
                连续 <span className="text-[#A34E36]">{stats.streak}</span> 天 🔥
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1.5">
        {/* 左侧星期标签 */}
        <div className="flex flex-col gap-[3px] pt-3 pr-0.5">
          {dayLabels.map((label, idx) => (
            <span
              key={idx}
              className="text-[7px] font-bold text-slate-400 h-[10px] leading-[10px]"
              style={{ visibility: idx % 2 === 1 ? "visible" : "hidden" }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* 网格主体 */}
        <div className="flex-grow flex flex-col gap-1">
          {/* 月份标签行 */}
          <div className="flex gap-[3px] h-3">
            {grid.map((_, colIdx) => (
              <div key={colIdx} className="w-[10px] text-[7px] font-bold text-slate-400 leading-[12px]">
                {monthLabels.get(colIdx) || ""}
              </div>
            ))}
          </div>

          {/* 单元格 */}
          <div className="flex gap-[3px]">
            {grid.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-[3px]">
                {col.map((cell, rowIdx) => (
                  <div
                    key={rowIdx}
                    className={`w-[10px] h-[10px] rounded-[2px] ${getCellClass(cell.count, cell.isFuture)} transition-all hover:ring-1 hover:ring-[#4D7C5D] cursor-help`}
                    title={cell.isFuture ? cell.date : `${cell.date} · ${cell.count} 个番茄`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-1.5 mt-2.5 text-[8px] text-slate-400 font-bold">
        <span>少</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#F3EEE8]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#DEEAE2]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#B8D4C1]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#7FB08D]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#4D7C5D]" />
        <span>多</span>
      </div>
    </div>
  );
};
