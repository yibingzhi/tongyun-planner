import type { SyncProvider, SyncData } from "./types";
import type { WebDavConfig } from "../../types";
import { invoke } from "@tauri-apps/api/core";

const SYNC_TIMEOUT = 30000;
const isTauri = () => typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

function invokeWithTimeout<T>(cmd: string, args: Record<string, unknown>, ms = SYNC_TIMEOUT): Promise<T> {
  return Promise.race([
    invoke<T>(cmd, args),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`WebDAV timeout (${ms / 1000}s)`)), ms)
    ),
  ]);
}

async function uploadFile(config: WebDavConfig, filename: string, content: string): Promise<void> {
  if (!config.url || !config.username) throw new Error("WebDAV config incomplete");

  if (isTauri()) {
    await invokeWithTimeout("webdav_upload", {
      url: config.url, username: config.username,
      password: config.password || null, filename, content,
    });
    return;
  }

  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const token = btoa(`${config.username}:${config.password || ""}`);
  const res = await fetch(`${baseUrl}${filename}`, {
    method: "PUT",
    headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
    body: content,
  });
  if (!res.ok) throw new Error(`E_HTTP_${res.status}`);
}

async function downloadFile(config: WebDavConfig, filename: string): Promise<string> {
  if (!config.url || !config.username) throw new Error("WebDAV config incomplete");

  if (isTauri()) {
    return await invokeWithTimeout<string>("webdav_download", {
      url: config.url, username: config.username,
      password: config.password || null, filename,
    });
  }

  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const token = btoa(`${config.username}:${config.password || ""}`);
  const res = await fetch(`${baseUrl}${filename}`, {
    method: "GET",
    headers: { Authorization: `Basic ${token}` },
  });
  if (res.status === 404) throw new Error("E_NOT_FOUND");
  if (!res.ok) throw new Error(`E_HTTP_${res.status}`);
  return await res.text();
}

export class WebDAVProvider implements SyncProvider {
  readonly type = "webdav" as const;
  readonly displayName = "坚果云 WebDAV";
  private config: WebDavConfig | null = null;

  constructor(config?: WebDavConfig) {
    this.config = config || null;
  }

  setConfig(config: WebDavConfig): void {
    this.config = config;
    localStorage.setItem("qiyun_webdav_url", config.url);
    localStorage.setItem("qiyun_webdav_user", config.username);
    if (config.password) localStorage.setItem("qiyun_webdav_pass", config.password);
  }

  loadFromStorage(): void {
    const url = localStorage.getItem("qiyun_webdav_url");
    const username = localStorage.getItem("qiyun_webdav_user");
    const password = localStorage.getItem("qiyun_webdav_pass");
    if (url && username) {
      this.config = { url, username, password: password || undefined };
    }
  }

  isConfigured(): boolean {
    return !!(this.config?.url && this.config?.username);
  }

  async test(): Promise<boolean> {
    if (!this.config) return false;
    try {
      await uploadFile(this.config, "qiyun_list_test.txt", "ok");
      return true;
    } catch { return false; }
  }

  async push(data: SyncData): Promise<void> {
    if (!this.config) throw new Error("WebDAV not configured");
    const json = JSON.stringify(data);
    await uploadFile(this.config, "qiyun_list_backup.json", json);
    await uploadFile(this.config, "qiyun_list_version.txt", String(data.version));
  }

  async pull(): Promise<SyncData | null> {
    if (!this.config) throw new Error("WebDAV not configured");
    try {
      const json = await downloadFile(this.config, "qiyun_list_backup.json");
      return JSON.parse(json) as SyncData;
    } catch (e: any) {
      if (e?.message?.startsWith("E_NOT_FOUND")) return null;
      throw e;
    }
  }

  async getRemoteVersion(): Promise<number | null> {
    if (!this.config) return null;
    try {
      const text = await downloadFile(this.config, "qiyun_list_version.txt");
      return parseInt(text.trim(), 10);
    } catch { return null; }
  }
}
