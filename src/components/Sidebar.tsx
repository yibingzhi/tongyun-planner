import React from "react";
import {
  BookOpen,
  LayoutGrid,
  ListTodo,
  Calendar,
  StickyNote,
  BarChart3,
  History,
  Clock,
  RotateCcw,
  Coffee,
  Unlock,
  Lock,
  Palette,
} from "lucide-react";
import type { AppTab, AlertSoundType } from "../types";
import { audioEngine } from "../utils/audioEngine";

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  progressPercentage: number;
  completedTasksCount: number;
  tasksCount: number;
  stickyNotesCount: number;

  // 番茄钟状态与控制
  pomodoroIsActive: boolean;
  setPomodoroIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  pomodoroIsBreak: boolean;
  pomodoroSessionCount: number;
  pomodoroTimeLeft: number;
  setPomodoroTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  focusDuration: number;
  setFocusDuration: React.Dispatch<React.SetStateAction<number>>;
  breakDuration: number;
  setBreakDuration: React.Dispatch<React.SetStateAction<number>>;
  alertSoundType: AlertSoundType;
  setAlertSoundType: React.Dispatch<React.SetStateAction<AlertSoundType>>;
  syncPomodoro: (
    active: boolean,
    timeLeft: number,
    isBreak: boolean,
    fDur: number,
    bDur: number,
    session: number
  ) => void;

  // 白噪音状态与控制
  isPlayingNoise: boolean;
  setIsPlayingNoise: React.Dispatch<React.SetStateAction<boolean>>;
  selectedNoiseType: string;
  setSelectedNoiseType: React.Dispatch<React.SetStateAction<string>>;
  noiseVolume: number;
  setNoiseVolume: React.Dispatch<React.SetStateAction<number>>;
  startNoise: (type: string, volume: number) => void;
  stopNoise: () => void;

  // 挂件控制与全局重置
  handleToggleWidget: () => Promise<void>;
  handleToggleWidgetLock: (forceState?: boolean) => Promise<void>;
  isWidgetLocked: boolean;
  resetTasks: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  progressPercentage,
  completedTasksCount,
  tasksCount,
  stickyNotesCount,
  pomodoroIsActive,
  setPomodoroIsActive,
  pomodoroIsBreak,
  pomodoroSessionCount,
  pomodoroTimeLeft,
  setPomodoroTimeLeft,
  focusDuration,
  setFocusDuration,
  breakDuration,
  setBreakDuration,
  alertSoundType,
  setAlertSoundType,
  syncPomodoro,
  isPlayingNoise,
  setIsPlayingNoise,
  selectedNoiseType,
  setSelectedNoiseType,
  noiseVolume,
  setNoiseVolume,
  startNoise,
  stopNoise,
  handleToggleWidget,
  handleToggleWidgetLock,
  isWidgetLocked,
  resetTasks,
}) => {
  return (
    <aside className="w-68 border-r border-[#EFEBE4] bg-[#F4EFEA]/60 p-6 flex flex-col justify-between backdrop-blur-xl z-10 relative select-none overflow-y-auto custom-scrollbar">
      <div className="space-y-6 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-[#C4D7B2] to-[#B2C8DF] flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-[#4D7C5D]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-[#2D323A]">QiYun List</h1>
            <span className="text-[9px] text-[#8B6E3C] font-extrabold tracking-wider uppercase">
              待办日程管理
            </span>
          </div>
        </div>

        {/* 进度显示卡片 */}
        <div className="space-y-3 px-4 py-4 rounded-2xl bg-white/80 border border-[#EFEBE4] shadow-sm backdrop-blur-sm">
          <div className="flex justify-between items-center text-[9px] font-extrabold text-[#8B6E3C] tracking-wider uppercase">
            <span>完成进度</span>
            <span className="text-[#8B6E3C] font-extrabold">{progressPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#FAF8F5] rounded-full overflow-hidden relative border border-[#EFEBE4]/60">
            <div
              className="h-full shimmer-progress rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[8px] text-slate-550 font-bold uppercase tracking-wider">
            <span>已完成 {completedTasksCount}</span>
            <span>剩余待办 {tasksCount}</span>
          </div>
        </div>

        {/* 导航标签 */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "matrix"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            四象限看板
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "list"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <ListTodo className="w-4 h-4" />
            待办清单 ({tasksCount})
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "calendar"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            日历日程
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "notes"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <StickyNote className="w-4 h-4" />
            随手便签 ({stickyNotesCount})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            专注统计
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "completed"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            历史归档 ({completedTasksCount})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
              activeTab === "settings"
                ? "bg-[#FCF2F0]/70 text-[#A34E36] border-[#F5DFDB] shadow-sm font-bold"
                : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
            }`}
          >
            <Palette className="w-4 h-4" />
            装扮
          </button>
        </nav>

        {/* 番茄专注时钟 */}
        <div className="px-4 py-3 rounded-2xl bg-white/70 border border-[#EFEBE4] shadow-sm backdrop-blur-sm space-y-2">
          <div className="flex justify-between items-center text-[9px] font-extrabold text-[#A34E36] tracking-wider uppercase">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#A34E36]" />
              {pomodoroIsBreak ? "休息时间 🌿" : "专注时间 🎯"}
            </span>
            <span>第 {pomodoroSessionCount} 番茄</span>
          </div>

          <div className="flex items-center justify-between">
            {/* 时间及调节控件 */}
            <div className="flex items-center gap-1">
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
              <span className="text-xl font-bold font-mono text-[#2D323A]">
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

            {/* 番茄钟控制按钮 */}
            <div className="flex items-center gap-1.5">
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
                className="p-1.5 rounded-lg border border-[#EFEBE4] hover:bg-[#FAF8F5] text-slate-700 transition-colors cursor-pointer"
                title={pomodoroIsActive ? "暂停" : "开始专注"}
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
                  syncPomodoro(
                    false,
                    nextTime,
                    pomodoroIsBreak,
                    focusDuration,
                    breakDuration,
                    pomodoroSessionCount
                  );
                }}
                className="p-1.5 rounded-lg border border-[#EFEBE4] hover:bg-[#FAF8F5] text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                title="重置"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 倒计时进度条 */}
          <div className="w-full h-1 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EFEBE4]/60">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                pomodoroIsBreak ? "bg-[#C4D7B2]" : "bg-[#E8A0BF]"
              }`}
              style={{
                width: `${
                  (pomodoroTimeLeft /
                    (pomodoroIsBreak ? breakDuration * 60 : focusDuration * 60)) *
                  100
                }%`,
              }}
            />
          </div>

          {/* 提示音选择 */}
          <div className="flex items-center justify-between pt-1 text-[8px] text-slate-400 font-extrabold uppercase">
            <span>铃声</span>
            <div className="flex gap-1.5">
              {[
                { id: "beep", label: "电子" },
                { id: "cuckoo", label: "布谷 🐦" },
                { id: "meow", label: "喵喵 🐱" },
              ].map((snd) => (
                <button
                  key={snd.id}
                  onClick={() => {
                    const newSound = snd.id as AlertSoundType;
                    setAlertSoundType(newSound);
                    localStorage.setItem("aero_alert_sound_type", newSound);
                    setTimeout(() => {
                      audioEngine.playCompletionSound(newSound);
                    }, 50);
                  }}
                  className={`px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                    alertSoundType === snd.id
                      ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] font-extrabold"
                      : "bg-transparent border-transparent hover:bg-slate-50 hover:text-slate-600"
                  }`}
                >
                  {snd.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 自然白噪音发生器 */}
        <div className="px-4 py-3 rounded-2xl bg-white/70 border border-[#EFEBE4] shadow-sm backdrop-blur-sm space-y-2">
          <div className="flex justify-between items-center text-[9px] font-extrabold text-[#4D7C5D] tracking-wider uppercase">
            <span className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 text-[#4D7C5D]" />
              专注白噪音
            </span>
            <span className="text-slate-400 font-bold">
              {selectedNoiseType === "brown"
                ? "深海褐噪"
                : selectedNoiseType === "pink"
                ? "山谷粉噪"
                : selectedNoiseType === "ocean"
                ? "海浪起伏"
                : "细雨微风"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            {/* 声效切换键 */}
            <div className="grid grid-cols-4 gap-1 flex-grow">
              {[
                { id: "brown", label: "🌲", title: "深海褐噪" },
                { id: "pink", label: "🌿", title: "山谷粉噪" },
                { id: "ocean", label: "🌊", title: "海浪起伏" },
                { id: "rain", label: "🌧️", title: "细雨微风" },
              ].map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setSelectedNoiseType(sound.id);
                    if (isPlayingNoise) {
                      startNoise(sound.id, noiseVolume);
                    }
                  }}
                  className={`h-6 rounded-lg text-xs flex items-center justify-center border transition-all cursor-pointer ${
                    selectedNoiseType === sound.id
                      ? "bg-[#F0F5F1] border-[#DEEAE2] font-bold"
                      : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-700"
                  }`}
                  title={sound.title}
                >
                  {sound.label}
                </button>
              ))}
            </div>

            {/* 播放/暂停键 */}
            <button
              onClick={() => {
                if (isPlayingNoise) {
                  stopNoise();
                  setIsPlayingNoise(false);
                } else {
                  startNoise(selectedNoiseType, noiseVolume);
                  setIsPlayingNoise(true);
                }
              }}
              className={`p-1.5 rounded-lg border transition-all flex-shrink-0 cursor-pointer ${
                isPlayingNoise
                  ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36]"
                  : "bg-[#F0F5F1] border-[#DEEAE2] text-[#4D7C5D]"
              }`}
            >
              {isPlayingNoise ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* 音量控制拉条 */}
          {isPlayingNoise && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[8px] text-slate-400 font-extrabold uppercase">音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={noiseVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setNoiseVolume(val);
                  audioEngine.setVolume(val);
                }}
                className="flex-grow accent-[#4D7C5D] h-1 bg-[#FAF8F5] rounded-lg border border-[#EFEBE4]/60 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* 底部设置 */}
      <div className="space-y-2 pt-4 border-t border-[#EFEBE4] flex-shrink-0">
        <button
          onClick={handleToggleWidget}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-[#4D7C5D] hover:bg-[#F0F5F1]/80 border border-[#DEEAE2] bg-[#F0F5F1]/40 cursor-pointer"
        >
          <Coffee className="w-3.5 h-3.5 text-[#4D7C5D]" />
          显示/隐藏桌面挂件
        </button>
        <button
          onClick={() => handleToggleWidgetLock()}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isWidgetLocked
              ? "text-[#8B6E3C] hover:bg-[#FAF5ED] border border-[#EFE5D3] bg-[#FAF5ED]/50 shadow-sm"
              : "text-slate-600 hover:bg-slate-100 border border-slate-200/60 bg-transparent"
          }`}
        >
          {isWidgetLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {isWidgetLocked ? "解锁挂件（恢复交互）" : "锁住挂件（鼠标穿透）"}
        </button>
        <button
          onClick={resetTasks}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60 bg-transparent transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置演示任务
        </button>
      </div>
    </aside>
  );
};
