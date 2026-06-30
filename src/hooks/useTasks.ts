import { useState, useCallback, useRef } from "react";
import { load } from "@tauri-apps/plugin-store";
import type { Task, SubTask, RepeatType } from "../types";
import { useSync } from "./useSync";
import { createId } from "../utils/id";
import { addLocalDays, addLocalMonths, getLocalDateString } from "../utils/date";

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "设计待办清单配色与主题风格",
    description: "选用暖色奶茶背景、抹茶绿和蜜桃红，构建温馨清爽的日程规划风格。",
    category: "urgent-important",
    dueDate: getLocalDateString(),
  },
  {
    id: "2",
    title: "体验白噪音与番茄工作法",
    description: "在侧边栏开启白噪音，配合25分钟番茄时钟，体验极致专注手感。",
    category: "urgent-important",
    dueDate: getLocalDateString(),
  },
  {
    id: "3",
    title: "整理桌面与给绿植浇水",
    description: "整理房间和摆件，让生活空间与心情一起回归清爽自然。",
    category: "important-not-urgent",
    dueDate: getLocalDateString(),
  },
  {
    id: "4",
    title: "购买并补给浅烘咖啡豆",
    description: "生活日常补给，准备片刻的手冲咖啡度过下午。",
    category: "urgent-not-important",
    dueDate: getLocalDateString(),
  },
];

function getNextDueDate(currentDue: string | undefined, repeat: RepeatType): string | undefined {
  if (repeat === "daily") return addLocalDays(currentDue, 1);
  if (repeat === "weekly") return addLocalDays(currentDue, 7);
  if (repeat === "monthly") return addLocalMonths(currentDue, 1);
  return undefined;
}

export function useTasks() {
  const { syncState } = useSync();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const storeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null);

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    if (storeRef.current) {
      await storeRef.current.set("tasks", updatedTasks);
      await storeRef.current.save();
    }
  }, []);

  const saveCompleted = useCallback(async (updatedCompleted: Task[]) => {
    if (storeRef.current) {
      await storeRef.current.set("completedTasks", updatedCompleted);
      await storeRef.current.save();
    }
  }, []);

  const totalCount = tasks.length + completedTasks.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedTasks.length / totalCount) * 100);

  const handleComplete = useCallback((id: string, shouldSync: boolean = true) => {
    setTasks((prev) => {
      const completedItem = prev.find((t) => t.id === id);
      let updated = prev.filter((t) => t.id !== id);

      if (completedItem) {
        if (completedItem.repeat && completedItem.repeat !== "none") {
          const nextDue = getNextDueDate(completedItem.dueDate, completedItem.repeat);
          const recurringTask: Task = {
            ...completedItem,
            id: createId("task"),
            dueDate: nextDue,
          };
          updated = [recurringTask, ...updated];
        }

        setCompletedTasks((cPrev) => {
          const cUpdated = [completedItem, ...cPrev.filter((t) => t.id !== id)];
          saveCompleted(cUpdated);
          return cUpdated;
        });
      }

      saveTasks(updated);
      return updated;
    });
    if (shouldSync) syncState(id, "complete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleUndoComplete = useCallback((id: string, shouldSync: boolean = true) => {
    setCompletedTasks((cPrev) => {
      const restoredItem = cPrev.find((t) => t.id === id);
      const cUpdated = cPrev.filter((t) => t.id !== id);
      saveCompleted(cUpdated);

      if (restoredItem) {
        setTasks((prev) => {
          const updated = [restoredItem, ...prev];
          saveTasks(updated);
          return updated;
        });
      }
      return cUpdated;
    });
    if (shouldSync) syncState(id, "undo_complete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleToggleFavorite = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const nextFav = !task.isFavorite;
      setTimeout(() => {
        syncState(id, "favorite_sync", nextFav ? "true" : "false");
      }, 0);
      const updated = prev.map((t) => (t.id === id ? { ...t, isFavorite: nextFav } : t));
      saveTasks(updated);
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleTogglePin = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      const nextPin = !task.isPinned;
      setTimeout(() => {
        syncState(id, "pin_sync", nextPin ? "true" : "false");
      }, 0);
      const updated = prev.map((t) => (t.id === id ? { ...t, isPinned: nextPin } : t));
      saveTasks(updated);
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
      syncState(taskId, "update", nextTask.title, nextTask.description, nextTask.category, nextTask.notes, nextTask.dueDate, nextTask.dueTime);
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
      syncState(taskId, "update", nextTask.title, nextTask.description, nextTask.category, nextTask.notes, nextTask.dueDate, nextTask.dueTime);
      return updated;
    });
  }, [saveTasks, syncState]);

  const handleSnooze = useCallback((id: string, shouldSync: boolean = true) => {
    setTasks((prev) => {
      const updated = [...prev];
      const item = updated.find((t) => t.id === id);
      if (item) {
        const filtered = updated.filter((t) => t.id !== id);
        filtered.push(item);
        saveTasks(filtered);
        return filtered;
      }
      return prev;
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

      setTimeout(() => {
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
      }, 0);

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
    setTasks(INITIAL_TASKS);
    setCompletedTasks([]);
    saveTasks(INITIAL_TASKS);
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
