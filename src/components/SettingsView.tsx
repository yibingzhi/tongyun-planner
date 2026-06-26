import React, { useState } from "react";
import { Sparkles, Heart, Cloud, RefreshCw, Upload, Download, AlertTriangle, Moon } from "lucide-react";
import type { CustomizationConfig, WebDavConfig, AlertSoundType } from "../types";
import { PLANNER_COLORS } from "../constants";
import type { SelectOption } from "../constants";
import { StickyPin } from "./StickyPin";
import { CustomSelect } from "./CustomSelect";

const SUNSET_HOUR_OPTIONS: SelectOption<number>[] = Array.from({ length: 24 }).map((_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, "0")}:00`,
}));

const AI_MODEL_OPTIONS: SelectOption<string>[] = [
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4-turbo", label: "gpt-4-turbo" },
  { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
  { value: "gemini-2.5-pro", label: "gemini-2.5-pro" },
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash" },
  { value: "custom", label: "custom / 其他自定义模型" },
];

const ALERT_SOUND_OPTIONS: SelectOption<AlertSoundType>[] = [
  { value: "beep", label: "电子 Chime 🔔 (Beep)" },
  { value: "cuckoo", label: "布谷鸟叫 🐦 (Cuckoo)" },
  { value: "meow", label: "猫咪叫 🐱 (Meow)" },
];

interface SettingsViewProps {
  config: CustomizationConfig;
  onChange: (newConfig: CustomizationConfig) => void;
  onBackupToCloud: (webdavConfig: WebDavConfig) => Promise<void>;
  onRestoreFromCloud: (webdavConfig: WebDavConfig) => Promise<void>;
  alertSoundType: AlertSoundType;
  setAlertSoundType: (type: AlertSoundType) => void;
  resetTasks: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onChange,
  onBackupToCloud,
  onRestoreFromCloud,
  alertSoundType,
  setAlertSoundType,
  resetTasks,
}) => {
  const [subTab, setSubTab] = useState<"personalization" | "ai" | "sunset" | "sync" | "system">("personalization");
  const [webdavUrl, setWebdavUrl] = useState(() => localStorage.getItem("qiyun_webdav_url") || "");
  const [webdavUser, setWebdavUser] = useState(() => localStorage.getItem("qiyun_webdav_user") || "");
  const [webdavPass, setWebdavPass] = useState(() => localStorage.getItem("qiyun_webdav_pass") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSaveWebDav = (url: string, user: string, pass: string) => {
    localStorage.setItem("qiyun_webdav_url", url);
    localStorage.setItem("qiyun_webdav_user", user);
    localStorage.setItem("qiyun_webdav_pass", pass);
  };

  const triggerToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const backup = async () => {
    if (!webdavUrl || !webdavUser) {
      triggerToast("请先填写服务器 URL 及账号", "error");
      return;
    }
    setIsLoading(true);
    try {
      handleSaveWebDav(webdavUrl, webdavUser, webdavPass);
      await onBackupToCloud({ url: webdavUrl, username: webdavUser, password: webdavPass });
      triggerToast("备份数据成功！☁️", "success");
    } catch (e: any) {
      console.error(e);
      triggerToast(`备份失败: ${e.message || e}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const restore = async () => {
    if (!webdavUrl || !webdavUser) {
      triggerToast("请先填写服务器 URL 及账号", "error");
      return;
    }
    if (!confirm("确认要从云端恢复备份吗？这会清空本地的所有待办及便签数据！")) {
      return;
    }
    setIsLoading(true);
    try {
      handleSaveWebDav(webdavUrl, webdavUser, webdavPass);
      await onRestoreFromCloud({ url: webdavUrl, username: webdavUser, password: webdavPass });
      triggerToast("恢复数据成功！✨", "success");
    } catch (e: any) {
      console.error(e);
      triggerToast(`恢复失败: ${e.message || e}`, "error");
    } finally {
      setIsLoading(false);
    }
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

  const quadrants = [
    { id: "urgent-important", label: "I. 重要且紧急" },
    { id: "important-not-urgent", label: "II. 重要不紧急" },
    { id: "urgent-not-important", label: "III. 紧急不重要" },
    { id: "not-urgent-not-important", label: "IV. 不重要不紧急" },
  ] as const;

  const bgClassMap = {
    white: "bg-white",
    grid: "bg-grid-pattern",
    lined: "bg-lined-pattern",
    watercolor: "bg-watercolor-pattern",
    doodle: "bg-doodle-pattern",
  };

  const q1Color = PLANNER_COLORS[config.qColors["urgent-important"]] || PLANNER_COLORS.rose;

  return (
    <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-5 gap-6 flex-grow select-none">
      {/* 左侧配置栏 */}
      <div className="lg:col-span-3 rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col gap-5 shadow-sm backdrop-blur-sm">
        {/* 二级菜单页签 */}
        <div className="flex flex-wrap gap-2 pb-3.5 border-b border-[#EFEBE4]">
          {[
            { id: "personalization", label: "🎨 个性装扮" },
            { id: "sunset", label: "🌅 日落护眼" },
            { id: "ai", label: "🤖 AI 助手" },
            { id: "sync", label: "☁️ 备份同步" },
            { id: "system", label: "⚙️ 系统与声音" },
          ].map((tabItem) => {
            const isSelected = subTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => setSubTab(tabItem.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#FCF2F0] text-[#A34E36] border border-[#F5DFDB] shadow-xs"
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
            {/* 1.1 四象限色彩 */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-[#8B6E3C] tracking-wide uppercase">
                🎨 四象限主色调搭配
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
                              className={`w-5.5 h-5.5 rounded-full ${colorConfig.dot} border border-slate-200 transition-all hover:scale-115 cursor-pointer relative ${
                                isSelected ? "ring-2 ring-slate-400 ring-offset-2 scale-110 shadow-xs" : ""
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
                📝 待办卡片背景纹理
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "white", label: "纯净白" },
                  { id: "grid", label: "格子本" },
                  { id: "lined", label: "横线本" },
                  { id: "watercolor", label: "水彩晕染" },
                  { id: "doodle", label: "简笔插画" },
                ].map((pattern) => {
                  const isSelected = config.cardBackground === pattern.id;
                  return (
                    <button
                      key={pattern.id}
                      onClick={() => handleStyleChange("cardBackground", pattern.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5]"
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
                📌 便签夹子固定样式
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "pin", label: "大头针" },
                  { id: "tape", label: "手账胶带" },
                  { id: "clip", label: "小木夹" },
                  { id: "heart", label: "爱心扣" },
                  { id: "smiley", label: "笑脸贴" },
                ].map((pin) => {
                  const isSelected = config.pinType === pin.id;
                  return (
                    <button
                      key={pin.id}
                      onClick={() => handleStyleChange("pinType", pin.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5]"
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
                  ✨ 界面毛玻璃质感
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "light", label: "清透" },
                    { id: "matte", label: "磨砂" },
                    { id: "solid", label: "纯白" },
                  ].map((glass) => {
                    const isSelected = (config.interfaceGlass || "matte") === glass.id;
                    return (
                      <button
                        key={glass.id}
                        onClick={() => handleStyleChange("interfaceGlass", glass.id as any)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                            : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5]"
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
                  ✍️ 界面系统字体
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "sans", label: "简约" },
                    { id: "rounded", label: "温馨" },
                    { id: "serif", label: "人文" },
                  ].map((font) => {
                    const isSelected = (config.fontFamily || "sans") === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => handleStyleChange("fontFamily", font.id as any)}
                        className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                            : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5]"
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
                🌅 全局流动水彩背景
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "oasis", label: "樱粉绿洲" },
                  { id: "aurora", label: "星河极光" },
                  { id: "sunny", label: "暖阳秋实" },
                  { id: "none", label: "无背景球" },
                ].map((wc) => {
                  const isSelected = (config.watercolorStyle || "oasis") === wc.id;
                  return (
                    <button
                      key={wc.id}
                      onClick={() => handleStyleChange("watercolorStyle", wc.id as any)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                        isSelected
                          ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                          : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5]"
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
                <p className="mt-1">开启后，系统在指定的夜间时间段会自动启用温暖的洋甘菊燕麦色壁纸，降低屏幕蓝光及玻璃刺眼光，保护你在晚间书写规划时的视力健康。</p>
              </div>
            </div>

            {/* 自动启用开关 */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#EFEBE4] bg-white/50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">启用自动日落护眼模式</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">根据指定的时间段自动应用温暖滤镜色调</span>
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
                  日落生效起始时间 (Start Hour)
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
                  次日日出结束时间 (End Hour)
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
                <span className="text-xs font-bold text-slate-700">落日护眼色调浓度调配 (Warmth Concentration)</span>
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
                <span>清透微暖 (10%)</span>
                <span>浓郁落日 (90%)</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. AI 助手设定面签 */}
        {subTab === "ai" && (
          <div className="space-y-4 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            {/* 提示信息 */}
            <div className="bg-[#FAF5ED] border border-[#EFE5D3] p-4 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#8B6E3C] mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>🤖 AI 智能优先级分类助手</strong>
                <p className="mt-1">配置云端大模型接口后，在添加新的日程待办时，AI 助手将自动帮您分析任务的轻重缓急，一键归档到最合适的四象限中。</p>
              </div>
            </div>

            {/* 启用自动分类开关 */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#EFEBE4] bg-white/50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">开启 AI 自动象限分类</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">添加任务时，智能推荐该待办归属于哪个象限</span>
              </div>
              <input
                type="checkbox"
                checked={config.aiAutoCategorize || false}
                onChange={(e) => handleStyleChange("aiAutoCategorize", e.target.checked)}
                className="w-4 h-4 accent-[#4D7C5D] cursor-pointer"
              />
            </div>

            {/* API Endpoint & Key */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  API Key / 大模型密钥
                </label>
                <input
                  type="password"
                  placeholder="sk-••••••••••••••••••••••••"
                  value={config.aiApiKey || ""}
                  onChange={(e) => handleStyleChange("aiApiKey", e.target.value)}
                  className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    API 中转端点 (Endpoint URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={config.aiEndpoint || ""}
                    onChange={(e) => handleStyleChange("aiEndpoint", e.target.value)}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    选择的 AI 模型 (Model)
                  </label>
                  <CustomSelect
                    value={config.aiModel || "gpt-4o"}
                    onChange={(val) => handleStyleChange("aiModel", val)}
                    options={AI_MODEL_OPTIONS}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Custom System Prompt */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                分类指导 System Prompt 提示词模板
              </label>
              <textarea
                value={
                  config.aiCustomPrompt ||
                  "你是一个日程管理专家。你的任务是根据任务标题和细节描述，推断并返回适合的艾森豪威尔象限类别。只能返回 [urgent-important | important-not-urgent | urgent-not-important | not-urgent-not-important] 之一。"
                }
                onChange={(e) => handleStyleChange("aiCustomPrompt", e.target.value)}
                placeholder="在此处自定义大模型分类决策指示词模板..."
                className="w-full bg-white border border-[#EFEBE4] px-3 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] h-20 resize-none custom-scrollbar"
              />
            </div>
          </div>
        )}

        {/* 4. 备份同步 WebDav 面签 */}
        {subTab === "sync" && (
          <div className="space-y-4 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            <div className="bg-[#FAF8F5] border border-[#EFEBE4] p-4 rounded-2xl flex items-start gap-3">
              <Cloud className="w-5 h-5 text-[#8B6E3C] mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                <strong>☁️ 多窗口与云端自动同步</strong>
                <p className="mt-1">配置坚果云、Nextcloud 等 WebDav 账户后，您可以一键上传加密存档，或在更换设备时随时拉取恢复。确保在进行恢复操作前保存好本地数据。</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  WebDav 服务器 URL
                </label>
                <input
                  type="text"
                  placeholder="https://dav.jianguoyun.com/dav/"
                  value={webdavUrl}
                  onChange={(e) => {
                    setWebdavUrl(e.target.value);
                    handleSaveWebDav(e.target.value, webdavUser, webdavPass);
                  }}
                  className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    WebDav 账号 / 注册邮箱
                  </label>
                  <input
                    type="text"
                    placeholder="your-email@example.com"
                    value={webdavUser}
                    onChange={(e) => {
                      setWebdavUser(e.target.value);
                      handleSaveWebDav(webdavUrl, e.target.value, webdavPass);
                    }}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    应用授权码 / 密码
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={webdavPass}
                    onChange={(e) => {
                      setWebdavPass(e.target.value);
                      handleSaveWebDav(webdavUrl, webdavUser, e.target.value);
                    }}
                    className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                  />
                </div>
              </div>
            </div>

            {/* 同步备份操作组 */}
            <div className="flex gap-3 pt-2 relative">
              <button
                onClick={backup}
                disabled={isLoading}
                className="flex-1 bg-[#4D7C5D] hover:bg-[#3F684C] disabled:bg-slate-300 text-white py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-102 transition-all shadow-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                备份数据至云端
              </button>
              <button
                onClick={restore}
                disabled={isLoading}
                className="flex-1 bg-[#8B6E3C] hover:bg-[#725A31] disabled:bg-slate-300 text-white py-2.5 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-102 transition-all shadow-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                从云端下载恢复
              </button>
            </div>
          </div>
        )}

        {/* 5. 系统设置与提示音面签 */}
        {subTab === "system" && (
          <div className="space-y-6 flex-grow overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
            {/* 系统声音选择 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">完成提示铃声 (Timer Sound)</h4>
              <p className="text-[10px] text-slate-400 font-medium">当番茄钟完成或任务倒计时截止时触发的物理音效铃声选择。</p>
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
                <span>高危维护区 (Factory Reset)</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-medium">重置本地所有日程安排、番茄钟分析日志、桌面便签以及系统配置参数（不可撤销）。</p>
              <button
                onClick={() => {
                  if (confirm("确认要抹除全部的本地数据及日志吗？此操作无法撤销！")) {
                    resetTasks();
                    triggerToast("已恢复出厂配置，全部数据已重置", "success");
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-[#A34E36] border border-[#F5DFDB] px-4 py-2.5 rounded-xl text-[10px] font-extrabold hover:scale-102 transition-all shadow-xs cursor-pointer block"
              >
                🗑️ 重置系统并抹除本地全部数据
              </button>
            </div>
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

      {/* 右侧实时预览面板 */}
      <div className="lg:col-span-2 rounded-2xl bg-[#F4EFEA]/40 border border-[#EFEBE4] p-5 flex flex-col items-center justify-center gap-5 shadow-sm backdrop-blur-sm relative min-h-[360px]">
        <span className="absolute top-3.5 left-4 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
          🔮 实时手账效果预览 (Live Preview)
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
                重要且紧急
              </span>
            </div>
            <Heart className="w-3.5 h-3.5 text-[#E8A0BF] hover:fill-[#E8A0BF] cursor-pointer" />
          </div>

          <div className="z-10 flex-grow flex flex-col justify-center my-1.5">
            <h4 className="text-xs font-bold text-[#2D323A] line-clamp-1 leading-snug">
              🌸 体验手账风个性自定义
            </h4>
            <p className="text-[9px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              这里是卡片的效果预览，现在切换上方的纹理背景，确认您最心仪的款式。
            </p>
          </div>

          <div className="z-10 flex items-center justify-between border-t border-[#FAF8F5] pt-2 text-[7.5px] text-slate-400 tracking-wider font-bold">
            <span>← 左划延后</span>
            <span>右划完成 →</span>
          </div>
        </div>

        {/* 拟物化便签预览 */}
        <div className="w-full max-w-[250px] rounded-2xl border border-[#EFE5D3] bg-[#FAF5ED] p-4 pt-5 shadow-md flex flex-col justify-between min-h-[110px] relative scale-95 -rotate-1 select-none transition-all">
          <StickyPin type={config.pinType} />

          <div className="text-[10px] font-semibold text-[#8B6E3C] leading-relaxed flex-grow">
            📌 这是一张拟物效果预览便签，支持 5 种木夹与胶带的大头针扣具款式切换。
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#EFE5D3]/60 mt-1 text-[8px] text-[#8B6E3C]/60 font-bold">
            <span>手账便签预览</span>
            <span>✓ 已固定</span>
          </div>
        </div>
      </div>
    </div>
  );
};
