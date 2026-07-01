import React, { useMemo } from "react";
import { Flame, TrendingUp } from "lucide-react";
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

  // 每周番茄总数（用于右侧折线图）
  const weeklyTotals = useMemo(() => {
    return grid.map((col) => col.reduce((sum, cell) => sum + (cell.isFuture ? 0 : cell.count), 0));
  }, [grid]);

  // 右侧迷你折线图
  const MiniLineChart = () => {
    const W = 240;
    const H = 90;
    const PAD = { top: 8, right: 8, bottom: 18, left: 8 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const maxVal = Math.max(...weeklyTotals, 1);
    const points = weeklyTotals.map((v, i) => ({
      x: PAD.left + (i / Math.max(weeklyTotals.length - 1, 1)) * chartW,
      y: PAD.top + chartH - (v / maxVal) * chartH,
      v,
    }));
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${points[points.length - 1].x},${PAD.top + chartH} L${points[0].x},${PAD.top + chartH} Z`;

    // X 轴刻度 — 每隔 2 周显示一个标签
    const xTicks: { x: number; label: string }[] = [];
    for (let i = 0; i < weeklyTotals.length; i++) {
      if (i === 0 || i === weeklyTotals.length - 1 || i % 2 === 0) {
        const label = monthLabels.get(i);
        if (label) xTicks.push({ x: points[i].x, label });
      }
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#4D7C5D]" />
          <span className="text-[9px] font-black text-[#8B6E3C] tracking-widest uppercase">每周趋势</span>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4D7C5D" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4D7C5D" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#areaGrad)" />
            <path d={linePath} fill="none" stroke="#4D7C5D" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2" fill="#4D7C5D" className="hover:r-3" />
            ))}
            {xTicks.map((t, i) => (
              <text key={i} x={t.x} y={H - 2} textAnchor="middle" className="text-[6px] fill-slate-400 font-bold">
                {t.label}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-white/70 border border-[#EFEBE4] p-4 shadow-2xs backdrop-blur-xs">
      {/* 标题行 */}
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

      {/* 主体：左侧热力图 + 右侧折线图 */}
      <div className="flex gap-4">
        {/* 左侧热力图 */}
        <div className="shrink-0">
          <div className="flex gap-1.5">
            {/* 星期标签 */}
            <div className="flex flex-col gap-[3px]" style={{ paddingTop: '1.25rem' }}>
              {dayLabels.map((label, idx) => (
                <span
                  key={idx}
                  className="text-[7px] font-bold text-slate-400 leading-none flex items-center"
                  style={{ visibility: idx % 2 === 1 ? "visible" : "hidden", height: '14px' }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* 热力网格 */}
            <div>
              {/* 月份标签 */}
              <div className="flex gap-[3px] mb-[3px]">
                {grid.map((_, colIdx) => (
                  <div key={colIdx} className="text-[7px] font-bold text-slate-400 text-center" style={{ width: '14px' }}>
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
                        className={`w-[14px] h-[14px] rounded-[2px] ${getCellClass(cell.count, cell.isFuture)} transition-all hover:ring-1 hover:ring-[#4D7C5D] cursor-help`}
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

        {/* 右侧折线图 */}
        <div className="flex-grow min-w-0 border-l border-[#EFEBE4] pl-4">
          <MiniLineChart />
        </div>
      </div>
    </div>
  );
};
