import type { TaskCategory } from "./types";

export interface SelectOption<TValue extends string = string> {
  value: TValue;
  label: string;
}

export const PRIORITY_OPTIONS: SelectOption<TaskCategory>[] = [
  { value: "urgent-important", label: "I. 重要且紧急" },
  { value: "important-not-urgent", label: "II. 重要不紧急" },
  { value: "urgent-not-important", label: "III. 紧急不重要" },
  { value: "not-urgent-not-important", label: "IV. 不重要不紧急" },
];

export const FILTER_OPTIONS: SelectOption<TaskCategory | "all">[] = [
  { value: "all", label: "所有象限" },
  ...PRIORITY_OPTIONS,
];

export const CATEGORY_META: Record<TaskCategory, { label: string; dot: string; text: string }> = {
  "urgent-important": {
    label: "重要且紧急",
    dot: "bg-[#E8A0BF]",
    text: "text-[#A34E36]",
  },
  "important-not-urgent": {
    label: "重要不紧急",
    dot: "bg-[#C4D7B2]",
    text: "text-[#4D7C5D]",
  },
  "urgent-not-important": {
    label: "紧急不重要",
    dot: "bg-[#B2C8DF]",
    text: "text-[#5C528B]",
  },
  "not-urgent-not-important": {
    label: "不重要不紧急",
    dot: "bg-[#F5EBEB]",
    text: "text-[#8B6E3C]",
  },
};

export interface ColorConfig {
  bg: string;
  border: string;
  text: string;
  dot: string;
  accent: string;
  name: string;
}

export const PLANNER_COLORS: Record<string, ColorConfig> = {
  rose: {
    bg: "bg-[#FCF2F0]",
    border: "border-[#F5DFDB]",
    text: "text-[#A34E36]",
    dot: "bg-[#E8A0BF]",
    accent: "#A34E36",
    name: "蜜桃粉 (Rose)",
  },
  mint: {
    bg: "bg-[#F0F5F1]",
    border: "border-[#DEEAE2]",
    text: "text-[#4D7C5D]",
    dot: "bg-[#C4D7B2]",
    accent: "#4D7C5D",
    name: "抹茶绿 (Matcha)",
  },
  sky: {
    bg: "bg-[#EBF3F6]",
    border: "border-[#D0E2E8]",
    text: "text-[#366B80]",
    dot: "bg-[#B2C8DF]",
    accent: "#366B80",
    name: "天空蓝 (Sky)",
  },
  lavender: {
    bg: "bg-[#F3F2F7]",
    border: "border-[#E5E2EE]",
    text: "text-[#5C528B]",
    dot: "bg-[#9B7EC9]",
    accent: "#5C528B",
    name: "香芋紫 (Lavender)",
  },
  coral: {
    bg: "bg-[#FBECE5]",
    border: "border-[#F6DCD2]",
    text: "text-[#A64424]",
    dot: "bg-[#E57C58]",
    accent: "#A64424",
    name: "珊瑚橙 (Coral)",
  },
  yellow: {
    bg: "bg-[#FAF5ED]",
    border: "border-[#EFE5D3]",
    text: "text-[#8B6E3C]",
    dot: "bg-[#E0A934]",
    accent: "#8B6E3C",
    name: "甘菊黄 (Chamomile)",
  },
};

export interface DueCountdown {
  days: number;
  text: string;
  isOverdue: boolean;
  isToday: boolean;
}

export function getDueDateCountdown(dueDateStr?: string): DueCountdown | null {
  if (!dueDateStr) return null;
  
  // Parse date safely ignoring time zones for calendar alignment
  const parts = dueDateStr.split("-");
  if (parts.length !== 3) return null;
  
  const dueYear = parseInt(parts[0], 10);
  const dueMonth = parseInt(parts[1], 10) - 1;
  const dueDay = parseInt(parts[2], 10);
  
  const due = new Date(dueYear, dueMonth, dueDay);
  due.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      days: Math.abs(diffDays),
      text: `已逾期 ${Math.abs(diffDays)} 天`,
      isOverdue: true,
      isToday: false,
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      text: "今天到期",
      isOverdue: false,
      isToday: true,
    };
  } else {
    return {
      days: diffDays,
      text: `还剩 ${diffDays} 天`,
      isOverdue: false,
      isToday: false,
    };
  }
}


