import { useEffect, useState, useRef, useCallback } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import type { Task, AppTab, WebDavConfig } from "./types";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { MatrixView } from "./components/MatrixView";
import { ListView } from "./components/ListView";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { CalendarView } from "./components/CalendarView";
import { StickyNotesView } from "./components/StickyNotesView";
import { CelebrationOverlay } from "./components/CelebrationOverlay";
import { AnalyticsView } from "./components/AnalyticsView";
import { CompletedView } from "./components/CompletedView";
import { WidgetWindow } from "./components/WidgetWindow";
import { SettingsView } from "./components/SettingsView";
import { FloatingNoteWindow } from "./components/FloatingNoteWindow";
import { CountdownView } from "./components/CountdownView";
import { audioEngine } from "./utils/audioEngine";
import { Sparkles } from "lucide-react";
import { LanguageProvider, useTranslation } from "./i18n/LanguageContext";
import { useTasks } from "./hooks/useTasks";
import { usePomodoro } from "./hooks/usePomodoro";
import { useStickyNotes } from "./hooks/useStickyNotes";
import { useCountdown } from "./hooks/useCountdown";
import { useCustomization } from "./hooks/useCustomization";
import { useAI } from "./hooks/useAI";
import { useWidget } from "./hooks/useWidget";
import { useSync } from "./hooks/useSync";

function AppInner() {
  const { t, setLocale, locale } = useTranslation();
  const tasksHook = useTasks();
  const pomodoroHook = usePomodoro();
  const notesHook = useStickyNotes();
  const countdownHook = useCountdown();
  const customizationHook = useCustomization();
  const widgetHook = useWidget();
  const { syncState } = useSync();
  const aiHook = useAI(customizationHook.customizationConfig);

  const [windowLabel, setWindowLabel] = useState<string>("main");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("aero_last_backup_time");
    return saved ? parseInt(saved, 10) : null;
  });
  const lastSyncVersionRef = useRef<number>(
    parseInt(localStorage.getItem("qiyun_sync_version") || "0", 10)
  );
  const isFirstLoad = useRef(true);
  const isRestoringRef = useRef(false);

  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>("home");

  // ============ Store Initialization ============
  useEffect(() => {
    let label = "main";
    try {
      label = getCurrentWebviewWindow().label;
    } catch (e) {}
    setWindowLabel(label);
    if (label !== "main") {
      document.documentElement.classList.add("transparent-window");
    }

    if (typeof Notification !== "undefined" && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const savedCustomization = localStorage.getItem("aero_customization_config");
    if (savedCustomization) {
      try {
        const parsed = JSON.parse(savedCustomization);
        customizationHook.setCustomizationConfig(parsed);
        if (parsed.locale) setLocale(parsed.locale);
      } catch (e) {}
    }

    const savedSound = localStorage.getItem("aero_alert_sound_type");
    if (savedSound) pomodoroHook.setAlertSoundType(savedSound as any);

    const savedFocus = localStorage.getItem("pomodoro_focus_duration");
    const savedBreak = localStorage.getItem("pomodoro_break_duration");
    if (savedFocus) {
      const f = parseInt(savedFocus, 10);
      pomodoroHook.setFocusDuration(f);
      pomodoroHook.setPomodoroTimeLeft(f * 60);
    }
    if (savedBreak) pomodoroHook.setBreakDuration(parseInt(savedBreak, 10));

    const initStore = async () => {
      try {
        const store = await load("qiyun_list_data.json", { defaults: {}, autoSave: false });
        tasksHook.storeRef.current = store;

        const localLogs = localStorage.getItem("aero_pomodoro_logs");
        if (localLogs) {
          pomodoroHook.setPomodoroLogs(JSON.parse(localLogs));
        } else {
          const seededLogs = [];
          const nowMs = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          for (let i = 0; i < 30; i++) {
            if (Math.random() > 0.4) {
              const sessionsCount = Math.floor(Math.random() * 3) + 1;
              for (let s = 0; s < sessionsCount; s++) {
                seededLogs.push({
                  id: `mock-log-${i}-${s}`,
                  timestamp: nowMs - i * oneDay - Math.random() * 8 * 60 * 60 * 1000,
                  duration: 25,
                });
              }
            }
          }
          pomodoroHook.setPomodoroLogs(seededLogs);
          localStorage.setItem("aero_pomodoro_logs", JSON.stringify(seededLogs));
        }

        const localNotes = localStorage.getItem("aero_sticky_notes");
        if (localNotes) {
          notesHook.setStickyNotes(JSON.parse(localNotes));
        } else {
          const defaultNotes = [
            { id: "note-1", text: "使用技巧：双窗口联动与幽灵锁定模式\n- 开启幽灵锁定时，挂件近乎透明，鼠标移上去就能显现小锁，点击即可解锁。\n- 侧边栏的白噪音是完全离线纯物理波形合成，不需要消耗网络流量。", color: "tea", rotate: -1 },
            { id: "note-2", text: "健康习惯：多喝水、放松眼睛、深呼吸\n- 每隔 45 分钟起来喝杯水\n- 视线离开屏幕看绿植 20 秒\n- 闭眼做 5 次深呼吸", color: "mint", rotate: 2 },
            { id: "note-3", text: "手账购物备忘：豆子、水壶、纸胶带\n- 冰滴咖啡豆 (浅烘焙) 1 包\n- 便携保温小水壶 1 个\n- 记录手账专用的纸胶带 1 盒", color: "rose", rotate: -2 },
          ];
          notesHook.setStickyNotes(defaultNotes);
          localStorage.setItem("aero_sticky_notes", JSON.stringify(defaultNotes));
        }

        const localCountdowns = localStorage.getItem("qiyun_countdowns");
        if (localCountdowns) countdownHook.setCountdowns(JSON.parse(localCountdowns));

        const storedTasks = await store.get<Task[]>("tasks");
        const storedCompleted = await store.get<Task[]>("completedTasks");

        if (storedTasks && storedTasks.length > 0) {
          tasksHook.setTasks(storedTasks);
        } else {
          const local = localStorage.getItem("aero_todos");
          if (local) {
            const parsed = JSON.parse(local);
            tasksHook.setTasks(parsed);
            await store.set("tasks", parsed);
          } else {
            tasksHook.setTasks(tasksHook.INITIAL_TASKS);
            await store.set("tasks", tasksHook.INITIAL_TASKS);
          }
        }

        if (storedCompleted) {
          tasksHook.setCompletedTasks(storedCompleted);
        } else {
          const localCompleted = localStorage.getItem("aero_completed_todos");
          if (localCompleted) {
            const parsed = JSON.parse(localCompleted);
            tasksHook.setCompletedTasks(parsed);
            await store.set("completedTasks", parsed);
          } else {
            tasksHook.setCompletedTasks([]);
            await store.set("completedTasks", []);
          }
        }

        await store.save();
      } catch (e) {
        console.warn("Store 加载失败，回退到 localStorage", e);
        const local = localStorage.getItem("aero_todos");
        tasksHook.setTasks(local ? JSON.parse(local) : tasksHook.INITIAL_TASKS);
        const localCompleted = localStorage.getItem("aero_completed_todos");
        tasksHook.setCompletedTasks(localCompleted ? JSON.parse(localCompleted) : []);
      }
    };
    initStore();

    // Cross-window event listener
    const unlistenPromise = listen("todo-sync-event", (event: any) => {
      const p = event.payload;
      switch (p.action) {
        case "complete":
          tasksHook.handleComplete(p.task_id);
          break;
        case "undo_complete":
          tasksHook.handleUndoComplete(p.task_id);
          break;
        case "delete":
          tasksHook.handleDeleteTask(p.task_id);
          break;
        case "snooze":
          tasksHook.handleSnooze(p.task_id);
          break;
        case "add": {
          const newTask: Task = {
            id: p.task_id,
            title: p.title,
            notes: p.notes || undefined,
            description: p.description || undefined,
            category: p.category || "urgent-important",
            dueDate: p.due_date || undefined,
            dueTime: p.due_time || undefined,
          };
          tasksHook.setTasks((prev: Task[]) => [newTask, ...prev.filter((t: Task) => t.id !== newTask.id)]);
          break;
        }
        case "favorite_sync":
          tasksHook.setTasks((prev: Task[]) => prev.map((t) => t.id === p.task_id ? { ...t, isFavorite: p.title === "true" } : t));
          break;
        case "pin_sync":
          tasksHook.setTasks((prev: Task[]) => prev.map((t) => t.id === p.task_id ? { ...t, isPinned: p.title === "true" } : t));
          break;
        case "update":
          tasksHook.setTasks((prev: Task[]) => prev.map((t) =>
            t.id === p.task_id ? { ...t, title: p.title || t.title, description: p.description || undefined, category: p.category || t.category, notes: p.notes || undefined, dueDate: p.due_date || undefined, dueTime: p.due_time || undefined } : t
          ));
          break;
        case "reset":
          tasksHook.setTasks(tasksHook.INITIAL_TASKS);
          tasksHook.setCompletedTasks([]);
          break;
        case "clear_completed":
          tasksHook.setCompletedTasks([]);
          break;
        case "lock_widget":
          widgetHook.setIsWidgetLocked(true);
          break;
        case "unlock_widget":
          widgetHook.setIsWidgetLocked(false);
          break;
        case "toggle_lock_from_tray":
          if (label === "main") widgetHook.handleToggleWidgetLock();
          break;
        case "pomodoro_sync":
          try {
            const data = JSON.parse(p.title);
            pomodoroHook.setPomodoroIsActive(data.active);
            pomodoroHook.setPomodoroTimeLeft(data.timeLeft);
            pomodoroHook.setPomodoroIsBreak(data.isBreak);
            pomodoroHook.setFocusDuration(data.focusDuration);
            pomodoroHook.setBreakDuration(data.breakDuration);
            pomodoroHook.setPomodoroSessionCount(data.sessionCount);
            pomodoroHook.setPomodoroTaskId(data.taskId || null);
            pomodoroHook.setPomodoroTaskTitle(data.taskTitle || null);
            pomodoroHook.setPomodoroEndTime(data.endTime);
          } catch (e) {}
          break;
        case "add_pomodoro_log":
          try {
            const log = JSON.parse(p.title);
            pomodoroHook.setPomodoroLogs((prev: any[]) => [log, ...prev.filter((l: any) => l.id !== log.id)]);
          } catch (e) {}
          break;
        case "add_note":
          try {
            const note = JSON.parse(p.title);
            notesHook.setStickyNotes((prev: any[]) => [note, ...prev.filter((n: any) => n.id !== note.id)]);
          } catch (e) {}
          break;
        case "edit_note_text":
          notesHook.setStickyNotes((prev: any[]) => prev.map((n) => n.id === p.task_id ? { ...n, text: p.title } : n));
          break;
        case "change_note_color":
          notesHook.setStickyNotes((prev: any[]) => prev.map((n) => n.id === p.task_id ? { ...n, color: p.title } : n));
          break;
        case "delete_note":
          notesHook.setStickyNotes((prev: any[]) => prev.filter((n) => n.id !== p.task_id));
          break;
        case "settings_sync":
          try {
            const config = JSON.parse(p.title);
            customizationHook.setCustomizationConfig(config);
          } catch (e) {}
          break;
        case "restore_sync":
          try {
            const restored = JSON.parse(p.title);
            tasksHook.setTasks(restored.tasks || []);
            tasksHook.setCompletedTasks(restored.completedTasks || []);
            notesHook.setStickyNotes(restored.stickyNotes || []);
            customizationHook.setCustomizationConfig(restored.customizationConfig || customizationHook.DEFAULT_CUSTOMIZATION_CONFIG);
          } catch (e) {}
          break;
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // ============ State Persistence (deferred, never blocks render) ============
  useEffect(() => { localStorage.setItem("aero_todos", JSON.stringify(tasksHook.tasks)); }, [tasksHook.tasks]);
  useEffect(() => { localStorage.setItem("aero_completed_todos", JSON.stringify(tasksHook.completedTasks)); }, [tasksHook.completedTasks]);
  useEffect(() => { localStorage.setItem("aero_sticky_notes", JSON.stringify(notesHook.stickyNotes)); }, [notesHook.stickyNotes]);
  useEffect(() => { localStorage.setItem("aero_customization_config", JSON.stringify(customizationHook.customizationConfig)); }, [customizationHook.customizationConfig]);
  useEffect(() => { localStorage.setItem("aero_pomodoro_logs", JSON.stringify(pomodoroHook.pomodoroLogs)); }, [pomodoroHook.pomodoroLogs]);
  useEffect(() => { localStorage.setItem("qiyun_countdowns", JSON.stringify(countdownHook.countdowns)); }, [countdownHook.countdowns]);

  // ============ Pomodoro Timer Effect ============
  useEffect(() => {
    let interval: any = null;
    if (pomodoroHook.pomodoroIsActive && pomodoroHook.pomodoroEndTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.round((pomodoroHook.pomodoroEndTime! - now) / 1000));
        pomodoroHook.setPomodoroTimeLeft(diff);

        if (diff <= 0) {
          clearInterval(interval);
          if (windowLabel === "main") {
            pomodoroHook.playCompletionSound();

            if (pomodoroHook.pomodoroIsBreak) {
              pomodoroHook.setPomodoroIsBreak(false);
              pomodoroHook.setPomodoroIsActive(false);
              pomodoroHook.setPomodoroEndTime(null);
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(t.notification.focusTime, { body: t.notification.focusTimeBody });
              }
              const nextTime = pomodoroHook.focusDuration * 60;
              pomodoroHook.setPomodoroTimeLeft(nextTime);
              setTimeout(() => {
                pomodoroHook.syncPomodoro(false, nextTime, false, pomodoroHook.focusDuration, pomodoroHook.breakDuration, pomodoroHook.pomodoroSessionCount, null, null);
              }, 50);
            } else {
              pomodoroHook.setPomodoroIsBreak(true);
              pomodoroHook.setPomodoroIsActive(false);
              pomodoroHook.setPomodoroEndTime(null);
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(t.notification.pomodoroTime, { body: t.notification.pomodoroTimeBody });
              }
              const nextSession = pomodoroHook.pomodoroSessionCount + 1;
              pomodoroHook.setPomodoroSessionCount(nextSession);
              const nextTime = pomodoroHook.breakDuration * 60;
              pomodoroHook.setPomodoroTimeLeft(nextTime);

              const newLog = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                duration: pomodoroHook.focusDuration,
                taskId: pomodoroHook.pomodoroTaskId || undefined,
                taskTitle: pomodoroHook.pomodoroTaskTitle || undefined,
              };
              pomodoroHook.setPomodoroLogs((prev: any[]) => [newLog, ...prev]);

              setCelebrationMessage(
                locale === "en" ? "Focus session done! Keep going 💪" : "专注一关完成！继续加油 💪"
              );

              pomodoroHook.setPomodoroTaskId(null);
              pomodoroHook.setPomodoroTaskTitle(null);

              setTimeout(() => {
                pomodoroHook.syncPomodoro(false, nextTime, true, pomodoroHook.focusDuration, pomodoroHook.breakDuration, nextSession, null, null);
              }, 50);
            }
          }
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [
    pomodoroHook.pomodoroIsActive,
    pomodoroHook.pomodoroEndTime,
    pomodoroHook.pomodoroIsBreak,
    pomodoroHook.focusDuration,
    pomodoroHook.breakDuration,
    pomodoroHook.pomodoroSessionCount,
    pomodoroHook.pomodoroTaskId,
    pomodoroHook.pomodoroTaskTitle,
    windowLabel,
    pomodoroHook.syncPomodoro,
  ]);

  // Audio cleanup
  useEffect(() => {
    return () => { audioEngine.close(); };
  }, []);

  // ============ AI Confirm Tasks ============
  const handleConfirmAiTasks = useCallback(() => {
    if (aiHook.aiPreviewTasks.length === 0) return;
    aiHook.aiPreviewTasks.forEach((item) => {
      tasksHook.handleAddTask({
        title: item.title,
        description: item.description || "",
        notes: item.notes || "",
        category: item.category,
        dueDate: item.dueDate || new Date().toISOString().split("T")[0],
        dueTime: item.dueTime || undefined,
        isExplicit: true,
      });
    });
    const count = aiHook.aiPreviewTasks.length;
    aiHook.setAiPreviewTasks([]);
    aiHook.setAiInputText("");
    aiHook.setAiInputMessage({
      type: "success",
      text: `🎉 AI 成功规划并录入 ${count} 项日程待办！`,
    });
  }, [aiHook.aiPreviewTasks, tasksHook.handleAddTask]);

  // ============ Celebration on Complete ============
  const originalHandleComplete = tasksHook.handleComplete;
  const wrappedHandleComplete = useCallback((id: string) => {
    originalHandleComplete(id);
    if (customizationHook.customizationConfig.enableCelebration !== false) {
      const fixedPool = locale === "en"
        ? ["You're amazing! 🎉", "Nailed it! 💪", "Perfect! ✨", "On fire! 🚀", "Task destroyer! 🏆", "Unstoppable! 😎", "What a day! ☀️", "Have a cookie! 🍪", "Brilliant! 🔥", "Flawless! ⭐"]
        : ["你真牛逼！🎉", "太强了吧！💪", "完美收官！✨", "效率爆表！🚀", "任务终结者！🏆", "无敌是多么寂寞！😎", "今天也是元气满满的一天！☀️", "你值得一朵小红花 🌸", "帅呆了！🔥", "行云流水！⭐"];
      let aiPool: string[] = [];
      try {
        const stored = localStorage.getItem("qiyun_ai_praise");
        if (stored) aiPool = JSON.parse(stored);
      } catch (e) {}
      const pool = [...fixedPool, ...aiPool];
      setCelebrationMessage(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [tasksHook.tasks, originalHandleComplete, customizationHook.customizationConfig.enableCelebration]);

  // ============ WebDAV Auto Backup (debounced via ref to avoid timer starvation) ============
  const backupDirtyRef = useRef(false);
  // Mark dirty whenever data changes — does NOT restart the interval
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (isRestoringRef.current) { isRestoringRef.current = false; return; }
    backupDirtyRef.current = true;
  }, [tasksHook.tasks, tasksHook.completedTasks, notesHook.stickyNotes, customizationHook.customizationConfig]);

  // Single stable interval that checks the dirty flag every 15s
  useEffect(() => {
    isFirstLoad.current = false;

    const url = localStorage.getItem("qiyun_webdav_url");
    const username = localStorage.getItem("qiyun_webdav_user");
    const password = localStorage.getItem("qiyun_webdav_pass");

    if (customizationHook.customizationConfig.enableAutoBackup === false || !url || !username) return;

    const interval = setInterval(async () => {
      if (!backupDirtyRef.current) return;
      backupDirtyRef.current = false;
      setSyncStatus("syncing");

      try {
        const now = Date.now();
        const aiPraise = JSON.parse(localStorage.getItem("qiyun_ai_praise") || "[]");
        const backupData = {
          tasks: tasksHook.tasks,
          completedTasks: tasksHook.completedTasks,
          stickyNotes: notesHook.stickyNotes,
          customizationConfig: customizationHook.customizationConfig,
          aiPraise,
          timestamp: now,
        };
        const { webdavUpload, webdavUploadVersion } = await import("./utils/webdav");
        const wdConfig = { url, username, password: password || "" };
        await webdavUpload(wdConfig, "qiyun_list_backup.json", JSON.stringify(backupData, null, 2));
        await webdavUploadVersion(wdConfig, now);
        lastSyncVersionRef.current = now;
        localStorage.setItem("qiyun_sync_version", now.toString());
        setLastBackupTime(now);
        localStorage.setItem("aero_last_backup_time", now.toString());
        setSyncStatus("synced");
      } catch (e) {
        console.error("自动同步备份失败:", e);
        setSyncStatus("error");
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [customizationHook.customizationConfig.enableAutoBackup]);

  // WebDAV restore logic
  const restoreFromData = useCallback((data: any) => {
    if (data && (Array.isArray(data.tasks) || Array.isArray(data.stickyNotes))) {
      isRestoringRef.current = true;
      if (Array.isArray(data.tasks)) {
        tasksHook.setTasks(data.tasks);
        tasksHook.saveTasks(data.tasks);
      }
      if (Array.isArray(data.completedTasks)) {
        tasksHook.setCompletedTasks(data.completedTasks);
        tasksHook.saveCompleted(data.completedTasks);
      }
      if (Array.isArray(data.stickyNotes)) {
        notesHook.setStickyNotes(data.stickyNotes);
        notesHook.saveStickyNotes(data.stickyNotes);
      }
      if (data.customizationConfig) {
        customizationHook.setCustomizationConfig(data.customizationConfig);
        localStorage.setItem("aero_customization_config", JSON.stringify(data.customizationConfig));
      }
      if (data.aiPraise) {
        localStorage.setItem("qiyun_ai_praise", JSON.stringify(data.aiPraise));
      }
      return true;
    }
    return false;
  }, [tasksHook.setTasks, tasksHook.saveTasks, tasksHook.setCompletedTasks, tasksHook.saveCompleted, notesHook.setStickyNotes, notesHook.saveStickyNotes, customizationHook.setCustomizationConfig]);

  const handleBackupToCloud = useCallback(async (config: WebDavConfig) => {
    const aiPraise = JSON.parse(localStorage.getItem("qiyun_ai_praise") || "[]");
    const backupData = {
      tasks: tasksHook.tasks,
      completedTasks: tasksHook.completedTasks,
      stickyNotes: notesHook.stickyNotes,
      customizationConfig: customizationHook.customizationConfig,
      aiPraise,
      timestamp: Date.now(),
    };
    const { webdavUpload } = await import("./utils/webdav");
    await webdavUpload(config, "qiyun_list_backup.json", JSON.stringify(backupData, null, 2));
  }, [tasksHook.tasks, tasksHook.completedTasks, notesHook.stickyNotes, customizationHook.customizationConfig]);

  const handleRestoreFromCloud = useCallback(async (config: WebDavConfig) => {
    const { webdavDownload } = await import("./utils/webdav");
    const jsonStr = await webdavDownload(config, "qiyun_list_backup.json");
    const data = JSON.parse(jsonStr);
    if (!restoreFromData(data)) {
      throw new Error("备份数据格式不正确");
    }
  }, [restoreFromData]);

  const checkAndSyncFromCloud = useCallback(async (silent: boolean = false) => {
    const url = localStorage.getItem("qiyun_webdav_url");
    const username = localStorage.getItem("qiyun_webdav_user");
    const password = localStorage.getItem("qiyun_webdav_pass");
    if (!url || !username) return;
    try {
      const { webdavDownloadVersion, webdavDownload } = await import("./utils/webdav");
      const remoteVersion = await webdavDownloadVersion({ url, username, password: password || "" });
      if (remoteVersion && remoteVersion > lastSyncVersionRef.current) {
        const jsonStr = await webdavDownload({ url, username, password: password || "" }, "qiyun_list_backup.json");
        const data = JSON.parse(jsonStr);
        if (restoreFromData(data)) {
          lastSyncVersionRef.current = remoteVersion;
          localStorage.setItem("qiyun_sync_version", remoteVersion.toString());
          if (!silent) setSyncStatus("synced");
        }
      }
    } catch (e) {
      if (!silent) console.warn("自动同步检查失败:", e);
    }
  }, [restoreFromData]);

  // Startup cloud check
  useEffect(() => {
    if (customizationHook.customizationConfig.enableAutoBackup === false) return;
    const url = localStorage.getItem("qiyun_webdav_url");
    if (!url) return;
    const timer = setTimeout(() => checkAndSyncFromCloud(true), 3000);
    return () => clearTimeout(timer);
  }, [customizationHook.customizationConfig.enableAutoBackup, checkAndSyncFromCloud]);

  // Periodic cloud sync
  useEffect(() => {
    if (customizationHook.customizationConfig.enableAutoBackup === false) return;
    const url = localStorage.getItem("qiyun_webdav_url");
    if (!url) return;
    const interval = setInterval(() => checkAndSyncFromCloud(true), 300000);
    return () => clearInterval(interval);
  }, [customizationHook.customizationConfig.enableAutoBackup, checkAndSyncFromCloud]);

  // Add task with AI auto-categorize
  const handleAddTaskWithAI = useCallback(async (taskData: {
    title: string;
    description: string;
    notes: string;
    category: Task["category"];
    dueDate: string;
    dueTime?: string;
    isExplicit?: boolean;
    repeat?: any;
    tags?: string[];
  }) => {
    const { taskId } = await tasksHook.handleAddTask(taskData);

    if (!taskData.isExplicit && customizationHook.customizationConfig.aiAutoCategorize && customizationHook.customizationConfig.aiApiKey) {
      const aiCategory = await aiHook.aiAutoCategorize(taskData.title, taskData.description);
      if (aiCategory && aiCategory !== taskData.category) {
        tasksHook.setTasks((prev: Task[]) => {
          const updated = prev.map((t) => (t.id === taskId ? { ...t, category: aiCategory! } : t));
          tasksHook.saveTasks(updated);
          return updated;
        });
      }
    }
  }, [tasksHook.handleAddTask, tasksHook.setTasks, tasksHook.saveTasks, customizationHook.customizationConfig, aiHook.aiAutoCategorize]);

  const handlePinNoteToDesktop = async (id: string) => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const label = `note-${id}`;
      const noteWindow = new WebviewWindow(label, {
        url: `index.html?noteId=${id}`,
        title: `便签贴-${id}`,
        width: 240,
        height: 240,
        resizable: true,
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        shadow: false,
      });
      noteWindow.once("tauri://error", () => {
        WebviewWindow.getByLabel(label)?.then((w) => w?.setFocus());
      });
    } catch (err) {
      console.error("创建桌面便签贴失败", err);
    }
  };

  const getWatercolorBlobs = () => {
    const style = customizationHook.customizationConfig.watercolorStyle || "oasis";
    if (style === "none") return null;
    let blob1 = "bg-[#FCF2F0]/65";
    let blob2 = "bg-[#F0F5F1]/65";
    let blob3 = "bg-[#FAF5ED]/65";
    if (style === "aurora") {
      blob1 = "bg-[#F3F2F7]/65";
      blob2 = "bg-[#EBF3F6]/65";
      blob3 = "bg-[#FAF5ED]/65";
    } else if (style === "sunny") {
      blob1 = "bg-[#FBECE5]/65";
      blob2 = "bg-[#FAF5ED]/65";
      blob3 = "bg-[#FCF2F0]/65";
    }
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute top-[-10%] left-[-15%] w-[55vw] h-[55vw] rounded-full ${blob1} blur-[100px] animate-float-slow`} />
        <div className={`absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full ${blob2} blur-[100px] animate-float-reverse`} />
        <div className={`absolute top-[25%] right-[10%] w-[40vw] h-[40vw] rounded-full ${blob3} blur-[90px] animate-float-slow`} />
      </div>
    );
  };

  // ============ FloatingNote / Widget / Main Render ============
  if (windowLabel.startsWith("note-")) {
    const noteId = windowLabel.substring(5);
    return <FloatingNoteWindow noteId={noteId} />;
  }

  if (windowLabel === "widget") {
    return (
      <WidgetWindow
        tasks={tasksHook.tasks}
        completedTasks={tasksHook.completedTasks}
        stickyNotes={notesHook.stickyNotes}
        progressPercentage={tasksHook.progressPercentage}
        pomodoroLogs={pomodoroHook.pomodoroLogs}
        isWidgetLocked={widgetHook.isWidgetLocked}
        handleToggleWidgetLock={widgetHook.handleToggleWidgetLock}
        handleComplete={wrappedHandleComplete}
        handleSnooze={tasksHook.handleSnooze}
        handleAddNote={notesHook.handleAddNote}
        handleDeleteNote={notesHook.handleDeleteNote}
        handleEditNoteText={notesHook.handleEditNoteText}
        handleChangeNoteColor={notesHook.handleChangeNoteColor}
        pomodoroIsActive={pomodoroHook.pomodoroIsActive}
        setPomodoroIsActive={pomodoroHook.setPomodoroIsActive}
        pomodoroTimeLeft={pomodoroHook.pomodoroTimeLeft}
        setPomodoroTimeLeft={pomodoroHook.setPomodoroTimeLeft}
        pomodoroIsBreak={pomodoroHook.pomodoroIsBreak}
        pomodoroSessionCount={pomodoroHook.pomodoroSessionCount}
        focusDuration={pomodoroHook.focusDuration}
        setFocusDuration={pomodoroHook.setFocusDuration}
        breakDuration={pomodoroHook.breakDuration}
        setBreakDuration={pomodoroHook.setBreakDuration}
        syncPomodoro={pomodoroHook.syncPomodoro}
        setTasks={tasksHook.setTasks}
        saveTasks={tasksHook.saveTasks}
        syncState={syncState}
        customizationConfig={customizationHook.customizationConfig}
        pomodoroTaskId={pomodoroHook.pomodoroTaskId}
        pomodoroTaskTitle={pomodoroHook.pomodoroTaskTitle}
        setPomodoroTaskId={pomodoroHook.setPomodoroTaskId}
        setPomodoroTaskTitle={pomodoroHook.setPomodoroTaskTitle}
        handleStartFocus={pomodoroHook.handleStartFocus}
        handleToggleFavorite={tasksHook.handleToggleFavorite}
        celebrationMessage={celebrationMessage}
        onClearCelebration={() => setCelebrationMessage(null)}
        handleUndoComplete={tasksHook.handleUndoComplete}
      />
    );
  }

  return (
    <div className={`w-full h-full min-h-screen bg-[#FAF8F5] text-[#2D323A] flex flex-col select-none overflow-hidden relative theme-glass-${customizationHook.customizationConfig.interfaceGlass || "matte"} theme-font-${customizationHook.customizationConfig.fontFamily || "sans"}`}>
      <TitleBar />
      <div className="flex flex-grow min-h-0 relative">
        {getWatercolorBlobs()}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          progressPercentage={tasksHook.progressPercentage}
          completedTasksCount={tasksHook.completedTasks.length}
          tasksCount={tasksHook.tasks.length}
          stickyNotesCount={notesHook.stickyNotes.length}
          countdownCount={countdownHook.countdowns.length}
          pomodoroIsActive={pomodoroHook.pomodoroIsActive}
          setPomodoroIsActive={pomodoroHook.setPomodoroIsActive}
          pomodoroIsBreak={pomodoroHook.pomodoroIsBreak}
          pomodoroSessionCount={pomodoroHook.pomodoroSessionCount}
          pomodoroTimeLeft={pomodoroHook.pomodoroTimeLeft}
          setPomodoroTimeLeft={pomodoroHook.setPomodoroTimeLeft}
          focusDuration={pomodoroHook.focusDuration}
          setFocusDuration={pomodoroHook.setFocusDuration}
          breakDuration={pomodoroHook.breakDuration}
          setBreakDuration={pomodoroHook.setBreakDuration}
          alertSoundType={pomodoroHook.alertSoundType}
          setAlertSoundType={pomodoroHook.setAlertSoundType}
          syncPomodoro={pomodoroHook.syncPomodoro}
          isPlayingNoise={pomodoroHook.isPlayingNoise}
          setIsPlayingNoise={pomodoroHook.setIsPlayingNoise}
          selectedNoiseType={pomodoroHook.selectedNoiseType}
          setSelectedNoiseType={pomodoroHook.setSelectedNoiseType}
          noiseVolume={pomodoroHook.noiseVolume}
          setNoiseVolume={pomodoroHook.setNoiseVolume}
          startNoise={pomodoroHook.startNoise}
          stopNoise={pomodoroHook.stopNoise}
          handleToggleWidget={widgetHook.handleToggleWidget}
          handleToggleWidgetLock={widgetHook.handleToggleWidgetLock}
          isWidgetLocked={widgetHook.isWidgetLocked}
          resetTasks={tasksHook.resetTasks}
          pomodoroTaskId={pomodoroHook.pomodoroTaskId}
          pomodoroTaskTitle={pomodoroHook.pomodoroTaskTitle}
          setPomodoroTaskId={pomodoroHook.setPomodoroTaskId}
          setPomodoroTaskTitle={pomodoroHook.setPomodoroTaskTitle}
          syncStatus={syncStatus}
          lastBackupTime={lastBackupTime}
        />
        <main className="flex-grow p-6 overflow-y-auto flex flex-col gap-5 z-10 relative custom-scrollbar min-h-0">
          {activeTab !== "home" && (
            <>
              <header className="flex justify-between items-center border-b border-[#EFEBE4] pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-wide text-[#2D323A]">
                    {activeTab === "matrix" ? t.header.matrix
                      : activeTab === "list" ? t.header.list
                      : activeTab === "calendar" ? t.header.calendar
                      : activeTab === "notes" ? t.header.notes
                      : activeTab === "analytics" ? t.header.analytics
                      : activeTab === "settings" ? t.header.settings
                      : activeTab === "countdown" ? t.header.countdown
                      : t.header.completed}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {activeTab === "settings"
                      ? "自定义主题色调、材质滤镜与系统字体，个性化配置您的待办看板。"
                      : "规划今日待办，有条不紊地记录生活的每个瞬间。"}
                  </p>
                </div>
                {(activeTab === "matrix" || activeTab === "list") && (
                  <button
                    onClick={() => aiHook.setShowAiInbox(!aiHook.showAiInbox)}
                    className={`text-xs px-3.5 py-2 rounded-xl font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs select-none ${
                      aiHook.showAiInbox ? "bg-[#FCF2F0] text-[#A34E36] border-[#F5DFDB]" : "bg-white text-slate-500 border-[#EFEBE4] hover:bg-[#FAF8F5]"
                    }`}
                    title={aiHook.showAiInbox ? t.quickAdd.closeAi : t.quickAdd.aiInbox}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiHook.showAiInbox ? t.quickAdd.closeAi : t.quickAdd.aiInbox}</span>
                  </button>
                )}
              </header>
              <div className="flex flex-wrap items-center gap-4 bg-white/70 border border-[#EFEBE4] px-5 py-3 rounded-2xl shadow-sm z-10 relative backdrop-blur-md">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span>📅 {new Date().toLocaleDateString(customizationHook.customizationConfig.locale === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "long", day: "numeric" })}</span>
                  <span className="text-[#EFEBE4]">|</span>
                  <span>{t.sidebar.progress}</span>
                </div>
                <div className="flex items-center gap-4 ml-auto text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B2C8DF]" />
                    <span className="text-slate-500">{t.common.taskCount.replace("{count}", String(tasksHook.tasks.length))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4D7B2]" />
                    <span className="text-slate-500">{t.common.completed.replace("{count}", String(tasksHook.completedTasks.length))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8A0BF]" />
                    <span className="text-slate-500">{t.common.progress.replace("{pct}", String(tasksHook.progressPercentage))}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {aiHook.showAiInbox && (activeTab === "matrix" || activeTab === "list") && (
            <div className="bg-white/60 border border-[#EFEBE4] p-4 rounded-2xl shadow-sm z-10 relative backdrop-blur-md flex flex-col gap-2.5 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8B6E3C] tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8B6E3C]" />
                  <span>{t.quickAdd.aiInboxTitle}</span>
                </span>
              </div>
              {aiHook.aiInputMessage && (
                <div className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fade-in-up ${aiHook.aiInputMessage.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]" : "bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]"}`}>
                  <span>{aiHook.aiInputMessage.text === "API_KEY_MISSING" ? t.quickAdd.apiKeyMissing : aiHook.aiInputMessage.text}</span>
                  {aiHook.aiInputMessage.text === "API_KEY_MISSING" && (
                    <button onClick={() => { setActiveTab("settings"); aiHook.setShowAiInbox(false); aiHook.setAiInputMessage(null); }} className="flex-shrink-0 px-3 py-1 rounded-lg bg-[#E65100] text-white text-[10px] font-bold hover:bg-[#BF360C] transition-colors cursor-pointer">
                      {t.quickAdd.goToSettings}
                    </button>
                  )}
                </div>
              )}
              {aiHook.aiPreviewTasks.length > 0 ? (
                <div className="flex flex-col gap-3 animate-fade-in-up">
                  <div className="text-[10px] font-bold text-slate-500 mb-1 border-b border-[#EFEBE4] pb-1.5">{t.quickAdd.aiPreview}</div>
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {aiHook.aiPreviewTasks.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#FAF8F5]/85 border border-[#EFEBE4] rounded-xl flex flex-col gap-2 shadow-2xs">
                        <div className="flex gap-2 items-center">
                          <input type="text" value={item.title} onChange={(e) => { const u = [...aiHook.aiPreviewTasks]; u[idx].title = e.target.value; aiHook.setAiPreviewTasks(u); }} className="flex-grow bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]" placeholder={t.quickAdd.taskTitle} />
                          <input type="date" value={item.dueDate} onChange={(e) => { const u = [...aiHook.aiPreviewTasks]; u[idx].dueDate = e.target.value; aiHook.setAiPreviewTasks(u); }} className="bg-white border border-[#EFEBE4] px-2 py-1 rounded-lg text-[10px] text-slate-700 font-bold focus:outline-none focus:border-[#4D7C5D] w-28 flex-shrink-0" />
                          <input type="time" value={item.dueTime || ""} onChange={(e) => { const u = [...aiHook.aiPreviewTasks]; u[idx].dueTime = e.target.value; aiHook.setAiPreviewTasks(u); }} className="bg-white border border-[#EFEBE4] px-2 py-1 rounded-lg text-[10px] text-slate-700 font-bold focus:outline-none focus:border-[#4D7C5D] w-16 flex-shrink-0" />
                          <select value={item.category} onChange={(e) => { const u = [...aiHook.aiPreviewTasks]; u[idx].category = e.target.value as Task["category"]; aiHook.setAiPreviewTasks(u); }} className="bg-white border border-[#EFEBE4] px-2 py-1 rounded-lg text-[10px] text-slate-700 font-semibold focus:outline-none focus:border-[#4D7C5D] w-32 flex-shrink-0">
                            <option value="urgent-important">I. {t.matrix.urgentImportant}</option>
                            <option value="important-not-urgent">II. {t.matrix.importantNotUrgent}</option>
                            <option value="urgent-not-important">III. {t.matrix.urgentNotImportant}</option>
                            <option value="not-urgent-not-important">IV. {t.matrix.notUrgentNotImportant}</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">任务说明/详情描述</label>
                            <input type="text" value={item.description} onChange={(e) => { const u = [...aiHook.aiPreviewTasks]; u[idx].description = e.target.value; aiHook.setAiPreviewTasks(u); }} className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1 rounded-lg text-[10px] text-slate-600 focus:outline-none focus:border-[#4D7C5D]" placeholder={t.quickAdd.noDescription} />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">{t.quickAdd.techNotes}</label>
                            <input type="text" value={item.notes} onChange={(e) => { const u = [...aiHook.aiPreviewTasks]; u[idx].notes = e.target.value; aiHook.setAiPreviewTasks(u); }} className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1 rounded-lg text-[10px] text-slate-600 focus:outline-none focus:border-[#4D7C5D]" placeholder={t.quickAdd.noNotes} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end pt-1.5 border-t border-[#EFEBE4]">
                    <button onClick={() => aiHook.setAiPreviewTasks([])} className="text-[10px] text-slate-500 hover:text-slate-700 px-3.5 py-1.5 rounded-lg border border-[#EFEBE4] transition-colors cursor-pointer">{t.quickAdd.discard}</button>
                    <button onClick={handleConfirmAiTasks} className="text-[10px] text-white bg-[#4D7C5D] hover:bg-[#3F684C] px-4.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shadow-xs">{t.quickAdd.confirmImport}</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <textarea value={aiHook.aiInputText} onChange={(e) => aiHook.setAiInputText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); aiHook.handleAiBatchInput(); } }} onFocus={() => aiHook.aiInputMessage && aiHook.setAiInputMessage(null)} placeholder={t.quickAdd.aiPlaceholder} className="flex-grow bg-[#FAF8F5]/80 border border-[#EFEBE4] px-3.5 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors resize-none h-14 custom-scrollbar font-semibold" disabled={aiHook.aiInputLoading} />
                  <button onClick={aiHook.handleAiBatchInput} disabled={aiHook.aiInputLoading} className={`px-4.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_4px_rgba(77,124,93,0.1)] select-none ${aiHook.aiInputLoading ? "bg-slate-300 border-slate-300 cursor-not-allowed" : "bg-[#4D7C5D] hover:bg-[#3F684C] border-[#4D7C5D] cursor-pointer hover:scale-102"}`}>
                    {aiHook.aiInputLoading ? (
                      <><Sparkles className="w-3.5 h-3.5 animate-spin" /><span>{t.quickAdd.aiProcessing}</span></>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /><span>{t.quickAdd.aiAnalyze}</span></>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "home" && (
            <DashboardView tasks={tasksHook.tasks} completedTasks={tasksHook.completedTasks} handleComplete={wrappedHandleComplete} onTaskClick={tasksHook.handleTaskClick} config={customizationHook.customizationConfig} />
          )}
          {activeTab === "matrix" && (
            <MatrixView tasks={tasksHook.tasks} handleComplete={wrappedHandleComplete} qColors={customizationHook.customizationConfig.qColors} handleStartFocus={pomodoroHook.handleStartFocus} handleAddTask={handleAddTaskWithAI} handleToggleFavorite={tasksHook.handleToggleFavorite} handleTogglePin={tasksHook.handleTogglePin} onTaskClick={tasksHook.handleTaskClick} searchQuery={aiHook.searchQuery} setSearchQuery={aiHook.setSearchQuery} />
          )}
          {activeTab === "list" && (
            <ListView tasks={tasksHook.tasks} searchQuery={aiHook.searchQuery} setSearchQuery={aiHook.setSearchQuery} categoryFilter={aiHook.categoryFilter} setCategoryFilter={aiHook.setCategoryFilter} tagFilter={aiHook.tagFilter} setTagFilter={aiHook.setTagFilter} handleComplete={wrappedHandleComplete} handleDeleteTask={tasksHook.handleDeleteTask} expandedNoteId={tasksHook.expandedNoteId} setExpandedNoteId={tasksHook.setExpandedNoteId} editingNotes={tasksHook.editingNotes} setEditingNotes={tasksHook.setEditingNotes} handleSaveNotes={tasksHook.handleSaveNotes} handleStartFocus={pomodoroHook.handleStartFocus} handleAddTask={handleAddTaskWithAI} handleToggleFavorite={tasksHook.handleToggleFavorite} handleTogglePin={tasksHook.handleTogglePin} onTaskClick={tasksHook.handleTaskClick} />
          )}
          {activeTab === "calendar" && (
            <CalendarView tasks={tasksHook.tasks} handleComplete={wrappedHandleComplete} calendarYear={calendarYear} setCalendarYear={setCalendarYear} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} selectedCalendarDate={selectedCalendarDate} setSelectedCalendarDate={setSelectedCalendarDate} handleAddTask={handleAddTaskWithAI} />
          )}
          {activeTab === "notes" && (
            <StickyNotesView stickyNotes={notesHook.stickyNotes} handleAddNote={notesHook.handleAddNote} handleEditNoteText={notesHook.handleEditNoteText} handleChangeNoteColor={notesHook.handleChangeNoteColor} handleDeleteNote={notesHook.handleDeleteNote} pinType={customizationHook.customizationConfig.pinType} onPinNoteToDesktop={handlePinNoteToDesktop} />
          )}
          {activeTab === "analytics" && (
            <AnalyticsView pomodoroLogs={pomodoroHook.pomodoroLogs} tasks={tasksHook.tasks} completedTasks={tasksHook.completedTasks} />
          )}
          {activeTab === "completed" && (
            <CompletedView completedTasks={tasksHook.completedTasks} handleClearCompleted={tasksHook.handleClearCompleted} handleUndoComplete={tasksHook.handleUndoComplete} handleDeleteTask={tasksHook.handleDeleteTask} />
          )}
          {activeTab === "countdown" && (
            <CountdownView countdowns={countdownHook.countdowns} handleAddCountdown={countdownHook.handleAddCountdown} handleDeleteCountdown={countdownHook.handleDeleteCountdown} />
          )}
          {activeTab === "settings" && (
            <SettingsView config={customizationHook.customizationConfig} onChange={customizationHook.handleConfigChange} onBackupToCloud={handleBackupToCloud} onRestoreFromCloud={handleRestoreFromCloud} alertSoundType={pomodoroHook.alertSoundType} setAlertSoundType={pomodoroHook.setAlertSoundType} resetTasks={tasksHook.resetTasks} />
          )}
        </main>

        {celebrationMessage && (
          <CelebrationOverlay message={celebrationMessage} onDone={() => setCelebrationMessage(null)} />
        )}
        {tasksHook.detailTaskId && (() => {
          const task = tasksHook.tasks.find((t: Task) => t.id === tasksHook.detailTaskId) || tasksHook.completedTasks.find((t: Task) => t.id === tasksHook.detailTaskId);
          if (!task) return null;
          return (
            <TaskDetailModal task={task} onClose={tasksHook.handleCloseDetail} onToggleSubtask={tasksHook.handleToggleSubtask} onAddSubtask={tasksHook.handleAddSubtask} onSaveNotes={tasksHook.handleSaveNotes} onUpdateTags={tasksHook.handleUpdateTags} />
          );
        })()}
      </div>
    </div>
  );
}

function App() {
  const savedLocale = localStorage.getItem("qiyun_locale") as "zh-CN" | "en" | null;
  return (
    <LanguageProvider initialLocale={savedLocale || "zh-CN"}>
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
