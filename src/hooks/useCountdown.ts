import { useState, useCallback } from "react";
import type { CountdownEvent } from "../types";
import { createId } from "../utils/id";
import { safeJsonParse } from "../utils/json";

export function useCountdown() {
  // lazy initializer 直接从 localStorage 恢复，避免首次 render 时被空数组覆盖
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>(() =>
    safeJsonParse<CountdownEvent[]>(localStorage.getItem("qiyun_countdowns"), [])
  );

  const saveCountdowns = useCallback((updated: CountdownEvent[]) => {
    localStorage.setItem("qiyun_countdowns", JSON.stringify(updated));
  }, []);

  const handleAddCountdown = useCallback((event: { title: string; targetDate: string; emoji?: string; color?: string }) => {
    const newEvent: CountdownEvent = {
      id: createId("countdown"),
      title: event.title,
      targetDate: event.targetDate,
      emoji: event.emoji || "🎯",
      color: event.color,
    };
    setCountdowns((prev) => {
      const updated = [...prev, newEvent];
      saveCountdowns(updated);
      return updated;
    });
  }, [saveCountdowns]);

  const handleDeleteCountdown = useCallback((id: string) => {
    setCountdowns((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveCountdowns(updated);
      return updated;
    });
  }, [saveCountdowns]);

  return {
    countdowns,
    setCountdowns,
    handleAddCountdown,
    handleDeleteCountdown,
  };
}
