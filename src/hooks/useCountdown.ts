import { useState, useCallback } from "react";
import type { CountdownEvent } from "../types";
import { createId } from "../utils/id";

export function useCountdown() {
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);

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
