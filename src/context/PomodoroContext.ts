import { createContext, useContext } from "react";
import { usePomodoro } from "../hooks/usePomodoro";

export type PomodoroContextValue = ReturnType<typeof usePomodoro>;

export const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoroContext(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoroContext must be used within a PomodoroContext.Provider");
  }
  return ctx;
}
