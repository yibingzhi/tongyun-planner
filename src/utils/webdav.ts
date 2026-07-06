import type { WebDavConfig } from "../types";
import { invoke } from "@tauri-apps/api/core";

const SYNC_TIMEOUT = 30000;

// 检测是否处于 Tauri 环境
const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;

function invokeWithTimeout<T>(cmd: string, args: Record<string, unknown>, ms: number = SYNC_TIMEOUT): Promise<T> {
  return Promise.race([
    invoke<T>(cmd, args),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`WebDAV 操作超时 (${ms / 1000}s)`)), ms)
    ),
  ]);
}

/**
 * Uploads a text file content (like JSON string) to a WebDav server.
 */
export async function webdavUpload(config: WebDavConfig, filename: string, content: string): Promise<void> {
  if (!config.url || !config.username) {
    throw new Error("WebDav sync parameters are incomplete.");
  }
  
  if (isTauri) {
    try {
      await invokeWithTimeout("webdav_upload", {
        url: config.url,
        username: config.username,
        password: config.password || null,
        filename,
        content,
      });
      return;
    } catch (e: any) {
      throw new Error(e.message || e);
    }
  }

  // 浏览器环境下回退到 fetch（可能会受限于 CORS）
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const targetUrl = `${baseUrl}${filename}`;
  
  // Create Basic Authentication token
  const token = btoa(`${config.username}:${config.password || ""}`);
  
  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Basic ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: content,
  });

  if (!response.ok) {
    throw new Error(`E_HTTP_${response.status}: Upload failed - ${response.statusText}`);
  }
}

/**
 * Downloads text file content from a WebDav server.
 */
export async function webdavUploadVersion(config: WebDavConfig, timestamp: number): Promise<void> {
  await webdavUpload(config, "tongyun_planner_version.txt", String(timestamp));
}

export async function webdavDownloadVersion(config: WebDavConfig): Promise<number | null> {
  try {
    const text = await webdavDownload(config, "tongyun_planner_version.txt");
    return parseInt(text.trim(), 10);
  } catch (e: any) {
    // 匹配稳定的错误码前缀，避免依赖后端文案
    const msg: string = e?.message || "";
    if (msg.startsWith("E_NOT_FOUND") || msg.startsWith("E_HTTP_404") || msg.includes("404") || msg.toLowerCase().includes("not found")) {
      return null;
    }
    throw e;
  }
}

export async function webdavDownload(config: WebDavConfig, filename: string): Promise<string> {
  if (!config.url || !config.username) {
    throw new Error("WebDav sync parameters are incomplete.");
  }
  
  if (isTauri) {
    try {
      const res = await invokeWithTimeout<string>("webdav_download", {
        url: config.url,
        username: config.username,
        password: config.password || null,
        filename,
      });
      return res;
    } catch (e: any) {
      throw new Error(e.message || e);
    }
  }

  // 浏览器环境下回退到 fetch（可能会受限于 CORS）
  const baseUrl = config.url.endsWith("/") ? config.url : `${config.url}/`;
  const targetUrl = `${baseUrl}${filename}`;
  
  const token = btoa(`${config.username}:${config.password || ""}`);
  
  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "Authorization": `Basic ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("E_NOT_FOUND: Backup file not found on server.");
    }
    throw new Error(`E_HTTP_${response.status}: ${response.statusText}`);
  }

  return await response.text();
}
