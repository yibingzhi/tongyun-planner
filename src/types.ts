export type TaskCategory =
  | "urgent-important"
  | "urgent-not-important"
  | "important-not-urgent"
  | "not-urgent-not-important";

export type RepeatType = "daily" | "weekly" | "monthly" | "none";

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  category: TaskCategory;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (e.g. "14:30")
  isFavorite?: boolean;
  isPinned?: boolean;
  repeat?: RepeatType;
  subtasks?: SubTask[];
  tags?: string[];
}

export interface PomodoroLog {
  id: string;
  timestamp: number;
  duration: number;
  taskId?: string;
  taskTitle?: string;
}

export interface StickyNote {
  id: string;
  text: string;
  color: string;
  rotate: number;
}

export type AlertSoundType = "beep" | "cuckoo" | "meow";

export type AppTab = "home" | "matrix" | "list" | "calendar" | "notes" | "analytics" | "completed" | "countdown" | "habits" | "settings" | "tasks" | "focus" | "archive";

export interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  emoji?: string;
  color?: string;
}

export type Locale = "zh-CN" | "en";

export type WidgetView = "card" | "list" | "add" | "timer" | "notes";

export interface CustomizationConfig {
  qColors: {
    "urgent-important": string;
    "important-not-urgent": string;
    "urgent-not-important": string;
    "not-urgent-not-important": string;
  };
  cardBackground: "white" | "grid" | "lined" | "watercolor" | "doodle";
  pinType: "pin" | "tape" | "clip" | "heart" | "smiley";
  interfaceGlass?: "light" | "matte" | "solid";
  watercolorStyle?: "oasis" | "aurora" | "sunny" | "none";
  fontFamily?: "sans" | "rounded" | "serif";

  // Sunset Night Mode settings
  enableSunsetMode?: boolean;
  sunsetStartHour?: number;
  sunsetEndHour?: number;
  sunsetWarmth?: number; // 0 to 100

  // Celebration mode
  enableCelebration?: boolean;

  // Locale
  locale?: Locale;

  // Weather
  weatherCity?: string;

  // Theme preference
  darkMode?: "light" | "dark" | "auto";

  // AI Agent settings
  aiProvider?: "openai" | "anthropic";
  aiApiKey?: string;
  aiEndpoint?: string;
  aiModel?: string;
  aiAutoCategorize?: boolean;
  enableAutoBackup?: boolean;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password?: string;
}

