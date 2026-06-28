use tauri::{AppHandle, Emitter, Manager};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use serde::{Serialize, Deserialize};

// 1. 定义多窗口间传递的同步状态数据结构
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TodoSyncPayload {
    pub task_id: String,
    pub action: String,      // 例如: "complete" (完成), "snooze" (延后), "update" (修改)
    pub title: String,
    pub description: Option<String>,
    pub notes: Option<String>,
    pub category: Option<String>,
    pub due_date: Option<String>,
    pub timestamp: u64,
}

// 2. Tauri Command: 供前端手动调用，用于跨窗口广播状态
#[tauri::command]
fn sync_todo_state(app: AppHandle, payload: TodoSyncPayload) -> Result<(), String> {
    app.emit("todo-sync-event", payload)
        .map_err(|e| e.to_string())
}

// 3. 核心业务逻辑：切换悬浮挂件的显隐状态
fn toggle_widget(app: &AppHandle) {
    if let Some(widget_window) = app.get_webview_window("widget") {
        let is_visible = widget_window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = widget_window.hide();
        } else {
            let _ = widget_window.show();
            let _ = widget_window.set_focus(); 
        }
    }
}

// 4. 新增 Command: 供前端按钮点击调用
#[tauri::command]
fn toggle_widget_window(app: AppHandle) -> Result<(), String> {
    toggle_widget(&app);
    Ok(())
}

// 5. 新增 Command: 供前端控制挂件窗口鼠标穿透
#[tauri::command]
fn set_widget_click_through(app: AppHandle, ignore: bool) -> Result<(), String> {
    if let Some(widget_window) = app.get_webview_window("widget") {
        widget_window.set_ignore_cursor_events(ignore)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// 6. WebDAV 云备份指令 (在 Rust 端运行以规避前端浏览器的 CORS 限制)
#[tauri::command]
fn webdav_upload(
    url: String,
    username: String,
    password: Option<String>,
    filename: String,
    content: String,
) -> Result<(), String> {
    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let base_url = if url.ends_with('/') { url } else { format!("{}/", url) };
    let target_url = format!("{}{}", base_url, filename);

    let mut req = client.put(&target_url)
        .header("Content-Type", "application/json; charset=utf-8")
        .body(content);

    if let Some(pass) = password {
        req = req.basic_auth(username, Some(pass));
    } else {
        req = req.basic_auth(username, None::<String>);
    }

    let res = req.send().map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Upload failed: {} {}", res.status(), res.status().canonical_reason().unwrap_or("")));
    }

    Ok(())
}

#[tauri::command]
fn webdav_download(
    url: String,
    username: String,
    password: Option<String>,
    filename: String,
) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    let base_url = if url.ends_with('/') { url } else { format!("{}/", url) };
    let target_url = format!("{}{}", base_url, filename);

    let mut req = client.get(&target_url);

    if let Some(pass) = password {
        req = req.basic_auth(username, Some(pass));
    } else {
        req = req.basic_auth(username, None::<String>);
    }

    let res = req.send().map_err(|e| e.to_string())?;

    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("Backup file not found on server.".to_string());
    }

    if !res.status().is_success() {
        return Err(format!("Download failed: {} {}", res.status(), res.status().canonical_reason().unwrap_or("")));
    }

    res.text().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 注册 Opener 插件
        .plugin(tauri_plugin_opener::init())
        // 注册 Store 持久化插件
        .plugin(tauri_plugin_store::Builder::default().build())
        // 挂载用于多窗口间状态交互及窗口显隐控制的命令
        .invoke_handler(tauri::generate_handler![
            sync_todo_state,
            toggle_widget_window,
            set_widget_click_through,
            webdav_upload,
            webdav_download
        ])
        // 6. 初始化系统托盘
        .setup(|app| {
            // 创建托盘菜单项
            let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let toggle_widget_item = MenuItem::with_id(app, "toggle_widget", "显示/隐藏挂件", true, None::<&str>)?;
            let toggle_lock_item = MenuItem::with_id(app, "toggle_lock", "锁定/解锁挂件", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出 QiYun List", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &toggle_widget_item, &toggle_lock_item, &quit_item])?;

            // 构建系统托盘图标
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("QiYun List - 四象限待办管理")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "toggle_widget" => {
                            toggle_widget(app);
                        }
                        "toggle_lock" => {
                            let _ = app.emit("todo-sync-event", TodoSyncPayload {
                                task_id: "widget_lock".to_string(),
                                action: "toggle_lock_from_tray".to_string(),
                                title: "".to_string(),
                                description: None,
                                notes: None,
                                category: None,
                                due_date: None,
                                timestamp: 0,
                            });
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // 左键单击托盘图标 → 恢复主窗口
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // 7. 拦截窗口关闭事件：主窗口点 X 时隐藏到托盘，而不是退出
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    // 阻止默认关闭行为
                    api.prevent_close();
                    // 隐藏主窗口
                    let _ = window.hide();
                    // 同时隐藏挂件
                    if let Some(widget) = window.app_handle().get_webview_window("widget") {
                        let _ = widget.hide();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用程序时发生错误");
}
