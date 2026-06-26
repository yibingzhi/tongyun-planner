import React, { useState } from "react";
import { Sparkles, Heart, Cloud, RefreshCw, Upload, Download } from "lucide-react";
import type { CustomizationConfig, WebDavConfig } from "../types";
import { PLANNER_COLORS } from "../constants";
import { StickyPin } from "./StickyPin";

interface PersonalizationViewProps {
  config: CustomizationConfig;
  onChange: (newConfig: CustomizationConfig) => void;
  onBackupToCloud: (webdavConfig: WebDavConfig) => Promise<void>;
  onRestoreFromCloud: (webdavConfig: WebDavConfig) => Promise<void>;
}

export const PersonalizationView: React.FC<PersonalizationViewProps> = ({
  config,
  onChange,
  onBackupToCloud,
  onRestoreFromCloud,
}) => {
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
  const handleColorChange = (quadId: keyof CustomizationConfig["qColors"], colorKey: string) => {
    const newConfig = {
      ...config,
      qColors: {
        ...config.qColors,
        [quadId]: colorKey,
      },
    };
    onChange(newConfig);
  };

  const handleStyleChange = <K extends keyof Omit<CustomizationConfig, "qColors">>(
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

  // Background map for card previews
  const bgClassMap = {
    white: "bg-white",
    grid: "bg-grid-pattern",
    lined: "bg-lined-pattern",
    watercolor: "bg-watercolor-pattern",
    doodle: "bg-doodle-pattern",
  };

  // Preview Q1 ColorConfig
  const q1Color = PLANNER_COLORS[config.qColors["urgent-important"]] || PLANNER_COLORS.rose;

  return (
    <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-5 gap-6 flex-grow select-none">
      {/* 左侧选择面板 */}
      <div className="lg:col-span-3 rounded-2xl bg-white/70 border border-[#EFEBE4] p-5 flex flex-col gap-6 shadow-sm backdrop-blur-sm">
        {/* 1. 四象限色彩配比 */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase border-b border-[#EFEBE4] pb-2">
            🎨 四象限主色调搭配
          </h3>
          <div className="space-y-3.5">
            {quadrants.map((quad) => {
              const selectedColor = config.qColors[quad.id];
              return (
                <div key={quad.id} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-slate-700 min-w-[90px]">
                    {quad.label}
                  </span>
                  <div className="flex gap-2.5">
                    {Object.entries(PLANNER_COLORS).map(([colorKey, colorConfig]) => {
                      const isSelected = selectedColor === colorKey;
                      return (
                        <button
                          key={colorKey}
                          onClick={() => handleColorChange(quad.id, colorKey)}
                          className={`w-5.5 h-5.5 rounded-full ${colorConfig.dot} border border-slate-200 transition-all hover:scale-115 cursor-pointer relative ${
                            isSelected
                              ? "ring-2 ring-slate-400 ring-offset-2 scale-110 shadow-xs"
                              : ""
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

        {/* 2. 卡片背景纹理 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase border-b border-[#EFEBE4] pb-2">
            📝 待办卡片背景纹理
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {[
              { id: "white", label: "纯净白" },
              { id: "grid", label: "手账格子" },
              { id: "lined", label: "单向横线" },
              { id: "watercolor", label: "水彩晕染" },
              { id: "doodle", label: "插画简笔" },
            ].map((pattern) => {
              const isSelected = config.cardBackground === pattern.id;
              return (
                <button
                  key={pattern.id}
                  onClick={() => handleStyleChange("cardBackground", pattern.id as any)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                      : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700"
                  }`}
                >
                  {pattern.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 便签大头针固定样式 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase border-b border-[#EFEBE4] pb-2">
            📌 便签夹子固定样式
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
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
                      : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700"
                  }`}
                >
                  {pin.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 界面毛玻璃质感 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase border-b border-[#EFEBE4] pb-2">
            ✨ 界面毛玻璃质感
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: "light", label: "清透微澜" },
              { id: "matte", label: "纸质磨砂" },
              { id: "solid", label: "纯白极简" },
            ].map((glass) => {
              const isSelected = (config.interfaceGlass || "matte") === glass.id;
              return (
                <button
                  key={glass.id}
                  onClick={() => handleStyleChange("interfaceGlass", glass.id as any)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                      : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700"
                  }`}
                >
                  {glass.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. 全局流光水彩配色 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase border-b border-[#EFEBE4] pb-2">
            🌅 全局流光水彩配色
          </h3>
          <div className="grid grid-cols-4 gap-2.5">
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
                      : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700"
                  }`}
                >
                  {wc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. 界面系统字体样式 */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase border-b border-[#EFEBE4] pb-2">
            ✍️ 界面系统字体样式
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: "sans", label: "现代简约" },
              { id: "rounded", label: "温馨圆润" },
              { id: "serif", label: "人文衬线" },
            ].map((font) => {
              const isSelected = (config.fontFamily || "sans") === font.id;
              return (
                <button
                  key={font.id}
                  onClick={() => handleStyleChange("fontFamily", font.id as any)}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36] shadow-xs"
                      : "bg-white border-[#EFEBE4] text-slate-500 hover:bg-[#FAF8F5] hover:text-slate-700"
                  }`}
                >
                  {font.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 7. WebDav 云端备份与同步 */}
        <div className="space-y-3 pt-4 border-t border-dashed border-[#EFEBE4] relative">
          <h3 className="text-xs font-bold text-[#8B6E3C] tracking-wide uppercase flex items-center gap-1.5 pb-1">
            <Cloud className="w-4 h-4 text-[#8B6E3C]" />
            <span>☁️ 云端 WebDav 备份与恢复</span>
          </h3>
          <p className="text-[10px] text-slate-500">
            配置您的坚果云、Nextcloud 等 WebDav 服务器，一键备份数据或拉取云端存档。
          </p>
          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                  账号 / 邮箱
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
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                  密码 / 应用授权码
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

            {/* 操作按钮组 */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={backup}
                disabled={isLoading}
                className="flex-1 bg-[#4D7C5D] hover:bg-[#3F684C] disabled:bg-slate-300 text-white py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-102 transition-all shadow-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                备份到云端
              </button>
              <button
                onClick={restore}
                disabled={isLoading}
                className="flex-1 bg-[#8B6E3C] hover:bg-[#725A31] disabled:bg-slate-300 text-white py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer hover:scale-102 transition-all shadow-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                从云端恢复
              </button>
            </div>
            
            {/* Toast 提醒气泡 */}
            {toast && (
              <div
                className={`absolute bottom-16 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-xl border text-[10px] font-extrabold shadow-md z-50 flex items-center gap-1.5 animate-fade-in-up ${
                  toast.type === "success"
                    ? "bg-[#F0F5F1] border-[#DEEAE2] text-[#4D7C5D]"
                    : "bg-[#FCF2F0] border-[#F5DFDB] text-[#A34E36]"
                }`}
              >
                {toast.type === "success" ? "✓" : "⚠️"} {toast.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右侧实时预览面板 */}
      <div className="lg:col-span-2 rounded-2xl bg-[#F4EFEA]/40 border border-[#EFEBE4] p-5 flex flex-col items-center justify-center gap-6 shadow-sm backdrop-blur-sm relative">
        <span className="absolute top-3 left-4 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
          🔮 实时装扮效果预览
        </span>

        {/* 待办卡片效果预览 */}
        <div className="w-full max-w-[260px] h-[175px] rounded-2xl p-4 flex flex-col justify-between shadow-md border border-[#EFEBE4] relative overflow-hidden bg-white select-none scale-95 transition-all">
          {/* Apply selected card pattern */}
          <div className={`absolute inset-0 z-0 ${bgClassMap[config.cardBackground]}`} />

          {/* Doodle watermark */}
          {config.cardBackground === "doodle" && (
            <div className="absolute right-4 bottom-12 opacity-10 pointer-events-none text-slate-700">
              <Sparkles className="w-10 h-10" />
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
              🌸 体验手账风自定义排版
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
        <div className="w-full max-w-[260px] rounded-2xl border border-[#EFE5D3] bg-[#FAF5ED] p-4 pt-5 shadow-md flex flex-col justify-between min-h-[120px] relative scale-95 -rotate-1 select-none transition-all">
          {/* Pinned by the selected pin */}
          <StickyPin type={config.pinType} />

          <div className="text-[10px] font-semibold text-[#8B6E3C] leading-relaxed flex-grow">
            📌 这是一张拟物效果预览便签，支持 5 种精美的固定器样式切换。
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
