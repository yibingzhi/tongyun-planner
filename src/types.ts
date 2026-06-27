export type TaskCategory =
  | "urgent-important"
  | "urgent-not-important"
  | "important-not-urgent"
  | "not-urgent-not-important";

export interface Task {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  category: TaskCategory;
  dueDate?: string; // YYYY-MM-DD
  isFavorite?: boolean;
  isPinned?: boolean;
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

export type AppTab = "matrix" | "list" | "calendar" | "notes" | "analytics" | "completed" | "settings";

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

  // AI Agent settings
  aiApiKey?: string;
  aiEndpoint?: string;
  aiModel?: string;
  aiAutoCategorize?: boolean;
  aiCustomPrompt?: string;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password?: string;
}


