import { useState, useCallback, useRef } from "react";
import { load } from "@tauri-apps/plugin-store";
import type { Task, SubTask, RepeatType } from "../types";
import { useSync } from "./useSync";
import { createId } from "../utils/id";
import { addLocalDays, addLocalMonths, getLocalDateString } from "../utils/date";
import { getNextRRuleDate } from "../utils/rrule";

function createInitialTasks(): Task[] {
  const today = getLocalDateString();
  return [
    { id: "1", title: "设计待办清单配色与主题风格", description: "选用暖色奶茶背景、抹茶绿和蜜桃红,构建温馨清爽的日程规划风格。", category: "urgent-important", dueDate: today },
    { id: "2", title: "体验白噪音与番茄工作法", description: "在侧边栏开启白噪音,配合25分钟番茄时钟,体验极致专注手感。", category: "urgent-important", dueDate: today },
    { id: "3", title: "整理桌面与给绿植浇水", description: "整理房间和摆件,让生活空间与心情一起回归清爽自然。", category: "important-not-urgent", dueDate: today },
    { id: "4", title: "购买并补给浅烘咖啡豆", description: "生活日常补给,准备片刻的手冲咖啡度过下午。", category: "urgent-not-important", dueDate: today },
  ];
}

const INITIAL_TASKS = createInitialTasks();

function getNextDueDate(currentDue: string | undefined, repeat: RepeatType): string | undefined {
  if (!repeat || repeat === "none") return undefined;
  if (repeat === "daily") return addLocalDays(currentDue, 1);
  if (repeat === "weekly") return addLocalDays(currentDue, 7);
  if (repeat === "monthly") return addLocalMonths(currentDue, 1);
  return getNextRRuleDate(currentDue!, repeat);
}

export function useTasks() {
  const { syncState } = useSync();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const storeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null);

  // ============ 统一持久化(debounce + latest-wins)============
  // 之前 saveTasks / saveCompleted 都是每次调用就同步写 localStorage + await store.save()
  // 快速操作下(complete 同时改 tasks/completedTasks)两个 async store.save 会竞争,
  // 且 App.tsx 顶层还有 6 个"状态一变就写 localStorage"的 effect,写 3 次 IO。
  // 现在:localStorage 立刻写(便于 FloatingNoteWindow 读),tauri-store 用 250ms debounce
  // 合并多次改动为一次落盘;并保留最新值防止过期覆盖。
  const pendingTasksRef = useRef<Task[] | null>(null);
  const pendingCompletedRef = useRef<Task[] | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const flushingRef = useRef(false);

  const flushToStore = useCallback(async () => {
    if (!storeRef.current) return;
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      // 循环刷:落盘期间又来了新的写请求就再刷一次,直到没有 pending
      while (pendingTasksRef.current !== null || pendingCompletedRef.current !== null) {
        const t = pendingTasksRef.current;
        const c = pendingCompletedRef.current;
        pendingTasksRef.current = null;
        pendingCompletedRef.current = null;
        if (t !== null) await storeRef.current!.set("tasks", t);
        if (c !== null) await storeRef.current!.set("completedTasks", c);
        await storeRef.current!.set("last_updated", Date.now());
        await storeRef.current!.save();
      }
    } catch (e) {
      console.error("保存到 tauri-store 失败", e);
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushToStore();
    }, 250);
  }, [flushToStore]);

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    try {
      localStorage.setItem("aero_todos", JSON.stringify(updatedTasks));
      localStorage.setItem("tongyun_last_updated", String(Date.now()));
      pendingTasksRef.current = updatedTasks;
      scheduleFlush();
    } catch (e) {
      console.error("保存任务失败", e);
    }
  }, [scheduleFlush]);

  const saveCompleted = useCallback(async (updatedCompleted: Task[]) => {
    try {
      localStorage.setItem("aero_completed_todos", JSON.stringify(updatedCompleted));
      localStorage.setItem("tongyun_last_updated", String(Date.now()));
      pendingCompletedRef.current = updatedCompleted;
      scheduleFlush();
    } catch (e) {
      console.error("保存已完成任务失败", e);
    }
  }, [scheduleFlush]);

  const totalCount = tasks.length + completedTasks.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedTasks.length / totalCount) * 100);

  const handleComplete = useCallback((id: string, shouldSync: boolean = true) => {
    let completedItem: Task | undefined;
    let hasPendingDeps = false;
    setTasks((prev) => {
      completedItem = prev.find((t) => t.id === id);
      if (!completedItem) return prev;

      // Check dependencies
      if (completedItem.dependsOn && completedItem.dependsOn.length > 0) {
        const allCompleted = completedItem.dependsOn.every(depId =>
          !prev.find(t => t.id === depId) // If not in active tasks, it's completed or deleted
        );
        if (!allCompleted) {
          hasPendingDeps = true;
          return prev;
        }
      }

      let updated = prev.filter((t) => t.id !== id);

      if (completedItem.repeat && completedItem.repeat !== "none") {
        const nextDue = getNextDueDate(completedItem.dueDate, completedItem.repeat);
        const recurringTask: Task = {
          ...completedItem,
          id: createId("task"),
          dueDate: nextDue,
        };
        updated = [recurringTask, ...updated];
      }

      saveTasks(updated);
      return updated;
    });

    if (hasPendingDeps) return; // Don't complete - dependencies not met

    if (completedItem) {
      setCompletedTasks((cPrev) => {
        const cUpdated = [completedItem!, ...cPrev.filter((t) => t.id !== id)];
        saveCompleted(cUpdated);
        return cUpdated;
      });
    }

    if (shouldSync) syncState(id, "complete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleUndoComplete = useCallback((id: string, shouldSync: boolean = true) => {
    let restoredItem: Task | undefined;
    setCompletedTasks((cPrev) => {
      restoredItem = cPrev.find((t) => t.id === id);
      const cUpdated = cPrev.filter((t) => t.id !== id);
      saveCompleted(cUpdated);
      return cUpdated;
    });

    if (restoredItem) {
      setTasks((prev) => {
        const updated = [restoredItem!, ...prev];
        saveTasks(updated);
        return updated;
      });
    }

    if (shouldSync) syncState(id, "undo_complete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleToggleFavorite = useCallback((id: string) => {
    // 直接在 setState updater 内部计算 nextFav,取到新值后一次性广播,不再用 setTimeout(0)
    // 避免"点击-广播-落盘"三者之间的竞态
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const nextFav = !task.isFavorite;
      const updated = prev.map((t) => (t.id === id ? { ...t, isFavorite: nextFav } : t));
      saveTasks(updated);
      // 广播放到微任务,避免在 setState updater 内直接触发 async invoke
      queueMicrotask(() => syncState(id, "favorite_sync", nextFav ? "true" : "false"));
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleTogglePin = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const nextPin = !task.isPinned;
      const updated = prev.map((t) => (t.id === id ? { ...t, isPinned: nextPin } : t));
      saveTasks(updated);
      queueMicrotask(() => syncState(id, "pin_sync", nextPin ? "true" : "false"));
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleDeleteTask = useCallback((id: string, shouldSync: boolean = true) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTasks(updated);
      return updated;
    });
    setCompletedTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveCompleted(updated);
      return updated;
    });
    if (shouldSync) syncState(id, "delete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleTaskClick = useCallback((task: Task) => {
    setDetailTaskId(task.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailTaskId(null);
  }, []);

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const subtasks = (task.subtasks || []).map((s) =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      const nextTask = { ...task, subtasks };
      const updated = prev.map((t) => (t.id === taskId ? nextTask : t));
      saveTasks(updated);
      // 子任务变化不改文本字段:未变字段传 undefined,避免误清空
      queueMicrotask(() => syncState(taskId, "update", nextTask.title, nextTask.description, nextTask.category, nextTask.notes, nextTask.dueDate, nextTask.dueTime));
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleAddSubtask = useCallback((taskId: string, title: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;
      const newSub: SubTask = { id: createId("subtask"), title, completed: false };
      const nextTask = { ...task, subtasks: [...(task.subtasks || []), newSub] };
      const updated = prev.map((t) => (t.id === taskId ? nextTask : t));
      saveTasks(updated);
      queueMicrotask(() => syncState(taskId, "update", nextTask.title, nextTask.description, nextTask.category, nextTask.notes, nextTask.dueDate, nextTask.dueTime));
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleSnooze = useCallback((id: string, shouldSync: boolean = true) => {
    setTasks((prev) => {
      const item = prev.find((t) => t.id === id);
      if (!item) return prev;
      // 显式:先从原位置移除,再追加到末尾
      const rest = prev.filter((t) => t.id !== id);
      const next = [...rest, item];
      saveTasks(next);
      return next;
    });
    if (shouldSync) syncState(id, "snooze");
  }, [saveTasks, syncState]);

    const handleAddTask = useCallback(async (taskData: {
    title: string;
    description: string;
    notes: string;
    category: Task["category"];
    dueDate: string;
    dueTime?: string;
    isExplicit?: boolean;
    repeat?: RepeatType;
    tags?: string[];
  }) => {
    const { title, description, notes, category, dueDate, dueTime, repeat, tags } = taskData;
    const taskId = createId("task");
    const initialCategory = category;

    const newTask: Task = {
      id: taskId,
      title,
      description: description || undefined,
      notes: notes || undefined,
      category: initialCategory,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      repeat: repeat || undefined,
      tags: tags || undefined,
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });

    syncState(
      newTask.id,
      "add",
      newTask.title,
      newTask.description || "",
      newTask.category,
      newTask.notes || "",
      newTask.dueDate,
      newTask.dueTime
    );

    return { taskId, newTask };
  }, [saveTasks, syncState]);

  const handleEditTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const nextTask = { ...task, ...updates };

      // 广播用 queueMicrotask,不再 setTimeout(0):
      // 好处是同一 tick 内先落盘再广播,顺序更可预测,避免 favorite+update 快速连续时错乱
      queueMicrotask(() => {
        syncState(
          id,
          "update",
          nextTask.title,
          nextTask.description,
          nextTask.category,
          nextTask.notes,
          nextTask.dueDate,
          nextTask.dueTime
        );
      });

      const updated = prev.map((t) => (t.id === id ? nextTask : t));
      saveTasks(updated);
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleSaveNotes = useCallback((id: string, notes: string) => {
    handleEditTask(id, { notes: notes || undefined });
    setExpandedNoteId(null);
  }, [handleEditTask]);

  const handleUpdateTags = useCallback((id: string, tags: string[]) => {
    handleEditTask(id, { tags: tags.length > 0 ? tags : undefined });
  }, [handleEditTask]);

  const resetTasks = useCallback(() => {
    const freshTasks = createInitialTasks();
    setTasks(freshTasks);
    setCompletedTasks([]);
    saveTasks(freshTasks);
    saveCompleted([]);
    syncState("reset", "reset");
  }, [saveTasks, saveCompleted, syncState]);

  const handleClearCompleted = useCallback(() => {
    setCompletedTasks([]);
    saveCompleted([]);
    syncState("clear_completed", "clear_completed");
  }, [saveCompleted, syncState]);

  return {
    tasks,
    setTasks,
    completedTasks,
    setCompletedTasks,
    expandedNoteId,
    setExpandedNoteId,
    editingNotes,
    setEditingNotes,
    detailTaskId,
    setDetailTaskId,
    storeRef,
    saveTasks,
    saveCompleted,
    progressPercentage,
    handleComplete,
    handleUndoComplete,
    handleToggleFavorite,
    handleTogglePin,
    handleDeleteTask,
    handleTaskClick,
    handleCloseDetail,
    handleToggleSubtask,
    handleAddSubtask,
    handleSnooze,
    handleAddTask,
    handleEditTask,
    handleSaveNotes,
    handleUpdateTags,
    resetTasks,
    handleClearCompleted,
    INITIAL_TASKS,
  };
}
