import { useEffect, useState, useRef, useCallback } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import type { Task, PomodoroLog, StickyNote, AlertSoundType, AppTab, CustomizationConfig } from "./types";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { MatrixView } from "./components/MatrixView";
import { ListView } from "./components/ListView";
import { CalendarView } from "./components/CalendarView";
import { StickyNotesView } from "./components/StickyNotesView";
import { classifyCategory, extractTasksFromNote } from "./utils/aiEngine";
import type { ExtractedTask } from "./utils/aiEngine";
import { AnalyticsView } from "./components/AnalyticsView";
import { CompletedView } from "./components/CompletedView";
import { WidgetWindow } from "./components/WidgetWindow";
import { SettingsView } from "./components/SettingsView";
import { FloatingNoteWindow } from "./components/FloatingNoteWindow";
import { audioEngine } from "./utils/audioEngine";
import type { WebDavConfig } from "./types";
import { Sparkles } from "lucide-react";
import { LanguageProvider, useTranslation } from "./i18n/LanguageContext";

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "设计待办清单配色与主题风格",
    description: "选用暖色奶茶背景、抹茶绿和蜜桃红，构建温馨清爽的日程规划风格。",
    category: "urgent-important",
    dueDate: new Date().toISOString().split("T")[0],
  },
  {
    id: "2",
    title: "体验白噪音与番茄工作法",
    description: "在侧边栏开启白噪音，配合25分钟番茄时钟，体验极致专注手感。",
    category: "urgent-important",
    dueDate: new Date().toISOString().split("T")[0],
  },
  {
    id: "3",
    title: "整理桌面与给绿植浇水",
    description: "整理房间和摆件，让生活空间与心情一起回归清爽自然。",
    category: "important-not-urgent",
    dueDate: new Date().toISOString().split("T")[0],
  },
  {
    id: "4",
    title: "购买并补给浅烘咖啡豆",
    description: "生活日常补给，准备片刻的手冲咖啡度过下午。",
    category: "urgent-not-important",
    dueDate: new Date().toISOString().split("T")[0],
  },
];

const DEFAULT_CUSTOMIZATION_CONFIG: CustomizationConfig = {
  qColors: {
    "urgent-important": "rose",
    "important-not-urgent": "mint",
    "urgent-not-important": "sky",
    "not-urgent-not-important": "yellow",
  },
  cardBackground: "white",
  pinType: "pin",
  interfaceGlass: "matte",
  watercolorStyle: "oasis",
  fontFamily: "sans",
  enableSunsetMode: true,
  sunsetStartHour: 18,
  sunsetEndHour: 6,
  sunsetWarmth: 50,
  aiApiKey: "",
  aiEndpoint: "https://api.openai.com/v1",
  aiModel: "gpt-4o",
  aiAutoCategorize: false,
  enableAutoBackup: true,
  locale: (localStorage.getItem("qiyun_locale") as "zh-CN" | "en") || "zh-CN",
};

function AppInner() {
  const { t, setLocale } = useTranslation();
  const [windowLabel, setWindowLabel] = useState<string>("main");
  const [customizationConfig, setCustomizationConfig] = useState<CustomizationConfig>(DEFAULT_CUSTOMIZATION_CONFIG);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  // WebDAV 自动备份与状态同步指示器相关状态
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(() => {
    const saved = localStorage.getItem("aero_last_backup_time");
    return saved ? parseInt(saved, 10) : null;
  });

  // 避免首屏初始化加载、数据恢复操作触发重复的自动备份上传
  const isFirstLoad = useRef(true);
  const isRestoringRef = useRef(false);

  // 列表筛选与搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // AI 智能收集箱状态
  const [aiInputText, setAiInputText] = useState("");
  const [aiInputLoading, setAiInputLoading] = useState(false);
  const [aiInputMessage, setAiInputMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [aiPreviewTasks, setAiPreviewTasks] = useState<ExtractedTask[]>([]);
  const [showAiInbox, setShowAiInbox] = useState(false);
  // 主页Tab
  const [activeTab, setActiveTab] = useState<AppTab>("matrix");
  const [pomodoroLogs, setPomodoroLogs] = useState<PomodoroLog[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  // 主窗口展开备注的任务 ID 和内容
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  // 番茄专注时钟状态
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [breakDuration, setBreakDuration] = useState<number>(5);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(25 * 60);
  const [pomodoroEndTime, setPomodoroEndTime] = useState<number | null>(null);
  const [pomodoroIsActive, setPomodoroIsActive] = useState<boolean>(false);
  const [pomodoroIsBreak, setPomodoroIsBreak] = useState<boolean>(false);
  const [pomodoroSessionCount, setPomodoroSessionCount] = useState<number>(0);
  const [alertSoundType, setAlertSoundType] = useState<AlertSoundType>("beep");
  const [pomodoroTaskId, setPomodoroTaskId] = useState<string | null>(null);
  const [pomodoroTaskTitle, setPomodoroTaskTitle] = useState<string | null>(null);

  // 离线音频白噪音状态
  const [isPlayingNoise, setIsPlayingNoise] = useState<boolean>(false);
  const [selectedNoiseType, setSelectedNoiseType] = useState<string>("brown");
  const [noiseVolume, setNoiseVolume] = useState<number>(0.35);

  // 挂件窗口锁定状态
  const [isWidgetLocked, setIsWidgetLocked] = useState(false);

  // 日历面板状态
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Store 引用
  const storeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null);

  const saveStickyNotes = useCallback((updatedNotes: StickyNote[]) => {
    setStickyNotes(updatedNotes);
    localStorage.setItem("aero_sticky_notes", JSON.stringify(updatedNotes));
  }, []);

  const saveTasks = useCallback(async (updatedTasks: Task[]) => {
    localStorage.setItem("aero_todos", JSON.stringify(updatedTasks));
    if (storeRef.current) {
      await storeRef.current.set("tasks", updatedTasks);
      await storeRef.current.save();
    }
  }, []);

  const saveCompleted = useCallback(async (updatedCompleted: Task[]) => {
    localStorage.setItem("aero_completed_todos", JSON.stringify(updatedCompleted));
    if (storeRef.current) {
      await storeRef.current.set("completedTasks", updatedCompleted);
      await storeRef.current.save();
    }
  }, []);

  // 进度百分比
  const totalCount = tasks.length + completedTasks.length;
  const progressPercentage =
    totalCount === 0 ? 0 : Math.round((completedTasks.length / totalCount) * 100);

  // 辅助同步状态到另一个窗口
  const syncState = useCallback(async (
    taskId: string,
    action: string,
    title: string = "",
    description: string = "",
    category: string = "",
    notes: string = "",
    dueDate: string = ""
  ) => {
    try {
      await invoke("sync_todo_state", {
        payload: {
          task_id: taskId,
          action,
          title,
          description,
          notes,
          category,
          due_date: dueDate || null,
          timestamp: Date.now(),
        },
      });
    } catch (e) {
      console.error("同步窗口状态失败", e);
    }
  }, []);

  const syncPomodoro = useCallback((
    active: boolean,
    timeLeft: number,
    isBreak: boolean,
    fDur: number,
    bDur: number,
    session: number,
    tId?: string | null,
    tTitle?: string | null
  ) => {
    const finalTaskId = tId !== undefined ? tId : pomodoroTaskId;
    const finalTaskTitle = tTitle !== undefined ? tTitle : pomodoroTaskTitle;
    const endTime = active ? Date.now() + timeLeft * 1000 : null;
    setPomodoroEndTime(endTime);
    const data = JSON.stringify({
      active,
      timeLeft,
      endTime,
      isBreak,
      focusDuration: fDur,
      breakDuration: bDur,
      sessionCount: session,
      taskId: finalTaskId,
      taskTitle: finalTaskTitle,
    });
    syncState("pomodoro", "pomodoro_sync", data);
  }, [pomodoroTaskId, pomodoroTaskTitle, syncState, setPomodoroEndTime]);

  const handleStartFocus = useCallback((taskId: string, taskTitle: string) => {
    setPomodoroTaskId(taskId);
    setPomodoroTaskTitle(taskTitle);
    setPomodoroIsActive(true);
    setPomodoroIsBreak(false);
    const nextTime = focusDuration * 60;
    setPomodoroTimeLeft(nextTime);
    const endTime = Date.now() + nextTime * 1000;
    setPomodoroEndTime(endTime);
    syncPomodoro(true, nextTime, false, focusDuration, breakDuration, pomodoroSessionCount, taskId, taskTitle);
  }, [focusDuration, breakDuration, pomodoroSessionCount, syncPomodoro]);

  // 白噪音物理合成引擎调用
  const startNoise = (type: string, volume: number) => {
    audioEngine.startNoise(type, volume);
  };

  const stopNoise = () => {
    audioEngine.stopNoise();
  };

  const playCompletionSound = () => {
    const soundType = localStorage.getItem("aero_alert_sound_type") || alertSoundType;
    audioEngine.playCompletionSound(soundType);
  };

  // 番茄钟计时轮询逻辑 (基于绝对结束时间戳 pomodoroEndTime 进行本地倒计时)
  useEffect(() => {
    let interval: any = null;
    if (pomodoroIsActive && pomodoroEndTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.round((pomodoroEndTime - now) / 1000));
        setPomodoroTimeLeft(diff);

        if (diff <= 0) {
          clearInterval(interval);
          if (windowLabel === "main") {
            // 仅在主窗口执行时间结束逻辑，防止多窗口重复运行
            playCompletionSound();

            if (pomodoroIsBreak) {
              setPomodoroIsBreak(false);
              setPomodoroIsActive(false);
              setPomodoroEndTime(null);
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(t.notification.focusTime, { body: t.notification.focusTimeBody });
              }
              const nextTime = focusDuration * 60;
              setPomodoroTimeLeft(nextTime);
              setTimeout(() => {
                syncPomodoro(
                  false,
                  nextTime,
                  false,
                  focusDuration,
                  breakDuration,
                  pomodoroSessionCount,
                  null,
                  null
                );
              }, 50);
            } else {
              setPomodoroIsBreak(true);
              setPomodoroIsActive(false);
              setPomodoroEndTime(null);
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(t.notification.pomodoroTime, { body: t.notification.pomodoroTimeBody });
              }
              const nextSession = pomodoroSessionCount + 1;
              setPomodoroSessionCount(nextSession);
              const nextTime = breakDuration * 60;
              setPomodoroTimeLeft(nextTime);

              const newLog = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                duration: focusDuration,
                taskId: pomodoroTaskId || undefined,
                taskTitle: pomodoroTaskTitle || undefined,
              };
              setPomodoroLogs((prevLogs) => {
                const updated = [newLog, ...prevLogs];
                localStorage.setItem("aero_pomodoro_logs", JSON.stringify(updated));
                return updated;
              });
              syncState(newLog.id, "add_pomodoro_log", JSON.stringify(newLog));

              setPomodoroTaskId(null);
              setPomodoroTaskTitle(null);

              setTimeout(() => {
                syncPomodoro(false, nextTime, true, focusDuration, breakDuration, nextSession, null, null);
              }, 50);
            }
          }
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    pomodoroIsActive,
    pomodoroEndTime,
    pomodoroIsBreak,
    focusDuration,
    breakDuration,
    pomodoroSessionCount,
    pomodoroTaskId,
    pomodoroTaskTitle,
    windowLabel,
    syncPomodoro,
    syncState
  ]);

  // 组件卸载时释放音视频资源
  useEffect(() => {
    return () => {
      audioEngine.close();
    };
  }, []);

  // 晚安模式自动检测与主题切换
  useEffect(() => {
    const checkSunsetTheme = () => {
      const enabled = customizationConfig.enableSunsetMode !== false;
      if (!enabled) {
        document.documentElement.classList.remove("theme-sunset");
        return;
      }
      
      const currentHour = new Date().getHours();
      const start = customizationConfig.sunsetStartHour ?? 18;
      const end = customizationConfig.sunsetEndHour ?? 6;
      
      let isSunset = false;
      if (start > end) {
        // Over midnight (e.g. 18:00 to 06:00)
        isSunset = currentHour >= start || currentHour < end;
      } else {
        // Same day (e.g. 08:00 to 18:00)
        isSunset = currentHour >= start && currentHour < end;
      }

      if (isSunset) {
        document.documentElement.classList.add("theme-sunset");
        document.documentElement.style.setProperty("--sunset-warmth", `${customizationConfig.sunsetWarmth ?? 50}%`);
      } else {
        document.documentElement.classList.remove("theme-sunset");
      }
    };
    
    checkSunsetTheme();
    const interval = setInterval(checkSunsetTheme, 60000);
    return () => clearInterval(interval);
  }, [customizationConfig.enableSunsetMode, customizationConfig.sunsetStartHour, customizationConfig.sunsetEndHour, customizationConfig.sunsetWarmth]);

  // WebDAV 自动备份防抖触发 Effect
  useEffect(() => {
    // 首次加载时不触发备份
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    // 若当前正在执行恢复，则跳过本次变动监测，重置恢复标记
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }

    const url = localStorage.getItem("qiyun_webdav_url");
    const username = localStorage.getItem("qiyun_webdav_user");
    const password = localStorage.getItem("qiyun_webdav_pass");

    // 如果未启用自动备份，或者 WebDAV 连接参数不全，直接返回
    if (customizationConfig.enableAutoBackup === false || !url || !username) {
      return;
    }

    setSyncStatus("syncing");

    const timer = setTimeout(async () => {
      try {
        const backupData = {
          tasks,
          completedTasks,
          stickyNotes,
          customizationConfig,
          timestamp: Date.now(),
        };
        const { webdavUpload } = await import("./utils/webdav");
        await webdavUpload(
          { url, username, password: password || "" },
          "qiyun_list_backup.json",
          JSON.stringify(backupData, null, 2)
        );
        const now = Date.now();
        setLastBackupTime(now);
        localStorage.setItem("aero_last_backup_time", now.toString());
        setSyncStatus("synced");
      } catch (e) {
        console.error("自动同步备份失败:", e);
        setSyncStatus("error");
      }
    }, 15000); // 15秒防抖延迟

    return () => clearTimeout(timer);
  }, [tasks, completedTasks, stickyNotes, customizationConfig]);

  useEffect(() => {
    const label = getCurrentWebviewWindow().label;
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
        setCustomizationConfig(parsed);
        if (parsed.locale) {
          setLocale(parsed.locale);
        }
      } catch (e) {
        console.error("Failed to parse customization config", e);
      }
    }

    const savedSound = localStorage.getItem("aero_alert_sound_type");
    if (savedSound) {
      setAlertSoundType(savedSound as AlertSoundType);
    }

    const savedFocus = localStorage.getItem("pomodoro_focus_duration");
    const savedBreak = localStorage.getItem("pomodoro_break_duration");
    if (savedFocus) {
      const f = parseInt(savedFocus, 10);
      setFocusDuration(f);
      setPomodoroTimeLeft(f * 60);
    }
    if (savedBreak) {
      setBreakDuration(parseInt(savedBreak, 10));
    }

    const initStore = async () => {
      try {
        const store = await load("qiyun_list_data.json", { defaults: {}, autoSave: false });
        storeRef.current = store;

        const localLogs = localStorage.getItem("aero_pomodoro_logs");
        if (localLogs) {
          setPomodoroLogs(JSON.parse(localLogs));
        } else {
          // 播种近30天的模拟番茄钟数据
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
          setPomodoroLogs(seededLogs);
          localStorage.setItem("aero_pomodoro_logs", JSON.stringify(seededLogs));
        }

        const localNotes = localStorage.getItem("aero_sticky_notes");
        if (localNotes) {
          setStickyNotes(JSON.parse(localNotes));
        } else {
          const defaultNotes = [
            {
              id: "note-1",
              text: "使用技巧：双窗口联动与幽灵锁定模式\n- 开启幽灵锁定时，挂件近乎透明，鼠标移上去就能显现小锁，点击即可解锁。\n- 侧边栏的白噪音是完全离线纯物理波形合成，不需要消耗网络流量。",
              color: "tea",
              rotate: -1,
            },
            {
              id: "note-2",
              text: "健康习惯：多喝水、放松眼睛、深呼吸\n- 每隔 45 分钟起来喝杯水\n- 视线离开屏幕看绿植 20 秒\n- 闭眼做 5 次深呼吸",
              color: "mint",
              rotate: 2,
            },
            {
              id: "note-3",
              text: "手账购物备忘：豆子、水壶、纸胶带\n- 冰滴咖啡豆 (浅烘焙) 1 包\n- 便携保温小水壶 1 个\n- 记录手账专用的纸胶带 1 盒",
              color: "rose",
              rotate: -2,
            },
          ];
          setStickyNotes(defaultNotes);
          localStorage.setItem("aero_sticky_notes", JSON.stringify(defaultNotes));
        }

        const storedTasks = await store.get<Task[]>("tasks");
        const storedCompleted = await store.get<Task[]>("completedTasks");

        if (storedTasks && storedTasks.length > 0) {
          setTasks(storedTasks);
        } else {
          const local = localStorage.getItem("aero_todos");
          if (local) {
            const parsed = JSON.parse(local);
            setTasks(parsed);
            await store.set("tasks", parsed);
          } else {
            setTasks(INITIAL_TASKS);
            await store.set("tasks", INITIAL_TASKS);
          }
        }

        if (storedCompleted) {
          setCompletedTasks(storedCompleted);
        } else {
          const localCompleted = localStorage.getItem("aero_completed_todos");
          if (localCompleted) {
            const parsed = JSON.parse(localCompleted);
            setCompletedTasks(parsed);
            await store.set("completedTasks", parsed);
          } else {
            setCompletedTasks([]);
            await store.set("completedTasks", []);
          }
        }

        await store.save();
      } catch (e) {
        console.warn("Store 加载失败，回退到 localStorage", e);
        const local = localStorage.getItem("aero_todos");
        setTasks(local ? JSON.parse(local) : INITIAL_TASKS);
        const localCompleted = localStorage.getItem("aero_completed_todos");
        setCompletedTasks(localCompleted ? JSON.parse(localCompleted) : []);
      }
    };
    initStore();

    // 监听跨窗口广播事件
    const unlistenPromise = listen("todo-sync-event", (event: any) => {
      const payload = event.payload;

      if (payload.action === "complete") {
        setTasks((prev) => {
          const taskToComplete = prev.find((t) => t.id === payload.task_id);
          const updated = prev.filter((t) => t.id !== payload.task_id);
          localStorage.setItem("aero_todos", JSON.stringify(updated));

          if (taskToComplete) {
            setCompletedTasks((cPrev) => {
              const cUpdated = [taskToComplete, ...cPrev.filter((t) => t.id !== payload.task_id)];
              localStorage.setItem("aero_completed_todos", JSON.stringify(cUpdated));
              return cUpdated;
            });
          }
          return updated;
        });
      } else if (payload.action === "undo_complete") {
        setCompletedTasks((cPrev) => {
          const taskToRestore = cPrev.find((t) => t.id === payload.task_id);
          const cUpdated = cPrev.filter((t) => t.id !== payload.task_id);
          localStorage.setItem("aero_completed_todos", JSON.stringify(cUpdated));

          if (taskToRestore) {
            setTasks((prev) => {
              const updated = [taskToRestore, ...prev];
              localStorage.setItem("aero_todos", JSON.stringify(updated));
              return updated;
            });
          }
          return cUpdated;
        });
      } else if (payload.action === "delete") {
        setTasks((prev) => {
          const updated = prev.filter((t) => t.id !== payload.task_id);
          localStorage.setItem("aero_todos", JSON.stringify(updated));
          return updated;
        });
        setCompletedTasks((cPrev) => {
          const cUpdated = cPrev.filter((t) => t.id !== payload.task_id);
          localStorage.setItem("aero_completed_todos", JSON.stringify(cUpdated));
          return cUpdated;
        });
      } else if (payload.action === "snooze") {
        setTasks((prev) => {
          let updated = [...prev];
          const item = updated.find((t) => t.id === payload.task_id);
          if (item) {
            updated = updated.filter((t) => t.id !== payload.task_id);
            updated.push(item);
          }
          localStorage.setItem("aero_todos", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "add") {
        const newTask: Task = {
          id: payload.task_id,
          title: payload.title,
          notes: payload.notes || undefined,
          description: payload.description || undefined,
          category: payload.category || "urgent-important",
          dueDate: payload.due_date || undefined,
        };
        setTasks((prev) => {
          const updated = [newTask, ...prev.filter((t) => t.id !== newTask.id)];
          localStorage.setItem("aero_todos", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "favorite_sync") {
        const isFav = payload.title === "true";
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === payload.task_id ? { ...t, isFavorite: isFav } : t
          );
          localStorage.setItem("aero_todos", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "pin_sync") {
        const isPin = payload.title === "true";
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === payload.task_id ? { ...t, isPinned: isPin } : t
          );
          localStorage.setItem("aero_todos", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "update") {
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === payload.task_id
              ? {
                  ...t,
                  title: payload.title || t.title,
                  description: payload.description || undefined,
                  category: (payload.category as Task["category"]) || t.category,
                  notes: payload.notes || undefined,
                  dueDate: payload.due_date || undefined,
                }
              : t
          );
          localStorage.setItem("aero_todos", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "reset") {
        setTasks(INITIAL_TASKS);
        setCompletedTasks([]);
        localStorage.setItem("aero_todos", JSON.stringify(INITIAL_TASKS));
        localStorage.setItem("aero_completed_todos", JSON.stringify([]));
      } else if (payload.action === "clear_completed") {
        setCompletedTasks([]);
        localStorage.setItem("aero_completed_todos", JSON.stringify([]));
      } else if (payload.action === "lock_widget") {
        setIsWidgetLocked(true);
      } else if (payload.action === "unlock_widget") {
        setIsWidgetLocked(false);
      } else if (payload.action === "toggle_lock_from_tray") {
        if (label === "main") {
          handleToggleWidgetLock();
        }
      } else if (payload.action === "pomodoro_sync") {
        try {
          const data = JSON.parse(payload.title);
          setPomodoroIsActive(data.active);
          setPomodoroTimeLeft(data.timeLeft);
          setPomodoroIsBreak(data.isBreak);
          setFocusDuration(data.focusDuration);
          setBreakDuration(data.breakDuration);
          setPomodoroSessionCount(data.sessionCount);
          setPomodoroTaskId(data.taskId || null);
          setPomodoroTaskTitle(data.taskTitle || null);
          setPomodoroEndTime(data.endTime);
        } catch (e) {
          console.error("解析番茄钟同步数据失败", e);
        }
      } else if (payload.action === "add_pomodoro_log") {
        try {
          const log = JSON.parse(payload.title);
          setPomodoroLogs((prev) => {
            const updated = [log, ...prev.filter((l) => l.id !== log.id)];
            localStorage.setItem("aero_pomodoro_logs", JSON.stringify(updated));
            return updated;
          });
        } catch (e) {
          console.error("解析同步新增番茄钟日志失败", e);
        }
      } else if (payload.action === "add_note") {
        try {
          const note = JSON.parse(payload.title);
          setStickyNotes((prev) => {
            const updated = [note, ...prev.filter((n) => n.id !== note.id)];
            localStorage.setItem("aero_sticky_notes", JSON.stringify(updated));
            return updated;
          });
        } catch (e) {
          console.error("解析同步新增便签失败", e);
        }
      } else if (payload.action === "edit_note_text") {
        setStickyNotes((prev) => {
          const updated = prev.map((n) =>
            n.id === payload.task_id ? { ...n, text: payload.title } : n
          );
          localStorage.setItem("aero_sticky_notes", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "change_note_color") {
        setStickyNotes((prev) => {
          const updated = prev.map((n) =>
            n.id === payload.task_id ? { ...n, color: payload.title } : n
          );
          localStorage.setItem("aero_sticky_notes", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "delete_note") {
        setStickyNotes((prev) => {
          const updated = prev.filter((n) => n.id !== payload.task_id);
          localStorage.setItem("aero_sticky_notes", JSON.stringify(updated));
          return updated;
        });
      } else if (payload.action === "settings_sync") {
        try {
          const config = JSON.parse(payload.title);
          setCustomizationConfig(config);
          localStorage.setItem("aero_customization_config", JSON.stringify(config));
        } catch (e) {
          console.error("解析个性化设置同步数据失败", e);
        }
      } else if (payload.action === "restore_sync") {
        try {
          const restored = JSON.parse(payload.title);
          setTasks(restored.tasks || []);
          setCompletedTasks(restored.completedTasks || []);
          setStickyNotes(restored.stickyNotes || []);
          setCustomizationConfig(restored.customizationConfig || DEFAULT_CUSTOMIZATION_CONFIG);
          
          localStorage.setItem("aero_todos", JSON.stringify(restored.tasks || []));
          localStorage.setItem("aero_completed_todos", JSON.stringify(restored.completedTasks || []));
          localStorage.setItem("aero_sticky_notes", JSON.stringify(restored.stickyNotes || []));
          localStorage.setItem("aero_customization_config", JSON.stringify(restored.customizationConfig || DEFAULT_CUSTOMIZATION_CONFIG));
        } catch (e) {
          console.error("解析备份同步恢复失败", e);
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleComplete = useCallback((id: string) => {
    setTasks((prev) => {
      const completedItem = prev.find((t) => t.id === id);
      const updated = prev.filter((t) => t.id !== id);
      saveTasks(updated);

      if (completedItem) {
        setCompletedTasks((cPrev) => {
          const cUpdated = [completedItem, ...cPrev.filter((t) => t.id !== id)];
          saveCompleted(cUpdated);
          return cUpdated;
        });
      }
      return updated;
    });
    syncState(id, "complete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleUndoComplete = useCallback((id: string) => {
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
    syncState(id, "undo_complete");
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

  const handleDeleteTask = useCallback((id: string) => {
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
    syncState(id, "delete");
  }, [saveTasks, saveCompleted, syncState]);

  const handleSnooze = useCallback((id: string) => {
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
    syncState(id, "snooze");
  }, [saveTasks, syncState]);

  const handleAddTask = useCallback(async (taskData: {
    title: string;
    description: string;
    notes: string;
    category: Task["category"];
    dueDate: string;
    isExplicit?: boolean;
  }) => {
    const { title, description, notes, category, dueDate } = taskData;
    const taskId = Date.now().toString();
    const initialCategory = category;

    const newTask: Task = {
      id: taskId,
      title,
      description: description || undefined,
      notes: notes || undefined,
      category: initialCategory,
      dueDate: dueDate || undefined,
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
      newTask.dueDate
    );

    if (customizationConfig.aiAutoCategorize && customizationConfig.aiApiKey && !taskData.isExplicit) {
      const aiCategory = await classifyCategory(customizationConfig, title, description);
      if (aiCategory && aiCategory !== initialCategory) {
        setTasks((prev) => {
          const updated = prev.map((t) => (t.id === taskId ? { ...t, category: aiCategory } : t));
          saveTasks(updated);
          return updated;
        });
        syncState(
          taskId,
          "add",
          newTask.title,
          newTask.description || "",
          aiCategory,
          newTask.notes || "",
          newTask.dueDate
        );
      }
    }
  }, [saveTasks, customizationConfig, classifyCategory, syncState]);

  const handleAddNote = useCallback(() => {
    const newNote = {
      id: Date.now().toString(),
      text: "",
      color: "tea",
      rotate:
        Math.random() > 0.5
          ? Math.floor(Math.random() * 3) + 1
          : -(Math.floor(Math.random() * 3) + 1),
    };
    setStickyNotes((prev) => {
      const updated = [newNote, ...prev];
      saveStickyNotes(updated);
      return updated;
    });
    syncState(newNote.id, "add_note", JSON.stringify(newNote));
  }, [saveStickyNotes, syncState]);

  const handleEditNoteText = useCallback((id: string, text: string) => {
    setStickyNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, text } : n));
      localStorage.setItem("aero_sticky_notes", JSON.stringify(updated));
      return updated;
    });
    syncState(id, "edit_note_text", text);
  }, [syncState]);

  const handleChangeNoteColor = useCallback((id: string, color: string) => {
    setStickyNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, color } : n));
      saveStickyNotes(updated);
      return updated;
    });
    syncState(id, "change_note_color", color);
  }, [saveStickyNotes, syncState]);

  const handleDeleteNote = useCallback((id: string) => {
    setStickyNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveStickyNotes(updated);
      return updated;
    });
    syncState(id, "delete_note");
  }, [saveStickyNotes, syncState]);

  const handleToggleWidget = useCallback(async () => {
    try {
      await invoke("toggle_widget_window");
    } catch (e) {
      console.error("切换挂件状态失败", e);
    }
  }, []);

  const handleToggleWidgetLock = useCallback(async (forceState?: boolean) => {
    setIsWidgetLocked((prev) => {
      const nextState = forceState !== undefined ? forceState : !prev;
      getCurrentWebviewWindow().setAlwaysOnTop(nextState).catch((e) => {
        console.error("设置窗口置顶失败", e);
      });
      syncState("widget_lock", nextState ? "lock_widget" : "unlock_widget");
      return nextState;
    });
  }, [syncState]);

  const resetTasks = useCallback(() => {
    setTasks(INITIAL_TASKS);
    setCompletedTasks([]);
    saveTasks(INITIAL_TASKS);
    saveCompleted([]);
    syncState("reset", "reset");

    localStorage.removeItem("aero_pomodoro_logs");
    localStorage.removeItem("aero_sticky_notes");
    setPomodoroLogs([]);
    const defaultNotes = [
      {
        id: "note-1",
        text: "使用技巧：双窗口联动与幽灵锁定模式\n- 开启幽灵锁定时，挂件近乎透明，鼠标移上去就能显现小锁，点击即可解锁。\n- 侧边栏的白噪音是完全离线纯物理波形合成，不需要消耗网络流量。",
        color: "tea",
        rotate: -1,
      },
      {
        id: "note-2",
        text: "健康习惯：多喝水、放松眼睛、深呼吸\n- 每隔 45 分钟起来喝杯水\n- 视线离开屏幕看绿植 20 秒\n- 闭眼做 5 次深呼吸",
        color: "mint",
        rotate: 2,
      },
      {
        id: "note-3",
        text: "手账购物备忘：豆子、水壶、纸胶带\n- 冰滴咖啡豆 (浅烘焙) 1 包\n- 便携保温小水壶 1 个\n- 记录手账专用的纸胶带 1 盒",
        color: "rose",
        rotate: -2,
      },
    ];
    setStickyNotes(defaultNotes);
    localStorage.setItem("aero_sticky_notes", JSON.stringify(defaultNotes));
  }, [saveTasks, saveCompleted, syncState]);

  const handleClearCompleted = useCallback(() => {
    setCompletedTasks([]);
    saveCompleted([]);
    syncState("clear_completed", "clear_completed");
  }, [saveCompleted, syncState]);

  const handleConfigChange = useCallback((newConfig: CustomizationConfig) => {
    setCustomizationConfig(newConfig);
    localStorage.setItem("aero_customization_config", JSON.stringify(newConfig));
    if (newConfig.locale) {
      setLocale(newConfig.locale);
    }
    syncState("settings", "settings_sync", JSON.stringify(newConfig));
  }, [syncState, setLocale]);

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
          nextTask.dueDate
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

  // Auto-dismiss AI messages after 5 seconds
  useEffect(() => {
    if (aiInputMessage) {
      const timer = setTimeout(() => setAiInputMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [aiInputMessage]);

  const handleAiBatchInput = useCallback(async () => {
    if (!aiInputText.trim()) {
      setAiInputMessage({ type: "error", text: "⚠️ 请先在输入框中写入您的日程规划内容！" });
      return;
    }
    if (!customizationConfig.aiApiKey) {
      setAiInputMessage({ type: "error", text: "API_KEY_MISSING" });
      return;
    }
    setAiInputLoading(true);
    setAiInputMessage(null);
    try {
      const tasksList = await extractTasksFromNote(customizationConfig, aiInputText);
      if (tasksList && tasksList.length > 0) {
        setAiPreviewTasks(tasksList);
        setAiInputMessage(null);
      } else {
        setAiInputMessage({
          type: "error",
          text: "⚠️ AI 没能在您的输入中分析出明确的待办日程，请尝试更具体的描述 ☕",
        });
      }
    } catch (e: any) {
      if (e.message === "API_KEY_MISSING") {
        setAiInputMessage({ type: "error", text: "API_KEY_MISSING" });
      } else {
        setAiInputMessage({ type: "error", text: `❌ AI 解析失败: ${e.message || e}` });
      }
    } finally {
      setAiInputLoading(false);
    }
  }, [aiInputText, customizationConfig]);

  const handleConfirmAiTasks = useCallback(() => {
    if (aiPreviewTasks.length === 0) return;
    setTasks((prev) => {
      let updated = [...prev];
      aiPreviewTasks.forEach((t, index) => {
        const taskId = (Date.now() + index + Math.floor(Math.random() * 1000)).toString();
        const newTask: Task = {
          id: taskId,
          title: t.title,
          description: t.description || undefined,
          notes: t.notes || undefined,
          category: t.category,
          dueDate: t.dueDate || undefined,
        };
        updated = [newTask, ...updated];

        setTimeout(() => {
          syncState(
            newTask.id,
            "add",
            newTask.title,
            newTask.description || "",
            newTask.category,
            newTask.notes || "",
            newTask.dueDate
          );
        }, 0);
      });
      saveTasks(updated);
      return updated;
    });

    const count = aiPreviewTasks.length;
    setAiPreviewTasks([]);
    setAiInputText("");
    setAiInputMessage({
      type: "success",
      text: `🎉 AI 成功规划并录入 ${count} 项日程待办！`,
    });
  }, [aiPreviewTasks, saveTasks, syncState]);

  useEffect(() => {
    if (!aiInputMessage) return;
    const timer = setTimeout(() => setAiInputMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [aiInputMessage]);

  const handleBackupToCloud = useCallback(async (config: WebDavConfig) => {
    const backupData = {
      tasks,
      completedTasks,
      stickyNotes,
      customizationConfig,
      timestamp: Date.now(),
    };
    const { webdavUpload } = await import("./utils/webdav");
    await webdavUpload(config, "qiyun_list_backup.json", JSON.stringify(backupData, null, 2));
  }, [tasks, completedTasks, stickyNotes, customizationConfig]);

  const handleRestoreFromCloud = useCallback(async (config: WebDavConfig) => {
    const { webdavDownload } = await import("./utils/webdav");
    const jsonStr = await webdavDownload(config, "qiyun_list_backup.json");
    const data = JSON.parse(jsonStr);
    
    if (data && (Array.isArray(data.tasks) || Array.isArray(data.stickyNotes))) {
      isRestoringRef.current = true;
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        saveTasks(data.tasks);
      }
      if (Array.isArray(data.completedTasks)) {
        setCompletedTasks(data.completedTasks);
        saveCompleted(data.completedTasks);
      }
      if (Array.isArray(data.stickyNotes)) {
        setStickyNotes(data.stickyNotes);
        saveStickyNotes(data.stickyNotes);
      }
      if (data.customizationConfig) {
        setCustomizationConfig(data.customizationConfig);
        localStorage.setItem("aero_customization_config", JSON.stringify(data.customizationConfig));
        syncState("settings", "settings_sync", JSON.stringify(data.customizationConfig));
      }
      
      const fullBackup = {
        tasks: data.tasks || [],
        completedTasks: data.completedTasks || [],
        stickyNotes: data.stickyNotes || [],
        customizationConfig: data.customizationConfig || DEFAULT_CUSTOMIZATION_CONFIG,
      };
      syncState("restore", "restore_sync", JSON.stringify(fullBackup));
    } else {
      throw new Error("备份数据格式不正确");
    }
  }, [saveTasks, saveCompleted, saveStickyNotes, syncState]);

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
    const style = customizationConfig.watercolorStyle || "oasis";
    if (style === "none") return null;

    let blob1 = "bg-[#FCF2F0]/65"; // Rose
    let blob2 = "bg-[#F0F5F1]/65"; // Mint
    let blob3 = "bg-[#FAF5ED]/65"; // Yellow

    if (style === "aurora") {
      blob1 = "bg-[#F3F2F7]/65"; // Lavender
      blob2 = "bg-[#EBF3F6]/65"; // Sky
      blob3 = "bg-[#FAF5ED]/65"; // Yellow
    } else if (style === "sunny") {
      blob1 = "bg-[#FBECE5]/65"; // Coral
      blob2 = "bg-[#FAF5ED]/65"; // Yellow
      blob3 = "bg-[#FCF2F0]/65"; // Rose
    }

    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute top-[-10%] left-[-15%] w-[55vw] h-[55vw] rounded-full ${blob1} blur-[100px] animate-float-slow`} />
        <div className={`absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full ${blob2} blur-[100px] animate-float-reverse`} />
        <div className={`absolute top-[25%] right-[10%] w-[40vw] h-[40vw] rounded-full ${blob3} blur-[90px] animate-float-slow`} />
      </div>
    );
  };

  // ==========================================
  // 渲染独立悬浮便签窗口 (Floating Note Window)
  // ==========================================
  if (windowLabel.startsWith("note-")) {
    const noteId = windowLabel.substring(5);
    return <FloatingNoteWindow noteId={noteId} />;
  }

  if (windowLabel === "widget") {
    return (
      <WidgetWindow
        tasks={tasks}
        completedTasks={completedTasks}
        stickyNotes={stickyNotes}
        progressPercentage={progressPercentage}
        isWidgetLocked={isWidgetLocked}
        handleToggleWidgetLock={handleToggleWidgetLock}
        handleComplete={handleComplete}
        handleSnooze={handleSnooze}
        handleAddNote={handleAddNote}
        handleDeleteNote={handleDeleteNote}
        handleEditNoteText={handleEditNoteText}
        handleChangeNoteColor={handleChangeNoteColor}
        pomodoroIsActive={pomodoroIsActive}
        setPomodoroIsActive={setPomodoroIsActive}
        pomodoroTimeLeft={pomodoroTimeLeft}
        setPomodoroTimeLeft={setPomodoroTimeLeft}
        pomodoroIsBreak={pomodoroIsBreak}
        pomodoroSessionCount={pomodoroSessionCount}
        focusDuration={focusDuration}
        setFocusDuration={setFocusDuration}
        breakDuration={breakDuration}
        setBreakDuration={setBreakDuration}
        syncPomodoro={syncPomodoro}
        setTasks={setTasks}
        saveTasks={saveTasks}
        syncState={syncState}
        customizationConfig={customizationConfig}
        pomodoroTaskId={pomodoroTaskId}
        pomodoroTaskTitle={pomodoroTaskTitle}
        setPomodoroTaskId={setPomodoroTaskId}
        setPomodoroTaskTitle={setPomodoroTaskTitle}
        handleStartFocus={handleStartFocus}
        handleToggleFavorite={handleToggleFavorite}
      />
    );
  }

  // ==========================================
  // 渲染主管理界面 (Main Window)
  // ==========================================
  return (
    <div className={`w-full h-full min-h-screen bg-[#FAF8F5] text-[#2D323A] flex flex-col select-none overflow-hidden relative theme-glass-${customizationConfig.interfaceGlass || "matte"} theme-font-${customizationConfig.fontFamily || "sans"}`}>
      {/* 自定义标题栏 */}
      <TitleBar />

      <div className="flex flex-grow min-h-0 relative">
        {/* 水彩背景球 */}
        {getWatercolorBlobs()}

        {/* 侧边导航栏 */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          progressPercentage={progressPercentage}
          completedTasksCount={completedTasks.length}
          tasksCount={tasks.length}
          stickyNotesCount={stickyNotes.length}
          pomodoroIsActive={pomodoroIsActive}
          setPomodoroIsActive={setPomodoroIsActive}
          pomodoroIsBreak={pomodoroIsBreak}
          pomodoroSessionCount={pomodoroSessionCount}
          pomodoroTimeLeft={pomodoroTimeLeft}
          setPomodoroTimeLeft={setPomodoroTimeLeft}
          focusDuration={focusDuration}
          setFocusDuration={setFocusDuration}
          breakDuration={breakDuration}
          setBreakDuration={setBreakDuration}
          alertSoundType={alertSoundType}
          setAlertSoundType={setAlertSoundType}
          syncPomodoro={syncPomodoro}
          isPlayingNoise={isPlayingNoise}
          setIsPlayingNoise={setIsPlayingNoise}
          selectedNoiseType={selectedNoiseType}
          setSelectedNoiseType={setSelectedNoiseType}
          noiseVolume={noiseVolume}
          setNoiseVolume={setNoiseVolume}
          startNoise={startNoise}
          stopNoise={stopNoise}
          handleToggleWidget={handleToggleWidget}
          handleToggleWidgetLock={handleToggleWidgetLock}
          isWidgetLocked={isWidgetLocked}
          resetTasks={resetTasks}
          pomodoroTaskId={pomodoroTaskId}
          pomodoroTaskTitle={pomodoroTaskTitle}
          setPomodoroTaskId={setPomodoroTaskId}
          setPomodoroTaskTitle={setPomodoroTaskTitle}
          syncStatus={syncStatus}
          lastBackupTime={lastBackupTime}
        />

        {/* 主工作区 */}
        <main className="flex-grow p-6 overflow-y-auto flex flex-col gap-5 z-10 relative custom-scrollbar min-h-0">
          <header className="flex justify-between items-center border-b border-[#EFEBE4] pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-[#2D323A]">
                {activeTab === "matrix"
                  ? t.header.matrix
                  : activeTab === "list"
                  ? t.header.list
                  : activeTab === "calendar"
                  ? t.header.calendar
                  : activeTab === "notes"
                  ? t.header.notes
                  : activeTab === "analytics"
                  ? t.header.analytics
                  : activeTab === "settings"
                  ? t.header.settings
                  : t.header.completed}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {activeTab === "settings"
                  ? "自定义主题色调、材质滤镜与系统字体，个性化配置您的待办看板。"
                  : "规划今日待办，有条不紊地记录生活的每个瞬间。"}
              </p>
            </div>

            {/* AI Assistant Toggle Switch - only shown on Matrix or List views to minimize cognitive load! */}
            {(activeTab === "matrix" || activeTab === "list") && (
              <button
                onClick={() => setShowAiInbox(!showAiInbox)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs select-none ${
                  showAiInbox
                    ? "bg-[#FCF2F0] text-[#A34E36] border-[#F5DFDB]"
                    : "bg-white text-slate-500 border-[#EFEBE4] hover:bg-[#FAF8F5]"
                }`}
                title={showAiInbox ? t.quickAdd.closeAi : t.quickAdd.aiInbox}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showAiInbox ? t.quickAdd.closeAi : t.quickAdd.aiInbox}</span>
              </button>
            )}
          </header>

          {/* 今日数据统计摘要 */}
          <div className="flex flex-wrap items-center gap-4 bg-white/70 border border-[#EFEBE4] px-5 py-3 rounded-2xl shadow-sm z-10 relative backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>
                📅{" "}
                {new Date().toLocaleDateString(
                  customizationConfig.locale === "en" ? "en-US" : "zh-CN",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </span>
              <span className="text-[#EFEBE4]">|</span>
                <span>{t.sidebar.progress}</span>
            </div>
            <div className="flex items-center gap-4 ml-auto text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B2C8DF]" />
                <span className="text-slate-500">
                  {t.common.taskCount.replace("{count}", String(tasks.length))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C4D7B2]" />
                <span className="text-slate-500">
                  {t.common.completed.replace("{count}", String(completedTasks.length))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8A0BF]" />
                <span className="text-slate-500">
                  {t.common.progress.replace("{pct}", String(progressPercentage))}
                </span>
              </div>
            </div>
          </div>

          {/* AI 智能灵感收集箱 (AI Inbox) */}
          {showAiInbox && (activeTab === "matrix" || activeTab === "list") && (
            <div className="bg-white/60 border border-[#EFEBE4] p-4 rounded-2xl shadow-sm z-10 relative backdrop-blur-md flex flex-col gap-2.5 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8B6E3C] tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8B6E3C]" />
                  <span>{t.quickAdd.aiInboxTitle}</span>
                </span>
              </div>

              {/* 醒目的全宽提示横幅 */}
              {aiInputMessage && (
                <div className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-fade-in-up ${
                  aiInputMessage.type === "success"
                    ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]"
                    : "bg-[#FFF3E0] text-[#E65100] border border-[#FFE0B2]"
                }`}>
                  <span>
                    {aiInputMessage.text === "API_KEY_MISSING"
                      ? t.quickAdd.apiKeyMissing
                      : aiInputMessage.text}
                  </span>
                  {aiInputMessage.text === "API_KEY_MISSING" && (
                    <button
                      onClick={() => { setActiveTab("settings"); setShowAiInbox(false); setAiInputMessage(null); }}
                      className="flex-shrink-0 px-3 py-1 rounded-lg bg-[#E65100] text-white text-[10px] font-bold hover:bg-[#BF360C] transition-colors cursor-pointer"
                    >
                      {t.quickAdd.goToSettings}
                    </button>
                  )}
                </div>
              )}

              {aiPreviewTasks.length > 0 ? (
                /* AI 提取结果预检与调整面板 */
                <div className="flex flex-col gap-3 animate-fade-in-up">
                  <div className="text-[10px] font-bold text-slate-500 mb-1 border-b border-[#EFEBE4] pb-1.5">
                    {t.quickAdd.aiPreview}
                  </div>
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {aiPreviewTasks.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#FAF8F5]/85 border border-[#EFEBE4] rounded-xl flex flex-col gap-2 shadow-2xs">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const updated = [...aiPreviewTasks];
                              updated[idx].title = e.target.value;
                              setAiPreviewTasks(updated);
                            }}
                            className="flex-grow bg-white border border-[#EFEBE4] px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D]"
                            placeholder={t.quickAdd.taskTitle}
                          />
                          <input
                            type="date"
                            value={item.dueDate}
                            onChange={(e) => {
                              const updated = [...aiPreviewTasks];
                              updated[idx].dueDate = e.target.value;
                              setAiPreviewTasks(updated);
                            }}
                            className="bg-white border border-[#EFEBE4] px-2 py-1 rounded-lg text-[10px] text-slate-700 font-bold focus:outline-none focus:border-[#4D7C5D] w-28 flex-shrink-0"
                          />
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const updated = [...aiPreviewTasks];
                              updated[idx].category = e.target.value as Task["category"];
                              setAiPreviewTasks(updated);
                            }}
                            className="bg-white border border-[#EFEBE4] px-2 py-1 rounded-lg text-[10px] text-slate-700 font-semibold focus:outline-none focus:border-[#4D7C5D] w-32 flex-shrink-0"
                          >
                            <option value="urgent-important">I. {t.matrix.urgentImportant}</option>
                            <option value="important-not-urgent">II. {t.matrix.importantNotUrgent}</option>
                            <option value="urgent-not-important">III. {t.matrix.urgentNotImportant}</option>
                            <option value="not-urgent-not-important">IV. {t.matrix.notUrgentNotImportant}</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">任务说明/详情描述</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const updated = [...aiPreviewTasks];
                                updated[idx].description = e.target.value;
                                setAiPreviewTasks(updated);
                              }}
                              className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1 rounded-lg text-[10px] text-slate-600 focus:outline-none focus:border-[#4D7C5D]"
                              placeholder={t.quickAdd.noDescription}
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">{t.quickAdd.techNotes}</label>
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => {
                                const updated = [...aiPreviewTasks];
                                updated[idx].notes = e.target.value;
                                setAiPreviewTasks(updated);
                              }}
                              className="w-full bg-white border border-[#EFEBE4] px-2.5 py-1 rounded-lg text-[10px] text-slate-600 focus:outline-none focus:border-[#4D7C5D]"
                              placeholder={t.quickAdd.noNotes}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end pt-1.5 border-t border-[#EFEBE4]">
                    <button
                      onClick={() => setAiPreviewTasks([])}
                      className="text-[10px] text-slate-500 hover:text-slate-700 px-3.5 py-1.5 rounded-lg border border-[#EFEBE4] transition-colors cursor-pointer"
                    >
                      {t.quickAdd.discard}
                    </button>
                    <button
                      onClick={handleConfirmAiTasks}
                      className="text-[10px] text-white bg-[#4D7C5D] hover:bg-[#3F684C] px-4.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      {t.quickAdd.confirmImport}
                    </button>
                  </div>
                </div>
              ) : (
                /* AI 原始记事输入框 */
                <div className="flex gap-3">
                  <textarea
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAiBatchInput();
                      }
                    }}
                    onFocus={() => aiInputMessage && setAiInputMessage(null)}
                    placeholder={t.quickAdd.aiPlaceholder}
                    className="flex-grow bg-[#FAF8F5]/80 border border-[#EFEBE4] px-3.5 py-2 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4D7C5D] transition-colors resize-none h-14 custom-scrollbar font-semibold"
                    disabled={aiInputLoading}
                  />
                  <button
                    onClick={handleAiBatchInput}
                    disabled={aiInputLoading}
                    className={`px-4.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_4px_rgba(77,124,93,0.1)] select-none ${
                      aiInputLoading
                        ? "bg-slate-300 border-slate-300 cursor-not-allowed"
                        : "bg-[#4D7C5D] hover:bg-[#3F684C] border-[#4D7C5D] cursor-pointer hover:scale-102"
                    }`}
                  >
                    {aiInputLoading ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.quickAdd.aiProcessing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.quickAdd.aiAnalyze}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 各 Tab 内容渲染 */}
          {activeTab === "matrix" && (
            <MatrixView 
              tasks={tasks} 
              handleComplete={handleComplete} 
              qColors={customizationConfig.qColors} 
              handleStartFocus={handleStartFocus}
              handleAddTask={handleAddTask}
              handleToggleFavorite={handleToggleFavorite}
              handleTogglePin={handleTogglePin}
            />
          )}

          {activeTab === "list" && (
            <ListView
              tasks={tasks}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              handleComplete={handleComplete}
              handleDeleteTask={handleDeleteTask}
              expandedNoteId={expandedNoteId}
              setExpandedNoteId={setExpandedNoteId}
              editingNotes={editingNotes}
              setEditingNotes={setEditingNotes}
              handleSaveNotes={handleSaveNotes}
              handleStartFocus={handleStartFocus}
              handleAddTask={handleAddTask}
              handleToggleFavorite={handleToggleFavorite}
              handleTogglePin={handleTogglePin}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              tasks={tasks}
              handleComplete={handleComplete}
              calendarYear={calendarYear}
              setCalendarYear={setCalendarYear}
              calendarMonth={calendarMonth}
              setCalendarMonth={setCalendarMonth}
              selectedCalendarDate={selectedCalendarDate}
              setSelectedCalendarDate={setSelectedCalendarDate}
              handleAddTask={handleAddTask}
            />
          )}

          {activeTab === "notes" && (
            <StickyNotesView
              stickyNotes={stickyNotes}
              handleAddNote={handleAddNote}
              handleEditNoteText={handleEditNoteText}
              handleChangeNoteColor={handleChangeNoteColor}
              handleDeleteNote={handleDeleteNote}
              pinType={customizationConfig.pinType}
              onPinNoteToDesktop={handlePinNoteToDesktop}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              pomodoroLogs={pomodoroLogs}
              tasks={tasks}
              completedTasks={completedTasks}
            />
          )}

          {activeTab === "completed" && (
            <CompletedView
              completedTasks={completedTasks}
              handleClearCompleted={handleClearCompleted}
              handleUndoComplete={handleUndoComplete}
              handleDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === "settings" && (
            <SettingsView
              config={customizationConfig}
              onChange={handleConfigChange}
              onBackupToCloud={handleBackupToCloud}
              onRestoreFromCloud={handleRestoreFromCloud}
              alertSoundType={alertSoundType}
              setAlertSoundType={setAlertSoundType}
              resetTasks={resetTasks}
            />
          )}
        </main>
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
