import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export function useSync() {
  const syncState = useCallback(async (
    taskId: string,
    action: string,
    title: string = "",
    description: string = "",
    category: string = "",
    notes: string = "",
    dueDate: string = "",
    dueTime: string = ""
  ) => {
    try {
      let sourceWindow = "browser";
      try {
        sourceWindow = getCurrentWebviewWindow().label;
      } catch {
        // Browser-only development mode has no Tauri webview label.
      }

      await invoke("sync_todo_state", {
        payload: {
          task_id: taskId,
          action,
          source_window: sourceWindow,
          title,
          description,
          notes,
          category,
          due_date: dueDate || null,
          due_time: dueTime || null,
          timestamp: Date.now(),
        },
      });
    } catch (e) {
      console.error("同步窗口状态失败", e);
    }
  }, []);

  return { syncState };
}
