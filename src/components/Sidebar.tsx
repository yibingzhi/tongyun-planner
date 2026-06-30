import React, { useState } from "react";
import {
  BookOpen,
  Home,
  LayoutGrid,
  ListTodo,
  Calendar,
  StickyNote,
  BarChart3,
  History,
  Hourglass,
  Clock,
  RotateCcw,
  Coffee,
  Unlock,
  Lock,
  Settings,
  Cloud,
  RefreshCw,
  Target,
  Flame,
} from "lucide-react";
import type { AppTab, AlertSoundType } from "../types";
import { audioEngine } from "../utils/audioEngine";
import { useTranslation } from "../i18n/LanguageContext";

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  progressPercentage: number;
  completedTasksCount: number;
  tasksCount: number;
  stickyNotesCount: number;
  countdownCount: number;
  habitsCount: number;
  syncStatus: "synced" | "syncing" | "error";
  lastBackupTime: number | null;

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
    session: number,
    tId?: string | null,
    tTitle?: string | null
  ) => void;

  pomodoroTaskId: string | null;
  pomodoroTaskTitle: string | null;
  setPomodoroTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  setPomodoroTaskTitle: React.Dispatch<React.SetStateAction<string | null>>;

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
  onEnterFlowMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeTab,
  setActiveTab,
  progressPercentage,
  completedTasksCount,
  tasksCount,
  stickyNotesCount,
  countdownCount,
  habitsCount,
  syncStatus,
  lastBackupTime,
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
  pomodoroTaskId,
  pomodoroTaskTitle,
  setPomodoroTaskId,
  setPomodoroTaskTitle,
  onEnterFlowMode,
}) => {
  const { t } = useTranslation();
  const s = t.sidebar;
  const [hasWebdavUrl] = useState(() => !!localStorage.getItem("qiyun_webdav_url"));
  const [editingMinutes, setEditingMinutes] = useState<string | null>(null);

  const commitMinutes = (raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < 1) return;
    const clamped = Math.min(val, 120);
    const newTime = clamped * 60;
    setPomodoroTimeLeft(newTime);
    setEditingMinutes(null);
    if (pomodoroIsBreak) {
      setBreakDuration(clamped);
      localStorage.setItem("pomodoro_break_duration", String(clamped));
      syncPomodoro(false, newTime, true, focusDuration, clamped, pomodoroSessionCount);
    } else {
      setFocusDuration(clamped);
      localStorage.setItem("pomodoro_focus_duration", String(clamped));
      syncPomodoro(false, newTime, false, clamped, breakDuration, pomodoroSessionCount);
    }
  };
  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#EFEBE4] bg-[#F4EFEA]/60 p-5 flex flex-col justify-between backdrop-blur-xl z-10 relative select-none overflow-y-auto custom-scrollbar">
      <div className="space-y-6 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9.5 h-9.5 rounded-xl bg-gradient-to-tr from-[#C4D7B2] to-[#B2C8DF] flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-[#4D7C5D]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-[#2D323A]">QiYun List</h1>
            <span className="text-[9px] text-[#8B6E3C] font-extrabold tracking-wider uppercase">
              {t.app.subtitle}
            </span>
          </div>
        </div>

        {/* 进度显示卡片 */}
        <div className="space-y-3 px-4 py-4 rounded-2xl bg-white/80 border border-[#EFEBE4] shadow-sm backdrop-blur-sm">
          <div className="flex justify-between items-center text-[9px] font-extrabold text-[#8B6E3C] tracking-wider uppercase">
            <span>{s.progress}</span>
            <span className="text-[#8B6E3C] font-extrabold">{progressPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#FAF8F5] rounded-full overflow-hidden relative border border-[#EFEBE4]/60">
            <div
              className="h-full shimmer-progress rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold uppercase tracking-wider">
            <span>{s.completed} {completedTasksCount}</span>
            <span>{s.remaining} {tasksCount}</span>
          </div>
        </div>

        {/* 导航标签 */}
        <nav className="space-y-0.5">
          {([
            { tab: "home" as AppTab, icon: <Home className="w-4 h-4" />, label: s.home, count: null,
              activeCls: "bg-[#F0F5F1] text-[#4D7C5D] border-[#C4D7B2]", barCls: "active-home" },
            { tab: "matrix" as AppTab, icon: <LayoutGrid className="w-4 h-4" />, label: s.matrix, count: null,
              activeCls: "bg-[#F3F0F8] text-[#7C6FAE] border-[#D5CEE8]", barCls: "active-matrix" },
            { tab: "list" as AppTab, icon: <ListTodo className="w-4 h-4" />, label: s.list, count: tasksCount,
              activeCls: "bg-[#EEF5F8] text-[#5B99B0] border-[#C5DEE8]", barCls: "active-list" },
            { tab: "calendar" as AppTab, icon: <Calendar className="w-4 h-4" />, label: s.calendar, count: null,
              activeCls: "bg-[#FBF4EC] text-[#C97D3E] border-[#EDDCC8]", barCls: "active-calendar" },
            { tab: "notes" as AppTab, icon: <StickyNote className="w-4 h-4" />, label: s.notes, count: stickyNotesCount,
              activeCls: "bg-[#FBF8EC] text-[#A08B30] border-[#EDE5C8]", barCls: "active-notes" },
            { tab: "analytics" as AppTab, icon: <BarChart3 className="w-4 h-4" />, label: s.analytics, count: null,
              activeCls: "bg-[#F5F0F8] text-[#9B6FAE] border-[#DDD0E8]", barCls: "active-analytics" },
            { tab: "completed" as AppTab, icon: <History className="w-4 h-4" />, label: s.history, count: completedTasksCount,
              activeCls: "bg-[#EEF7F2] text-[#5DAE7C] border-[#C5E5D2]", barCls: "active-completed" },
            { tab: "countdown" as AppTab, icon: <Hourglass className="w-4 h-4" />, label: s.countdown, count: countdownCount,
              activeCls: "bg-[#FEF6E6] text-[#C97D3E] border-[#F5E2B8]", barCls: "active-countdown" },
            { tab: "habits" as AppTab, icon: <Flame className="w-4 h-4" />, label: s.habits || "习惯", count: habitsCount,
              activeCls: "bg-[#FCF2F0] text-[#E87A6E] border-[#F5D0C5]", barCls: "active-habits" },
            { tab: "settings" as AppTab, icon: <Settings className="w-4 h-4" />, label: s.settings, count: null,
              activeCls: "bg-[#F5F3F1] text-[#8B8178] border-[#E0DBD5]", barCls: "active-settings" },
          ] as const).map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`nav-icon-hover w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border cursor-pointer ${
                  isActive
                    ? `${item.activeCls} shadow-sm nav-active-bar ${item.barCls}`
                    : "text-slate-600 border-transparent hover:bg-white/50 hover:text-slate-800"
                }`}
              >
                {item.icon}
                <span className="flex-grow text-left">{item.label}</span>
                {item.count !== null && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    isActive ? "bg-white/60" : "bg-[#FAF8F5] text-slate-400"
                  }`}>{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 心流模式按钮 */}
        <button
          onClick={onEnterFlowMode}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all border border-[#EFE5D3] text-[#8B6E3C] bg-[#FAF5ED] hover:bg-[#F0E8D6] shadow-xs cursor-pointer"
        >
          <Target className="w-4 h-4" />
          <span className="flex-grow text-left">{t.flow?.title || "心流模式"}</span>
          <span className="text-[9px] font-extrabold bg-white/60 px-1.5 py-0.5 rounded-md">{tasksCount}</span>
        </button>

        {/* 禅意专注空间 (Zen Focus Card) */}
        <div data-task-id={pomodoroTaskId || ""} className={`px-4 py-3.5 rounded-2xl bg-white/60 border border-[#EFEBE4] shadow-xs backdrop-blur-sm space-y-3 ${pomodoroIsActive ? 'pomodoro-active-glow' : ''}`}>
          {/* Header */}
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 tracking-wide">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#A34E36]" />
              <span>{pomodoroIsBreak ? s.breakMode : s.focusMode}</span>
            </span>
            <span className="text-[9px] text-slate-400">{s.pomodoroCount}: {pomodoroSessionCount}</span>
          </div>

          {pomodoroTaskTitle && (
            <div className="text-[10px] font-medium text-slate-600 max-w-full truncate bg-[#FAF8F5]/80 px-2.5 py-1 rounded border border-[#EFEBE4]/60 text-center" title={pomodoroTaskTitle}>
              {s.focusing}: {pomodoroTaskTitle}
            </div>
          )}

          {/* Timer & Basic Controls Row */}
          <div className="flex items-center justify-between">
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
                  className="w-4 h-4 rounded-full bg-[#FAF8F5] hover:bg-slate-200 border border-[#EFEBE4]/80 flex items-center justify-center text-slate-400 font-extrabold text-[10px] cursor-pointer transition-colors shadow-2xs"
                  title={s.decreaseMin}
                >
                  -
                </button>
              )}
              {editingMinutes !== null ? (
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={editingMinutes}
                  onChange={(e) => setEditingMinutes(e.target.value)}
                  onBlur={(e) => commitMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitMinutes((e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setEditingMinutes(null);
                  }}
                  autoFocus
                  className="w-16 text-xl font-bold font-mono text-[#2D323A] tracking-tight bg-transparent border-b-2 border-[#4D7C5D] outline-none text-center"
                />
              ) : (
                <span
                  onClick={() => !pomodoroIsActive && setEditingMinutes(String(Math.floor(pomodoroTimeLeft / 60)))}
                  className={`text-xl font-bold font-mono text-[#2D323A] tracking-tight ${!pomodoroIsActive ? "cursor-pointer hover:text-[#4D7C5D] transition-colors" : ""}`}
                >
                  {Math.floor(pomodoroTimeLeft / 60)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {(pomodoroTimeLeft % 60).toString().padStart(2, "0")}
                </span>
              )}
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
                  className="w-4 h-4 rounded-full bg-[#FAF8F5] hover:bg-slate-200 border border-[#EFEBE4]/80 flex items-center justify-center text-slate-400 font-extrabold text-[10px] cursor-pointer transition-colors shadow-2xs"
                  title={s.increaseMin}
                >
                  +
                </button>
              )}
            </div>

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
                className="p-1 rounded-lg border border-[#EFEBE4]/80 hover:bg-[#FAF8F5] text-slate-600 transition-colors cursor-pointer"
                title={pomodoroIsActive ? s.pause : s.startFocus}
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
                className="p-1 rounded-lg border border-[#EFEBE4]/80 hover:bg-[#FAF8F5] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={s.resetTimer}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EFEBE4]/50">
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

          {/* Sound choice & White Noise integrated panel */}
          <div className="pt-2 border-t border-dashed border-[#EFEBE4]/80 space-y-2">
            {/* White Noise Control Row */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-[#4D7C5D]" />
                <span>{s.noise}</span>
              </span>
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
                className={`px-2 py-0.5 rounded-md border text-[9px] font-bold transition-all cursor-pointer ${
                  isPlayingNoise
                    ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36]"
                    : "bg-[#F0F5F1] border-[#DEEAE2] text-[#4D7C5D]"
                }`}
              >
                {isPlayingNoise ? s.mute : s.play}
              </button>
            </div>

            {/* Noise presets */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: "brown", label: s.brown, title: s.brownTitle },
                { id: "pink", label: s.pink, title: s.pinkTitle },
                { id: "ocean", label: s.ocean, title: s.oceanTitle },
                { id: "rain", label: s.rain, title: s.rainTitle },
                { id: "white", label: s.white, title: s.whiteTitle },
                { id: "fire", label: s.fire, title: s.fireTitle },
                { id: "stream", label: s.stream, title: s.streamTitle },
                { id: "wind", label: s.wind, title: s.windTitle },
              ].map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setSelectedNoiseType(sound.id);
                    if (isPlayingNoise) {
                      startNoise(sound.id, noiseVolume);
                    }
                  }}
                  className={`h-5.5 rounded-lg text-[9px] font-semibold flex items-center justify-center border transition-all cursor-pointer ${
                    selectedNoiseType === sound.id
                      ? "bg-[#F0F5F1] border-[#DEEAE2] text-[#4D7C5D] font-bold"
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                  }`}
                  title={sound.title}
                >
                  {sound.label}
                </button>
              ))}
            </div>

            {/* Volume slider */}
            {isPlayingNoise && (
              <div className="flex items-center gap-2 pt-0.5 animate-fade-in-up">
                <span className="text-[8px] text-slate-400 font-bold uppercase flex-shrink-0">{s.volume}</span>
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
                  className="flex-grow accent-[#4D7C5D] h-0.5 bg-[#FAF8F5] rounded-lg border border-[#EFEBE4]/50 cursor-pointer"
                />
              </div>
            )}

            {/* Timer end sound selection */}
            <div className="flex items-center justify-between pt-1 text-[8.5px] text-slate-400 font-semibold uppercase">
              <span>{s.soundSelect}</span>
              <div className="flex gap-1.5">
                {[
                  { id: "beep", label: s.beep },
                  { id: "cuckoo", label: s.cuckoo },
                  { id: "meow", label: s.meow },
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
                        ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] font-bold"
                        : "bg-transparent border-transparent hover:text-slate-600"
                    }`}
                  >
                    {snd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部设置 */}
      <div className="space-y-1.5 pt-3 border-t border-[#EFEBE4] flex-shrink-0">
        {/* WebDAV 自动备份同步指示器 */}
        {hasWebdavUrl && (
          <div className="pb-1.5 text-[9px] flex items-center justify-between text-slate-500 font-bold border-b border-[#EFEBE4]/50 mb-1.5 select-none">
            <div className="flex items-center gap-1">
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-3 h-3 text-[#4D7C5D] animate-spin" />
              ) : syncStatus === "error" ? (
                <Cloud className="w-3 h-3 text-[#A34E36]" />
              ) : (
                <Cloud className="w-3 h-3 text-[#4D7C5D]" />
              )}
              <span>
                {syncStatus === "syncing"
                  ? s.syncSyncing
                  : syncStatus === "error"
                  ? s.syncError
                  : s.syncSynced}
              </span>
            </div>
            {lastBackupTime && (
              <span className="opacity-75 font-semibold text-slate-400">
                {new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        <button
          onClick={handleToggleWidget}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all text-[#4D7C5D] hover:bg-[#F0F5F1] border border-[#DEEAE2] cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {s.widget}
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handleToggleWidgetLock()}
            className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
              isWidgetLocked
                ? "text-[#8B6E3C] bg-[#FAF5ED] border-[#EFE5D3]"
                : "text-slate-500 border-slate-200/60 bg-transparent hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {isWidgetLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isWidgetLocked ? s.unlockWidget : s.lockWidget}
          </button>
          <button
            onClick={resetTasks}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 border border-slate-200/60 bg-transparent hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            {s.reset}
          </button>
        </div>
      </div>
    </aside>
  );
});
