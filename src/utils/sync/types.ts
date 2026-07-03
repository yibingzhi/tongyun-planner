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

export const SYNC_APPLIED_EVENT = "qiyun-sync-applied";

export function getLocalSyncVersion(): number {
  return parseInt(localStorage.getItem("qiyun_sync_version") || "0", 10);
}

/** 本地数据变更时调用，递增版本号供冲突比较 */
export function bumpSyncVersion(): number {
  const v = Date.now();
  localStorage.setItem("qiyun_sync_version", String(v));
  return v;
}

function readJson<T>(key: string, fallback: string): T {
  const v = localStorage.getItem(key);
  try {
    return v ? JSON.parse(v) : JSON.parse(fallback);
  } catch {
    return JSON.parse(fallback);
  }
}

export function getLocalSyncData(): SyncData {
  return {
    version: getLocalSyncVersion(),
    tasks: readJson("aero_todos", "[]"),
    completedTasks: readJson("aero_completed_todos", "[]"),
    stickyNotes: readJson("aero_sticky_notes", "[]"),
    pomodoroLogs: readJson("aero_pomodoro_logs", "[]"),
    countdowns: readJson("qiyun_countdowns", "[]"),
    customizationConfig: (() => {
      const v = localStorage.getItem("aero_customization_config");
      return v ? JSON.parse(v) : null;
    })(),
    habits: readJson("qiyun_habits", "[]"),
    habitLogs: readJson("qiyun_habit_logs", "{}"),
    moods: readJson("qiyun_moods", "{}"),
  };
}

/** 兼容旧版 WebDAV 备份格式（App.tsx 曾使用的 timestamp 字段） */
export function normalizeSyncData(raw: unknown): SyncData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.tasks)) return null;

  const version =
    typeof obj.version === "number"
      ? obj.version
      : typeof obj.timestamp === "number"
        ? obj.timestamp
        : 0;

  return {
    version,
    tasks: obj.tasks as Task[],
    completedTasks: (obj.completedTasks as Task[]) || [],
    stickyNotes: (obj.stickyNotes as StickyNote[]) || [],
    pomodoroLogs: (obj.pomodoroLogs as PomodoroLog[]) || [],
    countdowns: (obj.countdowns as CountdownEvent[]) || [],
    customizationConfig: (obj.customizationConfig as CustomizationConfig) || null,
    habits: (obj.habits as SyncData["habits"]) || [],
    habitLogs: (obj.habitLogs as Record<string, string[]>) || {},
    moods: (obj.moods as Record<string, number>) || {},
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
  localStorage.setItem("qiyun_last_updated", String(Date.now()));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_APPLIED_EVENT, { detail: data }));
  }
}
