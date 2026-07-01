import type { Task, StickyNote, PomodoroLog, CountdownEvent, CustomizationConfig } from "../../types";

export interface SyncData {
  version: number;
  tasks: Task[];
  completedTasks: Task[];
  stickyNotes: StickyNote[];
  pomodoroLogs: PomodoroLog[];
  countdowns: CountdownEvent[];
  customizationConfig: CustomizationConfig | null;
  habits: { id: string; title: string; emoji: string }[];
  habitLogs: Record<string, string[]>;
  moods: Record<string, number>;
}

export type SyncBackendType = "webdav" | "supabase" | "none";

export interface SyncBackendConfig {
  type: SyncBackendType;
  webdav?: { url: string; username: string; password?: string };
  supabase?: { url: string; anonKey: string; userId?: string };
}

export interface SyncProvider {
  readonly type: SyncBackendType;
  readonly displayName: string;
  isConfigured(): boolean;
  test(): Promise<boolean>;
  push(data: SyncData): Promise<void>;
  pull(): Promise<SyncData | null>;
}

export function getLocalSyncData(): SyncData {
  const get = (key: string, fallback: string) => {
    const v = localStorage.getItem(key);
    try { return v ? JSON.parse(v) : JSON.parse(fallback); }
    catch { return JSON.parse(fallback); }
  };

  return {
    version: Date.now(),
    tasks: get("aero_todos", "[]"),
    completedTasks: get("aero_completed_todos", "[]"),
    stickyNotes: get("aero_sticky_notes", "[]"),
    pomodoroLogs: get("aero_pomodoro_logs", "[]"),
    countdowns: get("qiyun_countdowns", "[]"),
    customizationConfig: (() => {
      const v = localStorage.getItem("aero_customization_config");
      return v ? JSON.parse(v) : null;
    })(),
    habits: get("qiyun_habits", "[]"),
    habitLogs: get("qiyun_habit_logs", "{}"),
    moods: get("qiyun_moods", "{}"),
  };
}

export function applySyncData(data: SyncData): void {
  localStorage.setItem("aero_todos", JSON.stringify(data.tasks));
  localStorage.setItem("aero_completed_todos", JSON.stringify(data.completedTasks));
  localStorage.setItem("aero_sticky_notes", JSON.stringify(data.stickyNotes));
  localStorage.setItem("aero_pomodoro_logs", JSON.stringify(data.pomodoroLogs));
  localStorage.setItem("qiyun_countdowns", JSON.stringify(data.countdowns));
  if (data.customizationConfig) {
    localStorage.setItem("aero_customization_config", JSON.stringify(data.customizationConfig));
  }
  localStorage.setItem("qiyun_habits", JSON.stringify(data.habits));
  localStorage.setItem("qiyun_habit_logs", JSON.stringify(data.habitLogs));
  localStorage.setItem("qiyun_moods", JSON.stringify(data.moods));
  localStorage.setItem("qiyun_sync_version", String(data.version));
}
