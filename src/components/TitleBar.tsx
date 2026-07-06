import React from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { BookOpen, Minus, Maximize2, X } from "lucide-react";
import { useTranslation } from "../i18n/LanguageContext";

export const TitleBar: React.FC = () => {
  const { t } = useTranslation(); const tb = t.titleBar;
  const handleMinimize = () => getCurrentWebviewWindow().minimize();
  const handleToggleMaximize = () => getCurrentWebviewWindow().toggleMaximize();
  const handleClose = () => getCurrentWebviewWindow().hide();

  return (
    <div
      data-tauri-drag-region
      className="w-full h-9 flex items-center justify-between px-4 bg-[#F4EFEA]/80 border-b border-[#EFEBE4] backdrop-blur-xl z-20 relative flex-shrink-0 cursor-move select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#C4D7B2] to-[#B2C8DF] flex items-center justify-center">
          <BookOpen className="w-3 h-3 text-[#4D7C5D]" />
        </div>
        <span data-tauri-drag-region className="text-[11px] font-bold text-[#2D323A] tracking-wide">
          TongYun Planner
        </span>
        <span data-tauri-drag-region className="text-[9px] text-[#8B6E3C] font-extrabold tracking-wider uppercase">
          {tb.subtitle}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-7 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-[#EFEBE4] hover:text-slate-600 transition-all cursor-pointer"
          title={tb.minimize}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleToggleMaximize}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-7 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-[#EFEBE4] hover:text-slate-600 transition-all cursor-pointer"
          title={tb.maximize}
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-7 h-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-[#FCF2F0] hover:text-[#A34E36] transition-all cursor-pointer"
          title={tb.close}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
