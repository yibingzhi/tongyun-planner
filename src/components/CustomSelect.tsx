import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { SelectOption } from "../constants";

interface CustomSelectProps<TValue extends string = string> {
  value: TValue;
  onChange: (value: TValue) => void;
  options: SelectOption<TValue>[];
  className?: string;
  dropdownAlign?: "left" | "right" | "top";
}

export function CustomSelect<TValue extends string = string>({
  value,
  onChange,
  options,
  className = "",
  dropdownAlign = "left",
}: CustomSelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className="w-full flex items-center justify-between bg-white border border-[#EFEBE4] hover:border-[#4D7C5D] px-3.5 py-2.5 rounded-xl text-xs text-[#2D323A] transition-all focus:outline-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      >
        <span className="truncate font-semibold">{selectedOption?.label}</span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-full min-w-[170px] bg-white border border-[#EFEBE4] rounded-xl shadow-[0_10px_25px_-5px_rgba(154,142,128,0.18)] py-1.5 text-xs text-slate-700 overflow-hidden ${
            dropdownAlign === "right" ? "right-0" : "left-0"
          } ${dropdownAlign === "top" ? "bottom-full mb-1.5 mt-0" : "mt-1.5"}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#FAF8F5] hover:text-[#2D323A] text-left transition-colors cursor-pointer ${
                  isSelected ? "bg-[#FCF2F0]/60 text-[#A34E36] font-bold" : "font-medium"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#A34E36] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
