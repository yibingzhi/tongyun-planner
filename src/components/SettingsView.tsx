import React, { useState, useEffect } from "react";
import { Sparkles, Heart, Cloud, RefreshCw, Upload, Download, AlertTriangle, Moon, Save, Link2, X, Wand2, Server, Copy } from "lucide-react";
import type { CustomizationConfig, AlertSoundType, Locale } from "../types";
import type { SyncBackendType } from "../utils/sync/types";
import { syncEngine } from "../utils/sync/engine";
import { normalizeSyncData, applySyncData } from "../utils/sync/types";
import { PLANNER_COLORS } from "../constants";
import type { SelectOption } from "../constants";
import { StickyPin } from "./StickyPin";
import { CustomSelect } from "./CustomSelect";
import { testAIConnection, generatePraiseBatch } from "../utils/aiEngine";
import { useTranslation } from "../i18n/LanguageContext";
import { safeJsonParse } from "../utils/json";
import { audioEngine } from "../utils/audioEngine";

const THEME_PRESETS = [
  {
    id: "mint-light",
    name: "Mint Light (抹茶绿 浅色)",
    darkMode: "light" as const,
    qColors: {
      "urgent-important": "rose",
      "important-not-urgent": "mint",
      "urgent-not-important": "sky",
      "not-urgent-not-important": "yellow",
    },
    previewColors: ["#E8A0BF", "#C4D7B2", "#B2C8DF", "#E0A934"],
  },
  {
    id: "lemon-light",
    name: "Lemon Light (甘菊黄 浅色)",
    darkMode: "light" as const,
    qColors: {
      "urgent-important": "coral",
      "important-not-urgent": "yellow",
      "urgent-not-important": "mint",
      "not-urgent-not-important": "sky",
    },
    previewColors: ["#E57C58", "#E0A934", "#C4D7B2", "#B2C8DF"],
  },
  {
    id: "rose-light",
    name: "Rose Light (蜜桃粉 浅色)",
    darkMode: "light" as const,
    qColors: {
      "urgent-important": "rose",
      "important-not-urgent": "lavender",
      "urgent-not-important": "coral",
      "not-urgent-not-important": "yellow",
    },
    previewColors: ["#E8A0BF", "#9B7EC9", "#E57C58", "#E0A934"],
  },
  {
    id: "sky-light",
    name: "Sky Light (天空蓝 浅色)",
    darkMode: "light" as const,
    qColors: {
      "urgent-important": "sky",
      "important-not-urgent": "mint",
      "urgent-not-important": "lavender",
      "not-urgent-not-important": "yellow",
    },
    previewColors: ["#B2C8DF", "#C4D7B2", "#9B7EC9", "#E0A934"],
  },
  {
    id: "lavender-light",
    name: "Lavender Light (香芋紫 浅色)",
    darkMode: "light" as const,
    qColors: {
      "urgent-important": "lavender",
      "important-not-urgent": "rose",
      "urgent-not-important": "sky",
      "not-urgent-not-important": "mint",
    },
    previewColors: ["#9B7EC9", "#E8A0BF", "#B2C8DF", "#C4D7B2"],
  },
  // Dark 变体
  {
    id: "mint-dark",
    name: "Mint Dark (抹茶绿 深色)",
    darkMode: "dark" as const,
    qColors: {
      "urgent-important": "rose",
      "important-not-urgent": "mint",
      "urgent-not-important": "sky",
      "not-urgent-not-important": "yellow",
    },
    previewColors: ["#D48AAA", "#6FAD84", "#8AACCC", "#D4C060"],
  },
  {
    id: "lemon-dark",
    name: "Lemon Dark (甘菊黄 深色)",
    darkMode: "dark" as const,
    qColors: {
      "urgent-important": "coral",
      "important-not-urgent": "yellow",
      "urgent-not-important": "mint",
      "not-urgent-not-important": "sky",
    },
    previewColors: ["#E57C58", "#D4C060", "#6FAD84", "#8AACCC"],
  },
  {
    id: "rose-dark",
    name: "Rose Dark (蜜桃粉 深色)",
    darkMode: "dark" as const,
    qColors: {
      "urgent-important": "rose",
      "important-not-urgent": "lavender",
      "urgent-not-important": "coral",
      "not-urgent-not-important": "yellow",
    },
    previewColors: ["#D48AAA", "#B8A0D8", "#E57C58", "#D4C060"],
  },
  {
    id: "sky-dark",
    name: "Sky Dark (天空蓝 深色)",
    darkMode: "dark" as const,
    qColors: {
      "urgent-important": "sky",
      "important-not-urgent": "mint",
      "urgent-not-important": "lavender",
      "not-urgent-not-important": "yellow",
    },
    previewColors: ["#8AACCC", "#6FAD84", "#B8A0D8", "#D4C060"],
  },
  {
    id: "lavender-dark",
    name: "Lavender Dark (香芋紫 深色)",
    darkMode: "dark" as const,
    qColors: {
      "urgent-important": "lavender",
      "important-not-urgent": "rose",
      "urgent-not-important": "sky",
      "not-urgent-not-important": "mint",
    },
    previewColors: ["#B8A0D8", "#D48AAA", "#8AACCC", "#6FAD84"],
  },
];

const SUNSET_HOUR_OPTIONS: SelectOption<number>[] = Array.from({ length: 24 }).map((_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

const AI_PROVIDER_OPTIONS: SelectOption<string>[] = [
  { value: "openai", label: "OpenAI / DeepSeek / Custom (兼容协议)" },
  { value: "anthropic", label: "Anthropic Claude (原生协议)" }
];

const AI_MODEL_OPTIONS: SelectOption<string>[] = [
  { value: "gpt-4o", label: "gpt-4o (OpenAI)" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini (OpenAI)" },
  { value: "deepseek-chat", label: "deepseek-chat (DeepSeek V3)" },
  { value: "deepseek-reasoner", label: "deepseek-reasoner (DeepSeek R1)" },
  { value: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet (Claude)" },
  { value: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku (Claude)" },
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash (Gemini)" },
  { value: "custom", label: "✏️ 自定义模型名称..." },
];

const ALERT_SOUND_OPTIONS: SelectOption<AlertSoundType>[] = [
  { value: "beep", label: "电子 Chime 🔔 (Beep)" },
  { value: "cuckoo", label: "布谷鸟叫 🐦 (Cuckoo)" },
  { value: "meow", label: "猫咪叫 🐱 (Meow)" },
];

const LOCALE_OPTIONS: SelectOption<Locale>[] = [
  { value: "zh-CN", label: "中文 (简体)" },
  { value: "en", label: "English" },
];

interface SettingsViewProps {
  config: CustomizationConfig;
  onChange: (newConfig: CustomizationConfig) => void;
  alertSoundType: AlertSoundType;
  setAlertSoundType: (type: AlertSoundType) => void;
  resetTasks: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = React.memo(({
  config,
  onChange,
  alertSoundType,
  setAlertSoundType,
  resetTasks,
}) => {
  const { t } = useTranslation();
  const s = t.settings;
  const [subTab, setSubTab] = useState<"personalization" | "ai" | "sunset" | "sync" | "system" | "fun">("personalization");
  const [webdavUrl, setWebdavUrl] = useState(() => localStorage.getItem("qiyun_webdav_url") || "");
  const [webdavUser, setWebdavUser] = useState(() => localStorage.getItem("qiyun_webdav_user") || "");
  const [webdavPass, setWebdavPass] = useState(() => localStorage.getItem("qiyun_webdav_pass") || "");
  const [syncBackend, setSyncBackend] = useState<SyncBackendType>(() => syncEngine.currentBackend);
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem("qiyun_supabase_url") || "");
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem("qiyun_supabase_anon_key") || "");
  const [syncStatus, setSyncStatus] = useState(syncEngine.status);
  const [syncLastTime, setSyncLastTime] = useState<number | null>(syncEngine.lastSyncTime);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [aiPraiseList, setAiPraiseList] = useState<string[]>(() => {
    return safeJsonParse(localStorage.getItem("qiyun_ai_praise"), []);
  });
  const [generatingPraise, setGeneratingPraise] = useState(false);

  useEffect(() => {
    return syncEngine.subscribe((state) => {
      setSyncStatus(state.status);
      setSyncLastTime(state.lastSyncTime);
    });
  }, []);
  const triggerToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleColorChange = (quadId: "urgent-important" | "important-not-urgent" | "urgent-not-important" | "not-urgent-not-important", colorKey: string) => {
    const newConfig = {
      ...config,
      qColors: {
        ...config.qColors,
        [quadId]: colorKey,
      },
    };
    onChange(newConfig);
  };

  const handleStyleChange = <K extends keyof CustomizationConfig>(
    key: K,
    value: CustomizationConfig[K]
  ) => {
    const newConfig = {
      ...config,
      [key]: value,
    };
    onChange(newConfig);
  };

  const handleSaveAiConfig = () => {
    onChange({ ...config });
    triggerToast(s.aiConfigSaved, "success");
  };

  const handleTestAiConnection = async () => {
    if (!config.aiApiKey?.trim()) {
      triggerToast(s.aiFillKey, "error");
      return;
    }
    if (config.aiModel === "custom" || !config.aiModel?.trim()) {
      triggerToast(s.aiFillModel, "error");
      return;
    }
    setIsAiTesting(true);
    try {
      const reply = await testAIConnection(config);
      triggerToast(`${s.aiTestSuccess}${reply.slice(0, 40)}${reply.length > 40 ? "…" : ""}`, "success");
    } catch (e: any) {
      console.error(e);
      triggerToast(`${s.aiTestFail}: ${e.message || e}`, "error");
    } finally {
      setIsAiTesting(false);
    }
  };

  const quadrants = [
    { id: "urgent-important", label: "I. " + t.matrix.urgentImportant },
    { id: "important-not-urgent", label: "II. " + t.matrix.importantNotUrgent },
    { id: "urgent-not-important", label: "III. " + t.matrix.urgentNotImportant },
    { id: "not-urgent-not-important", label: "IV. " + t.matrix.notUrgentNotImportant },
  ] as const;

  const bgClassMap = {
    white: "bg-white",
    grid: "bg-grid-pattern",
    lined: "bg-lined-pattern",
    watercolor: "bg-watercolor-pattern",
    doodle: "bg-doodle-pattern",
  };

  const q1Color = PLANNER_COLORS[config.qColors["urgent-important"]] || PLANNER_COLORS.rose;
  const showLivePreview = subTab === "personalization";

  return (
    <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-5 gap-6 flex-grow select-none">
      {/* 左侧配置栏 */}
      <div
        className={`rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col gap-5 shadow-sm backdrop-blur-sm ${
          showLivePreview ? "lg:col-span-3" : "lg:col-span-5"
        }`}
      >
        {/* 二级菜单页签 */}
        <div className="flex flex-wrap gap-2 pb-3.5 border-b border-[#EFEBE4]">
          {[
            { id: "personalization", label: s.personalization },
            { id: "sunset", label: s.sunset },
            { id: "ai", label: s.ai },
            { id: "sync", label: s.sync },
            { id: "fun", label: s.fun },
            { id: "system", label: s.system },
          ].map((tabItem) => {
            const isSelected = subTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setSubTab(tabItem.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
                  isSelected
                    ? "bg-[#FCF2F0] text-[#A34E36] border border-[#F5DFDB] shadow-xs font-black"
                    : "bg-transparent text-slate-500 border border-transparent hover:bg-white hover:text-slate-800"
                }`}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>

        {/* 1. 个性化装扮面签 */}
        {subTab === "personalization" && (
          <div className="space-y-5 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            {/* 0. 昵称 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.nickname}
              </h4>
              <input
                type="text"
                defaultValue={localStorage.getItem("qiyun_nickname") || ""}
                onChange={(e) => localStorage.setItem("qiyun_nickname", e.target.value)}
                placeholder={s.nicknamePlaceholder}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEBE4] bg-white/80 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#C4D7B2] focus:border-transparent transition-all"
              />
            </div>
            {/* 0.2 主题显示模式 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.themeMode || "🌓 主题显示模式"}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "light", label: "☀️ " + (s.themeLight || "浅色模式") },
                  { id: "dark", label: "🌙 " + (s.themeDark || "深色模式") },
                  { id: "auto", label: "🖥️ " + (s.themeAuto || "跟随系统") },
                ].map((mode) => {
                  const isSelected = (config.darkMode || "light") === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleStyleChange("darkMode", mode.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-extrabold border transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:border-slate-300"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🎨 推荐主题预设 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                🎨 推荐主题预设 (10 个主题平铺)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {THEME_PRESETS.map((preset) => {
                  const isMatch =
                    config.darkMode === preset.darkMode &&
                    JSON.stringify(config.qColors) === JSON.stringify(preset.qColors);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        audioEngine.playStickSound();
                        onChange({
                          ...config,
                          darkMode: preset.darkMode,
                          qColors: preset.qColors,
                        });
                      }}
                      className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer text-left flex flex-col justify-between gap-1.5 hover:scale-105 active:scale-95 ${
                        isMatch
                          ? "border-[#4D7C5D] bg-[#F0F5F1]/30 ring-1 ring-[#4D7C5D]/20 shadow-xs"
                          : "bg-white border-[#EFEBE4] hover:border-slate-300"
                      }`}
                    >
                      <span className="text-[9px] font-bold text-slate-700 truncate block w-full">
                        {preset.name.split(" ")[0]} {preset.darkMode === "dark" ? "🌙" : "☀️"}
                      </span>
                      <div className="flex gap-1">
                        {preset.previewColors.map((c, i) => (
                          <span
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-2xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 0.5 城市 */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.weatherCity}
              </h4>
              <input
                type="text"
                defaultValue={config.weatherCity || ""}
                onChange={(e) => handleStyleChange("weatherCity", e.target.value)}
                placeholder={s.weatherCityPlaceholder}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEBE4] bg-white/80 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#C4D7B2] focus:border-transparent transition-all"
              />
            </div>
            {/* 1.1 四象限色彩 */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.quadColors}
              </h4>
              <div className="space-y-2.5">
                {quadrants.map((quad) => {
                  const selectedColor = config.qColors[quad.id];
                  return (
                    <div key={quad.id} className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-600 min-w-[90px]">
                        {quad.label}
                      </span>
                      <div className="flex gap-2">
                        {Object.entries(PLANNER_COLORS).map(([colorKey, colorConfig]) => {
                          const isSelected = selectedColor === colorKey;
                          return (
                            <button
                              key={colorKey}
                              onClick={() => handleColorChange(quad.id, colorKey)}
                              className={`w-5.5 h-5.5 rounded-full ${colorConfig.dot} border border-slate-200 transition-all hover:scale-110 cursor-pointer relative ${
                                isSelected ? "ring-2 ring-slate-400 ring-offset-2 scale-110 shadow-xs" : "opacity-80 hover:opacity-100"
                              }`}
                              title={colorConfig.name}
                            >
                              {isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-extrabold">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 1.2 卡片纹理 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.cardBg}
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "white", label: s.white },
                  { id: "grid", label: s.grid },
                  { id: "lined", label: s.lined },
                  { id: "watercolor", label: s.watercolor },
                  { id: "doodle", label: s.doodle },
                ].map((pattern) => {
                  const isSelected = config.cardBackground === pattern.id;
                  return (
                    <button
                      key={pattern.id}
                      onClick={() => handleStyleChange("cardBackground", pattern.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-extrabold border transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:border-slate-300"
                      }`}
                    >
                      {pattern.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1.3 别针夹子 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.pinStyle}
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "pin", label: s.pin },
                  { id: "tape", label: s.tape },
                  { id: "clip", label: s.clip },
                  { id: "heart", label: s.heart },
                  { id: "smiley", label: s.smiley },
                ].map((pin) => {
                  const isSelected = config.pinType === pin.id;
                  return (
                    <button
                      key={pin.id}
                      onClick={() => handleStyleChange("pinType", pin.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-extrabold border transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:border-slate-300"
                      }`}
                    >
                      {pin.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1.4 毛玻璃及字体 */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                  {s.glass}
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "light", label: s.glassLight },
                    { id: "matte", label: s.glassMatte },
                    { id: "solid", label: s.glassSolid },
                  ].map((glass) => {
                    const isSelected = (config.interfaceGlass || "matte") === glass.id;
                    return (
                      <button
                        key={glass.id}
                        onClick={() => handleStyleChange("interfaceGlass", glass.id as any)}
                        className={`py-2 rounded-xl text-[10px] font-extrabold border transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 ${
                          isSelected
                            ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                            : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:border-slate-300"
                        }`}
                      >
                        {glass.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                  {s.font}
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "sans", label: s.fontSans },
                    { id: "rounded", label: s.fontRounded },
                    { id: "serif", label: s.fontSerif },
                  ].map((font) => {
                    const isSelected = (config.fontFamily || "sans") === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => handleStyleChange("fontFamily", font.id as any)}
                        className={`py-2 rounded-xl text-[10px] font-extrabold border transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 ${
                          isSelected
                            ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                            : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:border-slate-300"
                        }`}
                      >
                        {font.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 1.5 背景球 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                {s.watercolorBg}
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "oasis", label: s.oasis },
                  { id: "aurora", label: s.aurora },
                  { id: "sunny", label: s.sunny },
                  { id: "none", label: s.none },
                ].map((wc) => {
                  const isSelected = (config.watercolorStyle || "oasis") === wc.id;
                  return (
                    <button
                      key={wc.id}
                      onClick={() => handleStyleChange("watercolorStyle", wc.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-extrabold border transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:border-slate-300"
                      }`}
                    >
                      {wc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. 日落护眼模式设置面签 */}
        {subTab === "sunset" && (
          <div className="space-y-5 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            <div className="bg-[#FAF5ED] border border-[#EFE5D3] p-4 rounded-2xl flex items-start gap-3">
              <Moon className="w-5 h-5 text-[#8B6E3C] mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>🌅 什么是日落护眼模式？</strong>
                <p className="mt-1">{s.sunsetDesc}</p>
              </div>
            </div>

            {/* 自动启用开关 */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EFEBE4] bg-white/50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">{s.sunsetToggle}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{s.sunsetToggleDesc}</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableSunsetMode !== false}
                onChange={(e) => handleStyleChange("enableSunsetMode", e.target.checked)}
                className="w-4 h-4 accent-[#A34E36] cursor-pointer"
              />
            </div>

            {/* 时间跨度选择 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">
                   {s.sunsetStart}
                </label>
                <CustomSelect
                  value={config.sunsetStartHour ?? 18}
                  onChange={(val) => handleStyleChange("sunsetStartHour", val)}
                  options={SUNSET_HOUR_OPTIONS}
                  disabled={config.enableSunsetMode === false}
                  className="w-full"
                  dropdownAlign="top"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">
                   {s.sunsetEnd}
                </label>
                <CustomSelect
                  value={config.sunsetEndHour ?? 6}
                  onChange={(val) => handleStyleChange("sunsetEndHour", val)}
                  options={SUNSET_HOUR_OPTIONS}
                  disabled={config.enableSunsetMode === false}
                  className="w-full"
                  dropdownAlign="top"
                />
              </div>
            </div>

            {/* 暖色色温调节 Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">{s.sunsetWarmth}</span>
                <span className="text-[10px] font-extrabold text-[#A34E36]">{config.sunsetWarmth ?? 50}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={config.sunsetWarmth ?? 50}
                onChange={(e) => handleStyleChange("sunsetWarmth", parseInt(e.target.value, 10))}
                disabled={config.enableSunsetMode === false}
                className="w-full cursor-pointer accent-[#A34E36]"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-extrabold uppercase">
                <span>{s.sunsetWarmthLow}</span>
                <span>{s.sunsetWarmthHigh}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. AI 助手设定面签 */}
        {subTab === "ai" && (
          <div className="space-y-4 flex-grow overflow-y-auto max-h-[520px] pr-1 custom-scrollbar">
            {/* 提示信息 */}
            <div className="bg-[#FAF5ED] border border-[#EFE5D3] p-4 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#8B6E3C] mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>🤖 AI 智能优先级分类助手</strong>
                <p className="mt-1">{s.aiDesc}</p>
              </div>
            </div>

            {/* 启用自动分类开关 */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#EFEBE4] bg-white/50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">{s.aiAutoToggle}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{s.aiAutoToggleDesc}</span>
              </div>
              <input
                type="checkbox"
                checked={config.aiAutoCategorize || false}
                onChange={(e) => handleStyleChange("aiAutoCategorize", e.target.checked)}
                className="w-4 h-4 accent-[#4D7C5D] cursor-pointer"
              />
            </div>

            {/* API Endpoint & Key */}
            {(() => {
              const isPresetModel = AI_MODEL_OPTIONS.some(opt => opt.value === config.aiModel && opt.value !== "custom");
              const dropdownValue = isPresetModel ? (config.aiModel || "gpt-4o") : "custom";
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {s.aiProvider}
                      </label>
                      <CustomSelect
                        value={config.aiProvider || "openai"}
                        onChange={(val) => {
                          handleStyleChange("aiProvider", val as "openai" | "anthropic");
                          if (val === "anthropic" && !config.aiEndpoint) {
                            handleStyleChange("aiEndpoint", "https://api.anthropic.com/v1/messages");
                          } else if (val === "openai" && (!config.aiEndpoint || config.aiEndpoint.includes("anthropic"))) {
                            handleStyleChange("aiEndpoint", "https://api.openai.com/v1");
                          }
                        }}
                        options={AI_PROVIDER_OPTIONS}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {s.aiApiKey}
                      </label>
                      <input
                        type="password"
                        placeholder="sk-••••••••••••••••••••••••"
                        value={config.aiApiKey || ""}
                        onChange={(e) => handleStyleChange("aiApiKey", e.target.value)}
                        className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {s.aiEndpoint}
                      </label>
                      <input
                        type="text"
                        placeholder={config.aiProvider === "anthropic" ? "https://api.anthropic.com/v1/messages" : "https://api.openai.com/v1"}
                        value={config.aiEndpoint || ""}
                        onChange={(e) => handleStyleChange("aiEndpoint", e.target.value)}
                        className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {s.aiModel}
                      </label>
                      <CustomSelect
                        value={dropdownValue}
                        onChange={(val) => {
                          if (val === "custom") {
                            handleStyleChange("aiModel", "custom");
                          } else {
                            handleStyleChange("aiModel", val);
                          }
                        }}
                        options={AI_MODEL_OPTIONS}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {dropdownValue === "custom" && (
                    <div className="bg-[#FAF8F5]/80 border border-[#EFEBE4] p-3 rounded-xl animate-fade-in-up">
                      <label className="text-[10px] font-bold text-[#8B6E3C] uppercase block mb-1">
                        {s.aiModelCustom}
                      </label>
                      <input
                        type="text"
                        placeholder="例如: gpt-4o-mini 或 deepseek-reasoner 或 ollama/llama3"
                        value={config.aiModel === "custom" ? "" : (config.aiModel || "")}
                        onChange={(e) => handleStyleChange("aiModel", e.target.value)}
                        className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 保存 & 测试连接 */}
            <div className="flex gap-3 pt-1 sticky bottom-0 bg-white/90 backdrop-blur-sm pb-1">
              <button
                type="button"
                onClick={handleSaveAiConfig}
                className="flex-1 bg-[#4D7C5D] hover:bg-[#3F684C] text-white py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 transition-all shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                 {s.aiSave}
              </button>
              <button
                type="button"
                onClick={handleTestAiConnection}
                disabled={isAiTesting}
                className="flex-1 bg-[#8B6E3C] hover:bg-[#725A31] disabled:bg-slate-300 text-white py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 transition-all shadow-xs"
              >
                {isAiTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                {s.aiTest}
              </button>
            </div>
          </div>
        )}

        {/* 4. 备份同步 WebDav 面签 */}
        {subTab === "sync" && (
          <div className="space-y-4 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            {/* 同步后端选择 */}
            <div className="bg-[#FAF8F5] border border-[#EFEBE4] p-4 rounded-2xl flex items-start gap-3">
              <Cloud className="w-5 h-5 text-[#8B6E3C] mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>☁️ {s.syncTitle || "数据同步"}</strong>
                <p className="mt-1">{s.syncDesc}</p>
              </div>
            </div>

            {/* 后端选择器 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">同步后端</label>
              <div className="flex gap-2">
                {([["none", "不使用"], ["webdav", "坚果云 WebDAV"], ["supabase", "Supabase"]] as [SyncBackendType, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => {
                      setSyncBackend(val);
                      syncEngine.setBackend(val);
                    }}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer ${
                      syncBackend === val
                        ? "bg-[#4D7C5D] text-white border-[#4D7C5D]"
                        : "bg-white text-slate-600 border-[#EFEBE4] hover:border-[#4D7C5D]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 坚果云 WebDAV 配置 */}
            {syncBackend === "webdav" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{s.syncUrl}</label>
                  <input
                    type="text"
                    placeholder="https://dav.jianguoyun.com/dav/"
                    value={webdavUrl}
                    onChange={(e) => {
                      setWebdavUrl(e.target.value);
                      localStorage.setItem("qiyun_webdav_url", e.target.value);
                    }}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{s.syncUser}</label>
                    <input
                      type="text"
                      placeholder="your-email@example.com"
                      value={webdavUser}
                      onChange={(e) => {
                        setWebdavUser(e.target.value);
                        localStorage.setItem("qiyun_webdav_user", e.target.value);
                      }}
                      className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{s.syncPass}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={webdavPass}
                      onChange={(e) => {
                        setWebdavPass(e.target.value);
                        localStorage.setItem("qiyun_webdav_pass", e.target.value);
                      }}
                      className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Supabase 配置 */}
            {syncBackend === "supabase" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Supabase URL</label>
                  <input
                    type="text"
                    placeholder="https://your-project.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => {
                      setSupabaseUrl(e.target.value);
                      localStorage.setItem("qiyun_supabase_url", e.target.value);
                    }}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Anon Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    value={supabaseKey}
                    onChange={(e) => {
                      setSupabaseKey(e.target.value);
                      localStorage.setItem("qiyun_supabase_anon_key", e.target.value);
                    }}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                  />
                </div>
              </div>
            )}

            {/* 同步状态与操作 */}
            {syncBackend !== "none" && (
              <div className="space-y-3">
                {/* 状态显示 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#EFEBE4] bg-white/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      {syncStatus === "syncing" ? "同步中..." :
                       syncStatus === "success" ? "上次同步成功" :
                       syncStatus === "error" ? "同步出错" : "等待同步"}
                    </span>
                    {syncLastTime && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {new Date(syncLastTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    syncStatus === "syncing" ? "bg-blue-100 text-blue-600" :
                    syncStatus === "success" ? "bg-green-100 text-green-600" :
                    syncStatus === "error" ? "bg-red-100 text-red-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {syncStatus === "syncing" ? "同步中" :
                     syncStatus === "success" ? "已同步" :
                     syncStatus === "error" ? "失败" : "待同步"}
                  </span>
                </div>

                {/* 操作按钮组 */}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (syncBackend === "webdav") {
                        syncEngine.webdavProvider.setConfig({
                          url: webdavUrl,
                          username: webdavUser,
                          password: webdavPass || undefined,
                        });
                      } else {
                        syncEngine.supabaseProvider.setConfig({
                          url: supabaseUrl,
                          anonKey: supabaseKey,
                        });
                      }
                      setIsLoading(true);
                      const ok = await syncEngine.testConnection();
                      setIsLoading(false);
                      triggerToast(ok ? "连接成功 ✅" : "连接失败 ❌", ok ? "success" : "error");
                    }}
                    disabled={isLoading}
                    className="flex-1 bg-white border border-[#EFEBE4] hover:border-[#4D7C5D] text-slate-600 py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                    测试连接
                  </button>
                  <button
                    onClick={async () => {
                      if (syncBackend === "webdav") {
                        syncEngine.webdavProvider.setConfig({
                          url: webdavUrl,
                          username: webdavUser,
                          password: webdavPass || undefined,
                        });
                      } else {
                        syncEngine.supabaseProvider.setConfig({
                          url: supabaseUrl,
                          anonKey: supabaseKey,
                        });
                      }
                      setIsLoading(true);
                      await syncEngine.sync();
                      setIsLoading(false);
                      if (syncEngine.status === "success") {
                        triggerToast("同步成功 ✅", "success");
                      }
                    }}
                    disabled={isLoading || syncStatus === "syncing"}
                    className="flex-1 bg-[#4D7C5D] hover:bg-[#3F684C] disabled:bg-slate-300 text-white py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                    立即同步
                  </button>
                </div>

                {/* 自动同步开关 */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-[#EFEBE4] bg-white/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">自动同步</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">数据变更后自动同步到云端</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableAutoBackup !== false}
                    onChange={(e) => {
                      syncEngine.setAutoSync(e.target.checked, (config.syncInterval || 60) * 1000);
                      onChange({ ...config, enableAutoBackup: e.target.checked });
                    }}
                    className="w-4 h-4 accent-[#4D7C5D] cursor-pointer"
                  />
                </div>
                {config.enableAutoBackup !== false && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[#EFEBE4] bg-white/50 mt-2">
                    <span className="text-[10px] font-bold text-slate-600 block">同步间隔</span>
                    <select
                      value={config.syncInterval || 60}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        syncEngine.setAutoSync(true, val * 1000);
                        onChange({ ...config, syncInterval: val });
                      }}
                      className="bg-[#FAF8F5] dark:bg-[#3D424A] border border-[#EFEBE4] dark:border-[#4D525A] px-2 py-1 rounded-lg text-[10px] text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:border-[#C4D7B2]"
                    >
                      <option value={15}>每15秒</option>
                      <option value={30}>每30秒</option>
                      <option value={60}>每1分钟</option>
                      <option value={300}>每5分钟</option>
                      <option value={900}>每15分钟</option>
                      <option value={1800}>每30分钟</option>
                      <option value={3600}>每小时</option>
                      <option value={0}>仅手动</option>
                    </select>
                  </div>
                )}

                {/* AI 工具集成 */}
                {syncBackend === "webdav" && webdavUrl && webdavUser && (
                  <div className="p-3 rounded-xl border border-[#DEEAE2] dark:border-[#4D525A] bg-[#F0F5F1]/50 dark:bg-[#3D424A]/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#4D7C5D] dark:text-[#6DAF7E]" />
                      <span className="text-[11px] font-bold text-[#4D7C5D] dark:text-[#6DAF7E]">AI 智能体集成</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">将待办管理能力作为工具赋予你的 AI 助手，一键复制函数定义即可粘贴到 OpenAI/Claude 的 tools 参数中。</p>
                    <button
                      onClick={() => {
                        const doc = `# 🎯 QiYun-List 数据管理工具集

通过坚果云 WebDAV 读写用户的所有应用数据：待办、便签、心情、习惯、倒计时等。

---

## 📦 数据文件一览

| # | 文件 | 内容 | 结构 |
|---|------|------|------|
| 1 | \`tasks.json\` | 待办任务列表 | \`Task[]\` |
| 2 | \`completed.json\` | 已完成任务 | \`Task[]\` |
| 3 | \`notes.json\` | 便签 | \`StickyNote[]\` |
| 4 | \`pomodoro.json\` | 专注记录 | \`PomodoroLog[]\` |
| 5 | \`countdowns.json\` | 倒计时事件 | \`CountdownEvent[]\` |
| 6 | \`habits.json\` | 习惯 + 打卡 + 心情 | \`{ habits[], habitLogs, moods }\` |
| 7 | \`config.json\` | 应用配置 | \`CustomizationConfig\` |
| 8 | \`manifest.json\` | ⚠️ 版本清单 | \`{ "分类": { "version": 时间戳 } }\` |

> **manifest.json 最关键**：每次写数据后必须更新版本号，否则 App 不会拉取新数据。

---

## 🔧 通用操作

所有文件操作方式一致，以 tasks.json 为例：

### 读取
\`\`\`bash
curl -s -u "${webdavUser}:${webdavPass}" \\
  "${webdavUrl}QiYunList/tasks.json"
\`\`\`
404 → 空数组 \`[]\` 或空对象 \`{}\`。

### 写入（新增/更新/删除）
\`\`\`bash
# 1. 读取当前数据
curl -s -u "${webdavUser}:${webdavPass}" "${webdavUrl}QiYunList/tasks.json"

# 2. 修改数组（id 用 Date.now().toString(36)+Math.random().toString(36).slice(2,6)）

# 3. PUT 写回完整数组
curl -s -X PUT -u "${webdavUser}:${webdavPass}" \\
  -H "Content-Type: application/json" \\
  -d '<完整 JSON 数组>' \\
  "${webdavUrl}QiYunList/tasks.json"

# 4. ⚠️ 更新 manifest.json 版本号
#    GET → 修改对应分类 version 为 Date.now() → PUT
curl -s -u "${webdavUser}:${webdavPass}" "${webdavUrl}QiYunList/manifest.json"
#    {"tasks":{"version":1712345678000}}
curl -s -X PUT -u "${webdavUser}:${webdavPass}" \\
  -H "Content-Type: application/json" \\
  -d '<更新后的 manifest>' \\
  "${webdavUrl}QiYunList/manifest.json"
\`\`\`

---

## 📋 各数据格式

### Task（待办）
\`\`\`json
{"id":"k3x8p2a","title":"准备汇报","category":"important-not-urgent","dueDate":"2026-07-10","dueTime":"18:00","tags":["工作"],"description":"详情","isFavorite":false,"subtasks":[{"id":"m9n","title":"子任务","completed":false}],"repeat":"none"}
\`\`\`
category: \`urgent-important\` \`important-not-urgent\` \`urgent-not-important\` \`not-urgent-not-important\`

### StickyNote（便签）
\`\`\`json
{"id":"abc","text":"便签内容","color":"#FFD700","rotate":-3}
\`\`\`

### CountdownEvent（倒计时）
\`\`\`json
{"id":"cde","title":"春节","targetDate":"2027-01-28","emoji":"🎉","color":"#D4380D"}
\`\`\`

### PomodoroLog（专注记录）
\`\`\`json
{"id":"xyz","timestamp":1700000000000,"duration":1500,"taskId":"k3x","taskTitle":"标题"}
\`\`\`

### habits.json（习惯 + 打卡 + 心情）
\`\`\`json
{"habits":[{"id":"h1","title":"早起","emoji":"🌅"}],"habitLogs":{"2026-07-05":["h1"]},"moods":{"2026-07-05":4}}
\`\`\`

### config.json（配置）
应用完整配置，读取可查看，修改需谨慎。

---

## 📐 规则
1. **404** = 数据不存在，初始化为 \`[]\` 或 \`{}\`
2. **完整写回**：永远 PUT 完整数据，不丢失其他字段
3. **manifest**：每次写数据后同步更新 manifest.json 版本号（用 \`Date.now()\`）
4. **确认**：操作前展示变更内容让用户确认`;

                        navigator.clipboard.writeText(doc);
                        triggerToast("已复制 ✅ 完整技能定义，可直接粘贴给 AI", "success");
                      }}
                      className="w-full bg-white dark:bg-[#2D323A] hover:bg-[#F5F1EA] dark:hover:bg-[#3D424A] border border-[#DEEAE2] dark:border-[#4D525A] text-[#4D7C5D] dark:text-[#6DAF7E] py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Copy className="w-3 h-3" />
                      复制 AI 工具定义
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 本地快照备份 */}
            <div className="pt-4 border-t border-[#EFEBE4] space-y-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#8B6E3C]" />
                <span className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">{s.snapshotTitle || "本地快照备份"}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                {s.snapshotDesc || "一键导出全部数据为 JSON 文件，换电脑或重装后可拖入恢复，不依赖网络。"}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const data = {
                      tasks: safeJsonParse(localStorage.getItem("aero_todos"), []),
                      completedTasks: safeJsonParse(localStorage.getItem("aero_completed_todos"), []),
                      stickyNotes: safeJsonParse(localStorage.getItem("aero_sticky_notes"), []),
                      customizationConfig: safeJsonParse(localStorage.getItem("aero_customization_config"), {}),
                      pomodoroLogs: safeJsonParse(localStorage.getItem("aero_pomodoro_logs"), []),
                      countdowns: safeJsonParse(localStorage.getItem("qiyun_countdowns"), []),
                      habits: safeJsonParse(localStorage.getItem("qiyun_habits"), []),
                      habitLogs: safeJsonParse(localStorage.getItem("qiyun_habit_logs"), {}),
                      moods: safeJsonParse(localStorage.getItem("qiyun_moods"), {}),
                      aiPraise: safeJsonParse(localStorage.getItem("qiyun_ai_praise"), []),
                      exportedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `qiyun-list-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    triggerToast(s.snapshotExported || "导出成功 ✅", "success");
                  }}
                  className="flex-1 bg-[#4D7C5D] hover:bg-[#3F684C] text-white py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  {s.snapshotExport || "导出快照"}
                </button>
                <button
                  onClick={() => document.getElementById("snapshot-file-input")?.click()}
                  className="flex-1 bg-[#B2C8DF] hover:bg-[#9BB5CF] text-white py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {s.snapshotImport || "导入快照"}
                </button>
                <input
                  id="snapshot-file-input"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const data = JSON.parse(ev.target?.result as string);
                        const normalized = normalizeSyncData(data);
                        if (!normalized) {
                          triggerToast(s.snapshotImportError || "导入失败，文件格式不正确", "error");
                          return;
                        }
                        applySyncData(normalized);
                        if (data.aiPraise) {
                          localStorage.setItem("qiyun_ai_praise", JSON.stringify(data.aiPraise));
                        }
                        triggerToast(s.snapshotImported || "导入成功 ✅", "success");
                      } catch {
                        triggerToast(s.snapshotImportError || "导入失败，文件格式不正确", "error");
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. 系统设置与提示音面签 */}
        {subTab === "system" && (
          <div className="space-y-6 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            {/* 语言选择 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">{s.language}</h4>
              <p className="text-[10px] text-slate-400 font-medium">{s.languageDesc}</p>
              <CustomSelect
                value={config.locale || "zh-CN"}
                onChange={(val) => {
                  handleStyleChange("locale", val as Locale);
                }}
                options={LOCALE_OPTIONS}
                className="w-full max-w-sm"
              />
            </div>

            {/* 系统声音选择 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">{s.soundTitle}</h4>
              <p className="text-[10px] text-slate-400 font-medium">{s.soundDesc}</p>
              <CustomSelect
                value={alertSoundType}
                onChange={(val) => {
                  setAlertSoundType(val);
                  localStorage.setItem("aero_alert_sound_type", val);
                }}
                options={ALERT_SOUND_OPTIONS}
                className="w-full max-w-sm"
              />
            </div>

            {/* 清空及重置 */}
            <div className="space-y-3 pt-5 border-t border-dashed border-[#EFEBE4]">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#A34E36]" />
                <span>{s.dangerZone}</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">{s.dangerDesc}</p>
              <button
                onClick={() => {
                  if (confirm(s.factoryResetConfirm)) {
                    resetTasks();
                    triggerToast(s.factoryResetDone, "success");
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-[#A34E36] border border-[#F5DFDB] px-4 py-2.5 rounded-xl text-[10px] font-extrabold hover:scale-105 transition-all shadow-xs cursor-pointer block"
              >
                {s.factoryReset}
              </button>
            </div>
          </div>
        )}

        {/* 6. 趣味设置 */}
        {subTab === "fun" && (
          <div className="space-y-6 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            {/* 夸夸模式开关 */}
            <div className="bg-[#FAF8F5] border border-[#EFEBE4] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 block">🎉 夸夸模式</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">完成任务时全屏撒花 + 夸赞消息</span>
              </div>
              <input
                type="checkbox"
                checked={config.enableCelebration !== false}
                onChange={(e) => {
                  onChange({ ...config, enableCelebration: e.target.checked });
                }}
                className="w-4 h-4 accent-[#4D7C5D] cursor-pointer"
              />
            </div>

            {/* AI 夸夸词库管理 */}
            {config.enableCelebration !== false && (
              <div className="bg-[#FAF8F5] border border-[#EFEBE4] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    AI 夸夸词库（{aiPraiseList.length} 条）
                  </span>
                  {config.aiApiKey && (
                    <button
                      onClick={async () => {
                        setGeneratingPraise(true);
                        try {
                          const msgs = await generatePraiseBatch(config, config.locale || "zh-CN", 5);
                          const existing = new Set(aiPraiseList);
                          const newOnes = msgs.filter((m) => !existing.has(m));
                          if (newOnes.length > 0) {
                            const updated = [...aiPraiseList, ...newOnes];
                            setAiPraiseList(updated);
                            localStorage.setItem("qiyun_ai_praise", JSON.stringify(updated));
                          }
                        } catch {}
                        setGeneratingPraise(false);
                      }}
                      disabled={generatingPraise}
                      className="text-[10px] font-bold text-[#4D7C5D] hover:text-[#3F684C] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#C4D7B2] hover:bg-[#F0F5F1] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Wand2 className={`w-3 h-3 ${generatingPraise ? "animate-spin" : ""}`} />
                      {generatingPraise ? "生成中..." : "用 AI 生成 5 条夸夸"}
                    </button>
                  )}
                </div>
                {aiPraiseList.length > 0 ? (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {aiPraiseList.map((msg, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-[#EFEBE4] rounded-lg px-3 py-1.5 group">
                        <span className="text-[11px] text-slate-700 font-medium truncate">{msg}</span>
                        <button
                          onClick={() => {
                            const updated = aiPraiseList.filter((_, j) => j !== i);
                            setAiPraiseList(updated);
                            localStorage.setItem("qiyun_ai_praise", JSON.stringify(updated));
                          }}
                          className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    {config.aiApiKey ? "点击上方按钮用 AI 生成夸夸词" : "配置 AI API Key 后可自动生成更多夸夸词"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 同步 Toast 气泡 */}
        {toast && (
          <div
            className={`fixed bottom-10 left-1/3 transform -translate-x-1/2 px-4 py-2 rounded-xl border text-[10px] font-extrabold shadow-md z-50 flex items-center gap-1.5 animate-fade-in-up ${
              toast.type === "success"
                ? "bg-[#F0F5F1] border-[#DEEAE2] text-[#4D7C5D]"
                : "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36]"
            }`}
          >
            {toast.type === "success" ? "✓" : "⚠️"} {toast.text}
          </div>
        )}
      </div>

      {/* 右侧实时预览面板 — 仅个性装扮页展示 */}
      {showLivePreview && (
      <div className="lg:col-span-2 rounded-2xl bg-[#F4EFEA]/40 border border-[#EFEBE4] p-5 flex flex-col items-center justify-center gap-5 shadow-sm backdrop-blur-sm relative min-h-[360px]">
        <span className="absolute top-3.5 left-4 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
          {s.livePreview}
        </span>

        {/* 待办卡片效果预览 */}
        <div className="w-full max-w-[250px] h-[165px] rounded-2xl p-4 flex flex-col justify-between shadow-md border border-[#EFEBE4] relative overflow-hidden bg-white select-none scale-95 transition-all">
          {/* Apply selected card pattern */}
          <div className={`absolute inset-0 z-0 ${bgClassMap[config.cardBackground]}`} />

          {/* Doodle watermark */}
          {config.cardBackground === "doodle" && (
            <div className="absolute right-4 bottom-12 opacity-10 pointer-events-none text-slate-700">
              <Sparkles className="w-9 h-9" />
            </div>
          )}

          <div className="z-10 flex items-center justify-between">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${q1Color.bg} border ${q1Color.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${q1Color.dot}`} />
              <span className={`text-[7.5px] font-extrabold uppercase tracking-wider ${q1Color.text}`}>
                {s.previewCardTag}
              </span>
            </div>
            <Heart className="w-3.5 h-3.5 text-[#E8A0BF] hover:fill-[#E8A0BF] cursor-pointer" />
          </div>

          <div className="z-10 flex-grow flex flex-col justify-center my-1.5">
            <h4 className="text-xs font-bold text-[#2D323A] line-clamp-1 leading-snug">
              {s.previewCardTitle}
            </h4>
            <p className="text-[9px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {s.previewCardDesc}
            </p>
          </div>

          <div className="z-10 flex items-center justify-between border-t border-[#FAF8F5] pt-2 text-[7.5px] text-slate-400 tracking-wider font-bold">
            <span>{t.taskCard.swipeLeft}</span>
            <span>{t.taskCard.swipeRight}</span>
          </div>
        </div>

        {/* 拟物化便签预览 */}
        <div className="w-full max-w-[250px] rounded-2xl border border-[#EFE5D3] bg-[#FAF5ED] p-4 pt-5 shadow-md flex flex-col justify-between min-h-[110px] relative scale-95 -rotate-1 select-none transition-all">
          <StickyPin type={config.pinType} />

          <div className="text-[10px] font-semibold text-[#8B6E3C] leading-relaxed flex-grow">
            {s.previewNote}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#EFE5D3]/60 mt-1 text-[8px] text-[#8B6E3C]/60 font-bold">
            <span>{s.previewSticky}</span>
            <span>{s.previewFixed}</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
});
